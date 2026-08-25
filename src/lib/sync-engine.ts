import { db } from "@/lib/db";
import { users, classes, classStudents, subjects } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface SyncBundlePayload {
    active_academic_year?: {
        id?: number | string;
        name?: string;
        is_active?: boolean;
    };
    classrooms?: Array<{
        id: number | string;
        name: string;
        tingkat?: string | number;
        jurusan?: string;
        wali_kelas?: {
            id?: number | string;
            nama?: string;
            nip?: string;
        };
    }>;
    students?: Array<{
        id: number | string;
        nisn?: string;
        nik?: string;
        nama: string;
        jenis_kelamin?: string;
        classroom?: {
            id?: number | string;
            name?: string;
            tingkat?: string | number;
            jurusan?: string;
        };
    }>;
    teachers?: Array<{
        id: number | string;
        nip?: string;
        nik?: string;
        nama: string;
        jenis_ptk?: string;
        status_pegawai?: string;
        role?: {
            code?: string;
            name?: string;
        };
    }>;
    subjects?: Array<{
        id: number | string;
        kode?: string;
        nama?: string;
        kelompok?: string;
    }>;
}

export interface SyncResult {
    success: boolean;
    message: string;
    data: {
        academic_year: string;
        synced_students: number;
        synced_classes: number;
        synced_teachers: number;
        synced_subjects: number;
    };
}

/**
 * Core engine untuk menyelaraskan data master dari PortoCarta ke database lokal CartaExam.
 * Digunakan oleh Push Sync (webhook dari PortoCarta) dan Pull Sync (ditarik manual oleh admin).
 */
