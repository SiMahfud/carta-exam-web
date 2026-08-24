import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, classes, classStudents, subjects } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: NextRequest) {
    try {
        const apiKey = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("api_key");
        const validKey = process.env.PORTOCARTA_API_KEY || "pc_cartaexam_secret_key_2026_smancarta";

        if (!apiKey || apiKey !== validKey) {
            return NextResponse.json(
                { success: false, message: "Unauthorized: API Key integrasi tidak valid." },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            active_academic_year,
            classrooms = [],
            students = [],
            teachers = [],
            subjects: rawSubjects = []
        } = body;

        const academicYearStr = active_academic_year?.name || "2026/2027";
        let syncedSubjects = 0;
        let syncedTeachers = 0;
        let syncedClasses = 0;
        let syncedStudents = 0;

        // 1. SINKRONISASI MATA PELAJARAN (SUBJECTS)
        for (const s of rawSubjects) {
            const subjectCode = (s.kode || `SUB-${s.id}`).trim().toUpperCase();
            const subjectName = (s.nama || subjectCode).trim();

            const [existing] = await (db as any)
                .select()
                .from(subjects)
                .where(eq(subjects.code, subjectCode))
                .limit(1);

            if (existing) {
                await (db as any)
                    .update(subjects)
                    .set({ name: subjectName, description: s.kelompok || existing.description })
                    .where(eq(subjects.id, existing.id));
            } else {
                await (db as any).insert(subjects).values({
                    id: crypto.randomUUID(),
                    code: subjectCode,
                    name: subjectName,
                    description: s.kelompok || null
                });
            }
            syncedSubjects++;
        }

        // 2. SINKRONISASI GURU & STAF (TEACHERS & ADMINS)
        const teacherMap = new Map<number | string, string>(); // PC ID/NIP -> CartaExam User UUID

        for (const t of teachers) {
            const username = String(t.nip || t.nik || `PTK-${t.id}`).trim();
            const name = String(t.nama).trim();
            const role = (t.role?.code === "admin" || t.role?.code === "superadmin") ? "admin" : "teacher";

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
                const defaultHash = await bcrypt.hash(username, 10);
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

        // 3. SINKRONISASI KELAS / ROMBEL (CLASSES)
        const classMap = new Map<string, string>(); // Class Name -> CartaExam Class UUID

        for (const c of classrooms) {
            const className = String(c.name).trim();
            const gradeNum = parseInt(c.tingkat) || 10;
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

        // 4. SINKRONISASI SISWA (STUDENTS) & ENROLLMENT KE KELAS
        for (const s of students) {
            const username = String(s.nisn || `SISWA-${s.id}`).trim();
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
                const defaultHash = await bcrypt.hash(username, 10);
                studentUuid = crypto.randomUUID();
                await (db as any).insert(users).values({
                    id: studentUuid,
                    name,
                    username,
                    password: defaultHash,
                    role
                });
            }

            // Hubungkan siswa ke kelasnya jika ada
            const className = s.classroom?.name;
            if (className && classMap.has(className)) {
                const classId = classMap.get(className)!;

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

            syncedStudents++;
        }

        return NextResponse.json({
            success: true,
            message: `Sinkronisasi berhasil! ${syncedStudents} siswa, ${syncedClasses} kelas, ${syncedTeachers} guru, dan ${syncedSubjects} mapel telah diselaraskan.`,
            data: {
                academic_year: academicYearStr,
                synced_students: syncedStudents,
                synced_classes: syncedClasses,
                synced_teachers: syncedTeachers,
                synced_subjects: syncedSubjects
            }
        });
    } catch (error: any) {
        console.error("Sync Receive Error in CartaExam:", error);
        return NextResponse.json(
            { success: false, message: "Gagal memproses sinkronisasi: " + error.message },
            { status: 500 }
        );
    }
}
