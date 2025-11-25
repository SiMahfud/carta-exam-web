import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subjects } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/subjects - List all subjects
export async function GET() {
    try {
        const allSubjects = await db.select().from(subjects).orderBy(subjects.name);
        return NextResponse.json(allSubjects);
    } catch (error) {
        console.error("Error fetching subjects:", error);
        return NextResponse.json(
            { error: "Failed to fetch subjects" },
            { status: 500 }
        );
    }
}

// POST /api/subjects - Create new subject
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, code, description } = body;

        if (!name || !code) {
            return NextResponse.json(
                { error: "Name and code are required" },
                { status: 400 }
            );
        }

        const newSubject = await db.insert(subjects).values({
            name,
            code: code.toUpperCase(),
            description,
        }).returning();

        return NextResponse.json(newSubject[0], { status: 201 });
    } catch (error: unknown) {
        console.error("Error creating subject:", error);
        // Check for unique constraint violation
        if (error instanceof Error && error.message.includes("UNIQUE")) {
            return NextResponse.json(
                { error: "Subject code already exists" },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { error: "Failed to create subject" },
            { status: 500 }
        );
    }
}
