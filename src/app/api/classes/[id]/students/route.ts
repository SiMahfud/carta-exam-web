import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classStudents, users } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

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

        // Check if student already enrolled
        const existing = await db.select()
            .from(classStudents)
            .where(and(
                eq(classStudents.classId, params.id),
                eq(classStudents.studentId, studentId)
            ))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json(
                { error: "Student already enrolled in this class" },
                { status: 409 }
            );
        }

        const enrollment = await db.insert(classStudents).values({
            classId: params.id,
            studentId,
        }).returning();

        return NextResponse.json(enrollment[0], { status: 201 });
    } catch (error) {
        console.error("Error adding student to class:", error);
        return NextResponse.json(
            { error: "Failed to add student to class" },
            { status: 500 }
        );
    }
}

// DELETE /api/classes/[id]/students/[studentId] endpoint is in separate file
