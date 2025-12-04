import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classStudents, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

// POST /api/classes/[id]/students - Add student to class
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { studentId } = body;

        if (!studentId) {
            return NextResponse.json(
                { error: "Student ID is required" },
                { status: 400 }
            );
        }

        // Check if student is already enrolled in ANY class (single-class rule)
        const existingEnrollment = await db.select()
            .from(classStudents)
            .where(eq(classStudents.studentId, studentId))
            .limit(1);

        if (existingEnrollment.length > 0) {
            return NextResponse.json(
                { error: "Siswa sudah terdaftar di kelas lain. Satu siswa hanya dapat terdaftar di satu kelas." },
                { status: 409 }
            );
        }

        const id = crypto.randomUUID();
        const enrollmentValues = {
            id,
            classId: params.id,
            studentId,
        };

        await db.insert(classStudents).values(enrollmentValues);

        return NextResponse.json(enrollmentValues, { status: 201 });
    } catch (error) {
        console.error("Error adding student to class:", error);
        return NextResponse.json(
            { error: "Failed to add student to class" },
            { status: 500 }
        );
    }
}

// DELETE /api/classes/[id]/students/[studentId] endpoint is in separate file
