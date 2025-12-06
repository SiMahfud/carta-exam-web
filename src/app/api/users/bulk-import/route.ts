import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, classStudents, classes } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import * as XLSX from 'xlsx';
import bcrypt from "bcryptjs";

// Types for import data
interface ImportRow {
    action: 'add' | 'update' | 'delete' | '';
    id: string;
    nama: string;
    username: string;
    password: string;
    role: 'student' | 'teacher' | 'admin';
    kelas: string;
    grade: number | string;
    tahun_ajaran: string;
}

interface ValidationError {
    row: number;
    field: string;
    message: string;
}

interface ProcessingResult {
    added: number;
    updated: number;
    deleted: number;
    skipped: number;
    classesCreated: string[];
    errors: ValidationError[];
}

// Determine action based on input
function getEffectiveAction(row: ImportRow, existingIds: Set<string>): 'add' | 'update' | 'delete' {
    const action = row.action?.toLowerCase()?.trim();

    // Explicit action
    if (action === 'delete') return 'delete';
    if (action === 'update') return 'update';
    if (action === 'add') return 'add';

    // Auto-detect: if ID exists in database, it's an update; otherwise add
    if (row.id && existingIds.has(row.id)) {
        return 'update';
    }
    return 'add';
}

// Validate a single row
function validateRow(row: ImportRow, rowIndex: number, existingUsernames: Set<string>, existingIds: Set<string>): ValidationError[] {
    const errors: ValidationError[] = [];
    const action = getEffectiveAction(row, existingIds);

    // Validate explicit action value if provided
    if (row.action && !['add', 'update', 'delete', ''].includes(row.action.toLowerCase())) {
        errors.push({ row: rowIndex, field: 'action', message: `Action tidak valid: ${row.action}` });
    }

    // For delete, only need id
    if (action === 'delete') {
        if (!row.id) {
            errors.push({ row: rowIndex, field: 'id', message: 'ID wajib diisi untuk menghapus' });
        } else if (!existingIds.has(row.id)) {
            errors.push({ row: rowIndex, field: 'id', message: 'User tidak ditemukan' });
        }
        return errors;
    }

    // For update, need valid id
    if (action === 'update') {
        if (!row.id) {
            errors.push({ row: rowIndex, field: 'id', message: 'ID wajib diisi untuk update' });
        } else if (!existingIds.has(row.id)) {
            errors.push({ row: rowIndex, field: 'id', message: 'User tidak ditemukan' });
        }
    }

    // For add, password is required
    if (action === 'add') {
        if (!row.password?.trim()) {
            errors.push({ row: rowIndex, field: 'password', message: 'Password wajib diisi untuk user baru' });
        } else if (row.password.length < 6) {
            errors.push({ row: rowIndex, field: 'password', message: 'Password minimal 6 karakter' });
        }
    }

    // Validate required fields for add
    if (action === 'add') {
        if (!row.nama?.trim()) {
            errors.push({ row: rowIndex, field: 'nama', message: 'Nama wajib diisi' });
        }
        if (!row.username?.trim()) {
            errors.push({ row: rowIndex, field: 'username', message: 'Username wajib diisi' });
        }
    }

    // Validate role
    const validRoles = ['student', 'teacher', 'admin'];
    if (row.role && !validRoles.includes(row.role.toLowerCase())) {
        errors.push({ row: rowIndex, field: 'role', message: `Role tidak valid: ${row.role}` });
    }

    // Check username uniqueness for new users
    if (action === 'add' && row.username && existingUsernames.has(row.username.toLowerCase())) {
        errors.push({ row: rowIndex, field: 'username', message: 'Username sudah digunakan' });
    }

    // Validate class info for students
    const role = (row.role?.toLowerCase() || 'student') as string;
    if (role === 'student' && row.kelas) {
        const grade = typeof row.grade === 'string' ? parseInt(row.grade) : row.grade;
        if (!grade || ![10, 11, 12].includes(grade)) {
            errors.push({ row: rowIndex, field: 'grade', message: 'Grade harus 10, 11, atau 12' });
        }
        if (!row.tahun_ajaran?.match(/^\d{4}\/\d{4}$/)) {
            errors.push({ row: rowIndex, field: 'tahun_ajaran', message: 'Format tahun ajaran harus YYYY/YYYY (contoh: 2025/2026)' });
        }
    }

    return errors;
}

