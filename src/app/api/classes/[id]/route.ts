import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classes, classStudents, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/classes/[id] - Get class with students
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const classData = await db.select()
            .from(classes)
            .where(eq(classes.id, params.id))
            .limit(1);

        if (classData.length === 0) {
            return NextResponse.json(
                { error: "Class not found" },
                { status: 404 }
            );
        }

        // Get students in this class
        const students = await db.select({
            id: users.id,
            name: users.name,
            username: users.username,
            enrolledAt: classStudents.enrolledAt,
        })
            .from(classStudents)
            .innerJoin(users, eq(classStudents.studentId, users.id))
            .where(eq(classStudents.classId, params.id));

        return NextResponse.json({
            ...classData[0],
            students,
        });
    } catch (error) {
        console.error("Error fetching class:", error);
        return NextResponse.json(
            { error: "Failed to fetch class" },
            { status: 500 }
        );
    }
}

// PUT /api/classes/[id] - Update class
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { name, grade, academicYear, teacherId } = body;

        await db.update(classes)
            .set({ name, grade, academicYear, teacherId })
            .where(eq(classes.id, params.id));

        const updated = await db.select().from(classes).where(eq(classes.id, params.id)).limit(1);

        if (updated.length === 0) {
            return NextResponse.json(
                { error: "Class not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error("Error updating class:", error);
        return NextResponse.json(
            { error: "Failed to update class" },
            { status: 500 }
        );
    }
}

// DELETE /api/classes/[id] - Delete class
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const deleted = await db.select().from(classes).where(eq(classes.id, params.id)).limit(1);

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Class not found" },
                { status: 404 }
            );
        }

        await db.delete(classes).where(eq(classes.id, params.id));

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Class not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: "Class deleted successfully" });
    } catch (error) {
        console.error("Error deleting class:", error);
        return NextResponse.json(
            { error: "Failed to delete class" },
            { status: 500 }
        );
    }
}
