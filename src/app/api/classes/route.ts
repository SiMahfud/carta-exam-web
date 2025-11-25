import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classes, users, classStudents } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

// GET /api/classes - List all classes
export async function GET() {
    try {
        const allClasses = await db.select({
            id: classes.id,
            name: classes.name,
            grade: classes.grade,
            academicYear: classes.academicYear,
            teacherId: classes.teacherId,
            teacherName: users.name,
            createdAt: classes.createdAt,
        })
            .from(classes)
            .leftJoin(users, eq(classes.teacherId, users.id))
            .orderBy(classes.grade, classes.name);

        return NextResponse.json(allClasses);
    } catch (error) {
        console.error("Error fetching classes:", error);
        return NextResponse.json(
            { error: "Failed to fetch classes" },
            { status: 500 }
        );
    }
}

// POST /api/classes - Create new class
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, grade, academicYear, teacherId } = body;

        if (!name || !grade || !academicYear) {
            return NextResponse.json(
                { error: "Name, grade, and academic year are required" },
                { status: 400 }
            );
        }

        const newClass = await db.insert(classes).values({
            name,
            grade,
            academicYear,
            teacherId,
        }).returning();

        return NextResponse.json(newClass[0], { status: 201 });
    } catch (error) {
        console.error("Error creating class:", error);
        return NextResponse.json(
            { error: "Failed to create class" },
            { status: 500 }
        );
    }
}