// Preview the import without making changes
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const mode = formData.get('mode') as string || 'preview'; // preview | process

        if (!file) {
            return NextResponse.json(
                { error: "File tidak ditemukan" },
                { status: 400 }
            );
        }

        // Read Excel file
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json<ImportRow>(worksheet);

        if (rawData.length === 0) {
            return NextResponse.json(
                { error: "File kosong atau format tidak sesuai" },
                { status: 400 }
            );
        }

        // Get existing users for validation
        const existingUsers = await db.select({
            id: users.id,
            username: users.username,
        }).from(users);

        const existingUsernames = new Set<string>(existingUsers.map((u: typeof existingUsers[0]) => u.username.toLowerCase()));
        const existingIds = new Set<string>(existingUsers.map((u: typeof existingUsers[0]) => u.id));

        // Get existing classes
        const existingClasses = await db.select({
            id: classes.id,
            name: classes.name,
            grade: classes.grade,
            academicYear: classes.academicYear,
        }).from(classes);

        const classMap = new Map<string, string>(existingClasses.map((c: typeof existingClasses[0]) => [`${c.name}_${c.grade}_${c.academicYear}`, c.id]));

        // Validate all rows
        const allErrors: ValidationError[] = [];
        const newUsernamesInFile = new Set<string>();

        rawData.forEach((row, index) => {
            const rowErrors = validateRow(row, index + 2, existingUsernames, existingIds); // +2 because Excel is 1-indexed and has header
            const effectiveAction = getEffectiveAction(row, existingIds);

            // Also check for duplicates within the file for new users
            if (effectiveAction === 'add' && row.username) {
                const username = row.username.toLowerCase();
                if (newUsernamesInFile.has(username)) {
                    rowErrors.push({ row: index + 2, field: 'username', message: 'Username duplikat dalam file' });
                }
                newUsernamesInFile.add(username);
            }

            allErrors.push(...rowErrors);
        });

        // If preview mode, return validation results
        if (mode === 'preview') {
            const summary = {
                total: rawData.length,
                toAdd: rawData.filter(r => getEffectiveAction(r, existingIds) === 'add').length,
                toUpdate: rawData.filter(r => getEffectiveAction(r, existingIds) === 'update').length,
                toDelete: rawData.filter(r => getEffectiveAction(r, existingIds) === 'delete').length,
                errors: allErrors,
                isValid: allErrors.length === 0,
                preview: rawData.slice(0, 10).map((row, i) => ({
                    row: i + 2,
                    ...row,
                    action: getEffectiveAction(row, existingIds), // Show effective action
                    hasError: allErrors.some(e => e.row === i + 2)
                }))
            };

            return NextResponse.json({ data: summary });
        }

        // Process mode - execute the import
        if (allErrors.length > 0) {
            return NextResponse.json(
                { error: "Data memiliki error, perbaiki terlebih dahulu", errors: allErrors },
                { status: 400 }
            );
        }

        const result: ProcessingResult = {
            added: 0,
            updated: 0,
            deleted: 0,
            skipped: 0,
            classesCreated: [],
            errors: []
        };

        // Process each row
        for (const row of rawData) {
            const action = getEffectiveAction(row, existingIds);
            const role = (row.role?.toLowerCase() || 'student') as 'student' | 'teacher' | 'admin';

            try {
                if (action === 'delete') {
                    // Delete user
                    await db.delete(classStudents).where(eq(classStudents.studentId, row.id));
                    await db.delete(users).where(eq(users.id, row.id));
                    result.deleted++;
                } else if (action === 'update') {
                    // Update user
                    const updateData: Partial<{ name: string; password: string; role: typeof role }> = {};
                    if (row.nama?.trim()) updateData.name = row.nama.trim();
                    if (row.password?.trim()) updateData.password = await bcrypt.hash(row.password, 10);
                    if (row.role) updateData.role = role;

                    if (Object.keys(updateData).length > 0) {
                        await db.update(users).set(updateData).where(eq(users.id, row.id));
                    }

                    // Update class assignment for students
                    if (role === 'student' && row.kelas?.trim()) {
                        const grade = typeof row.grade === 'string' ? parseInt(row.grade) : row.grade as number;
                        const classKey = `${row.kelas}_${grade}_${row.tahun_ajaran}`;
                        let classId = classMap.get(classKey);

                        // Create class if not exists
                        if (!classId) {
                            classId = crypto.randomUUID();
                            await db.insert(classes).values({
                                id: classId,
                                name: row.kelas,
                                grade: grade,
                                academicYear: row.tahun_ajaran,
                            });
                            classMap.set(classKey, classId);
                            result.classesCreated.push(row.kelas);
                        }

                        // Remove old class assignment and add new one
                        await db.delete(classStudents).where(eq(classStudents.studentId, row.id));
                        await db.insert(classStudents).values({
                            id: crypto.randomUUID(),
                            classId: classId,
                            studentId: row.id,
                        });
                    }

                    result.updated++;
                } else {
                    // Add new user
                    const userId = crypto.randomUUID();
                    const hashedPassword = await bcrypt.hash(row.password, 10);

                    await db.insert(users).values({
                        id: userId,
                        name: row.nama.trim(),
                        username: row.username.trim(),
                        password: hashedPassword,
                        role: role,
                    });

                    // Assign to class if student with class info
                    if (role === 'student' && row.kelas?.trim()) {
                        const grade = typeof row.grade === 'string' ? parseInt(row.grade) : row.grade as number;
                        const classKey = `${row.kelas}_${grade}_${row.tahun_ajaran}`;
                        let classId = classMap.get(classKey);

                        if (!classId) {
                            classId = crypto.randomUUID();
                            await db.insert(classes).values({
                                id: classId,
                                name: row.kelas,
                                grade: grade,
                                academicYear: row.tahun_ajaran,
                            });
                            classMap.set(classKey, classId);
                            result.classesCreated.push(row.kelas);
                        }

                        await db.insert(classStudents).values({
                            id: crypto.randomUUID(),
                            classId: classId,
                            studentId: userId,
                        });
                    }

                    result.added++;
                }
            } catch (error: any) {
                result.errors.push({
                    row: rawData.indexOf(row) + 2,
                    field: 'general',
                    message: error.message || 'Gagal memproses baris'
                });
            }
        }

        return NextResponse.json({ data: result });

    } catch (error) {
        console.error("Error importing users:", error);
        return NextResponse.json(
            { error: "Gagal mengimpor data" },
            { status: 500 }
        );
    }
}
