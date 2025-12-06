import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, classStudents, classes } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type") || "all"; // all, students, teachers, template
        const classId = searchParams.get("classId");

        // Template download - empty file with headers only
        if (type === "template") {
            const templateData = [
                {
                    action: 'add',
                    id: '',
                    nama: 'Contoh Siswa',
                    username: 'contoh.siswa',
                    password: '123456',
                    role: 'student',
                    kelas: 'X-IPA-1',
                    grade: 10,
                    tahun_ajaran: '2025/2026'
                },
                {
                    action: 'add',
                    id: '',
                    nama: 'Contoh Guru',
                    username: 'contoh.guru',
                    password: '123456',
                    role: 'teacher',
                    kelas: '',
                    grade: '',
                    tahun_ajaran: ''
                }
            ];

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(templateData);

            // Set column widths
            worksheet['!cols'] = [
                { wch: 8 },   // action
                { wch: 36 },  // id (UUID)
                { wch: 25 },  // nama
                { wch: 20 },  // username
                { wch: 15 },  // password
                { wch: 10 },  // role
                { wch: 15 },  // kelas
                { wch: 8 },   // grade
                { wch: 15 },  // tahun_ajaran
            ];

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

            // Add instructions sheet
            const instructionsData = [
                { 'Kolom': 'action', 'Keterangan': 'add = tambah baru, update = perbarui, delete = hapus' },
                { 'Kolom': 'id', 'Keterangan': 'Kosongkan untuk add, wajib diisi untuk update/delete' },
                { 'Kolom': 'nama', 'Keterangan': 'Nama lengkap pengguna' },
                { 'Kolom': 'username', 'Keterangan': 'Username unik untuk login' },
                { 'Kolom': 'password', 'Keterangan': 'Password (min 6 karakter), kosongkan jika tidak ingin mengubah' },
                { 'Kolom': 'role', 'Keterangan': 'student | teacher | admin' },
                { 'Kolom': 'kelas', 'Keterangan': 'Nama kelas (hanya untuk siswa), akan dibuat otomatis jika belum ada' },
                { 'Kolom': 'grade', 'Keterangan': 'Tingkat kelas: 10, 11, atau 12 (wajib jika kelas baru)' },
                { 'Kolom': 'tahun_ajaran', 'Keterangan': 'Format: 2025/2026 (wajib jika kelas baru)' },
            ];
            const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
            wsInstructions['!cols'] = [{ wch: 15 }, { wch: 60 }];
            XLSX.utils.book_append_sheet(workbook, wsInstructions, 'Petunjuk');

            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': 'attachment; filename="template_import_users.xlsx"'
                }
            });
        }

        // Get all users with their class information
        const allUsers = await db
            .select({
                id: users.id,
                name: users.name,
                username: users.username,
                role: users.role,
                classId: classStudents.classId,
                className: classes.name,
                classGrade: classes.grade,
                classYear: classes.academicYear,
            })
            .from(users)
            .leftJoin(classStudents, eq(users.id, classStudents.studentId))
            .leftJoin(classes, eq(classStudents.classId, classes.id))
            .orderBy(users.name);

        // Filter by type
        let filteredUsers = allUsers;
        if (type === "students") {
            filteredUsers = allUsers.filter((u: typeof allUsers[0]) => u.role === "student");
        } else if (type === "teachers") {
            filteredUsers = allUsers.filter((u: typeof allUsers[0]) => u.role === "teacher" || u.role === "admin");
        }

        // Filter by class if specified
        if (classId) {
            filteredUsers = filteredUsers.filter((u: typeof filteredUsers[0]) => u.classId === classId);
        }

        // Group by user (in case of multiple classes, take first one)
        const userMap = new Map<string, typeof filteredUsers[0]>();
        filteredUsers.forEach((u: typeof filteredUsers[0]) => {
            if (!userMap.has(u.id)) {
                userMap.set(u.id, u);
            }
        });

        // Convert to Excel format
        const excelData = Array.from(userMap.values()).map(user => ({
            action: '',
            id: user.id,
            nama: user.name,
            username: user.username,
            password: '', // Never export passwords
            role: user.role,
            kelas: user.className || '',
            grade: user.classGrade || '',
            tahun_ajaran: user.classYear || '',
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        worksheet['!cols'] = [
            { wch: 8 },   // action
            { wch: 36 },  // id
            { wch: 25 },  // nama
            { wch: 20 },  // username
            { wch: 15 },  // password
            { wch: 10 },  // role
            { wch: 15 },  // kelas
            { wch: 8 },   // grade
            { wch: 15 },  // tahun_ajaran
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

        // Add instructions sheet to exported data too
        const instructionsData = [
            { 'Kolom': 'action', 'Keterangan': 'Kosong/add = tambah baru, update = perbarui data, delete = hapus user' },
            { 'Kolom': 'id', 'Keterangan': 'ID user (JANGAN diubah). Kosongkan jika action=add' },
            { 'Kolom': 'nama', 'Keterangan': 'Nama lengkap pengguna' },
            { 'Kolom': 'username', 'Keterangan': 'Username unik untuk login (JANGAN diubah untuk update)' },
            { 'Kolom': 'password', 'Keterangan': '⚠️ KOSONG = password TIDAK diubah. Isi jika ingin ganti password (min 6 karakter)' },
            { 'Kolom': 'role', 'Keterangan': 'student | teacher | admin' },
            { 'Kolom': 'kelas', 'Keterangan': 'Nama kelas (hanya siswa), auto-create jika belum ada' },
            { 'Kolom': 'grade', 'Keterangan': 'Tingkat: 10, 11, atau 12 (wajib jika kelas baru)' },
            { 'Kolom': 'tahun_ajaran', 'Keterangan': 'Format: 2025/2026 (wajib jika kelas baru)' },
        ];
        const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
        wsInstructions['!cols'] = [{ wch: 15 }, { wch: 70 }];
        XLSX.utils.book_append_sheet(workbook, wsInstructions, 'Petunjuk');

        // Add examples sheet
        const examplesData = [
            { action: 'add', id: '', nama: 'Siswa Baru', username: 'siswa.baru', password: '123456', role: 'student', kelas: 'X-IPA-1', grade: 10, tahun_ajaran: '2025/2026', keterangan: '← Tambah siswa baru + kelas' },
            { action: 'add', id: '', nama: 'Guru Baru', username: 'guru.baru', password: 'guru123', role: 'teacher', kelas: '', grade: '', tahun_ajaran: '', keterangan: '← Tambah guru baru' },
            { action: 'update', id: 'copy-id-dari-sheet-users', nama: 'Nama Baru', username: '', password: '', role: '', kelas: 'X-IPA-2', grade: 10, tahun_ajaran: '2025/2026', keterangan: '← Update nama & pindah kelas (password tetap)' },
            { action: 'update', id: 'copy-id-dari-sheet-users', nama: '', username: '', password: 'passwordbaru', role: '', kelas: '', grade: '', tahun_ajaran: '', keterangan: '← Update password saja' },
            { action: 'delete', id: 'copy-id-dari-sheet-users', nama: '', username: '', password: '', role: '', kelas: '', grade: '', tahun_ajaran: '', keterangan: '← Hapus user' },
        ];
        const wsExamples = XLSX.utils.json_to_sheet(examplesData);
        wsExamples['!cols'] = [
            { wch: 8 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
            { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 40 }
        ];
        XLSX.utils.book_append_sheet(workbook, wsExamples, 'Contoh');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        const filename = type === "students" ? "data_siswa" :
            type === "teachers" ? "data_guru" : "data_users";

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.xlsx"`
            }
        });

    } catch (error) {
        console.error("Error exporting users:", error);
        return NextResponse.json(
            { error: "Gagal mengekspor data" },
            { status: 500 }
        );
    }
}
