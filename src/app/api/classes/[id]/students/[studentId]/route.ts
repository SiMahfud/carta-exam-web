import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classStudents } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
    request: Request,
    { params }: { params: { id: string; studentId: string } }
) {
    try {
        const deleted = await db.select().from(classStudents)
            .where(and(
                eq(classStudents.classId, params.id),
                eq(classStudents.studentId, params.studentId)
            ))
            .limit(1);

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Student not found in this class" },
                { status: 404 }
            );
        }

        await db.delete(classStudents)
            .where(and(
                eq(classStudents.classId, params.id),
                eq(classStudents.studentId, params.studentId)
            ));

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Student not found in this class" },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: "Student removed from class successfully" });
    } catch (error) {
        console.error("Error removing student from class:", error);
        return NextResponse.json(
            { error: "Failed to remove student from class" },
            { status: 500 }
        );
    }
}