export async function syncMasterDataBundle(bundle: SyncBundlePayload): Promise<SyncResult> {
    const {
        active_academic_year,
        classrooms = [],
        students = [],
        teachers = [],
        subjects: rawSubjects = []
    } = bundle;

    const academicYearStr = active_academic_year?.name?.trim() || "2026/2027";
    let syncedSubjects = 0;
    let syncedTeachers = 0;
    let syncedClasses = 0;
    let syncedStudents = 0;

    // =========================================================================
    // 1. SINKRONISASI MATA PELAJARAN (SUBJECTS)
    // =========================================================================
    for (const s of rawSubjects) {
        const subjectCode = (s.kode || `SUB-${s.id}`).trim().toUpperCase();
        const subjectName = (s.nama || subjectCode).trim();
        const description = s.kelompok?.trim() || null;

        const [existing] = await (db as any)
            .select()
            .from(subjects)
            .where(eq(subjects.code, subjectCode))
            .limit(1);

        if (existing) {
            await (db as any)
                .update(subjects)
                .set({
                    name: subjectName,
                    description: description || existing.description
                })
                .where(eq(subjects.id, existing.id));
        } else {
            await (db as any).insert(subjects).values({
                id: crypto.randomUUID(),
                code: subjectCode,
                name: subjectName,
                description: description
            });
        }
        syncedSubjects++;
    }

    // =========================================================================
    // 2. SINKRONISASI GURU & STAF (TEACHERS & ADMINS)
    // =========================================================================
    const teacherMap = new Map<number | string, string>(); // PC ID/NIP -> CartaExam User UUID

    for (const t of teachers) {
        const username = String(t.nip || t.nik || `PTK-${t.id}`).trim();
        const name = String(t.nama).trim();
        const rawRole = (t.role?.code || "").toLowerCase();
        const role = (rawRole === "admin" || rawRole === "superadmin") ? "admin" : "teacher";

        let [existing] = await (db as any)
            .select()
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

        if (existing) {
            await (db as any)
                .update(users)
                .set({ name, role })
                .where(eq(users.id, existing.id));
            teacherMap.set(t.id, existing.id);
            teacherMap.set(username, existing.id);
        } else {
            const randomSecretPassword = crypto.randomBytes(32).toString("hex");
            const defaultHash = await bcrypt.hash(randomSecretPassword, 10);
            const newId = crypto.randomUUID();
            await (db as any).insert(users).values({
                id: newId,
                name,
                username,
                password: defaultHash,
                role
            });
            teacherMap.set(t.id, newId);
            teacherMap.set(username, newId);
        }
        syncedTeachers++;
    }

    // =========================================================================
    // 3. SINKRONISASI KELAS / ROMBEL (CLASSES)
    // =========================================================================
    const classMap = new Map<string, string>(); // Class Name -> CartaExam Class UUID

    for (const c of classrooms) {
        const className = String(c.name).trim();
        let gradeNum = parseInt(String(c.tingkat)) || 10;
        if (gradeNum < 10 || gradeNum > 12) {
            if (className.startsWith("XI-") || className.startsWith("XI ")) gradeNum = 11;
            else if (className.startsWith("XII-") || className.startsWith("XII ")) gradeNum = 12;
            else gradeNum = 10;
        }

        const waliKelasUuid = c.wali_kelas?.id ? teacherMap.get(c.wali_kelas.id) : null;

        let [existingClass] = await (db as any)
            .select()
            .from(classes)
            .where(and(eq(classes.name, className), eq(classes.academicYear, academicYearStr)))
            .limit(1);

        if (existingClass) {
            await (db as any)
                .update(classes)
                .set({
                    grade: gradeNum,
                    teacherId: waliKelasUuid || existingClass.teacherId
                })
                .where(eq(classes.id, existingClass.id));
            classMap.set(className, existingClass.id);
        } else {
            const newClassId = crypto.randomUUID();
            await (db as any).insert(classes).values({
                id: newClassId,
                name: className,
                grade: gradeNum,
                academicYear: academicYearStr,
                teacherId: waliKelasUuid || null
            });
            classMap.set(className, newClassId);
        }
        syncedClasses++;
    }

    // =========================================================================
    // 4. SINKRONISASI SISWA (STUDENTS) & ENROLLMENT KE KELAS
    // =========================================================================
    for (const s of students) {
        const username = String(s.nisn || s.nik || `SISWA-${s.id}`).trim();
        const name = String(s.nama).trim();
        const role = "student";

        let studentUuid: string;

        let [existingStudent] = await (db as any)
            .select()
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

        if (existingStudent) {
            await (db as any)
                .update(users)
                .set({ name, role })
                .where(eq(users.id, existingStudent.id));
            studentUuid = existingStudent.id;
        } else {
            const randomSecretPassword = crypto.randomBytes(32).toString("hex");
            const defaultHash = await bcrypt.hash(randomSecretPassword, 10);
            studentUuid = crypto.randomUUID();
            await (db as any).insert(users).values({
                id: studentUuid,
                name,
                username,
                password: defaultHash,
                role
            });
        }

        // Hubungkan siswa ke kelasnya jika data rombel tersedia
        const className = s.classroom?.name?.trim();
        if (className) {
            let classId = classMap.get(className);

            // Jika kelas belum ada di map (misal siswa terdaftar di kelas baru)
            if (!classId) {
                const [foundClass] = await (db as any)
                    .select()
                    .from(classes)
                    .where(and(eq(classes.name, className), eq(classes.academicYear, academicYearStr)))
                    .limit(1);

                if (foundClass?.id) {
                    classId = String(foundClass.id);
                    classMap.set(className, classId);
                }
            }

            if (classId) {
                // Cek apakah sudah terdaftar di kelas ini
                const [existingEnrollment] = await (db as any)
                    .select()
                    .from(classStudents)
                    .where(and(eq(classStudents.classId, classId), eq(classStudents.studentId, studentUuid)))
                    .limit(1);

                if (!existingEnrollment) {
                    await (db as any).insert(classStudents).values({
                        id: crypto.randomUUID(),
                        classId,
                        studentId: studentUuid
                    });
                }
            }
        }

        syncedStudents++;
    }

    return {
        success: true,
        message: `Sinkronisasi berhasil! ${syncedStudents} siswa, ${syncedClasses} kelas, ${syncedTeachers} guru, dan ${syncedSubjects} mapel telah diselaraskan.`,
        data: {
            academic_year: academicYearStr,
            synced_students: syncedStudents,
            synced_classes: syncedClasses,
            synced_teachers: syncedTeachers,
            synced_subjects: syncedSubjects
        }
    };
}
