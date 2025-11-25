import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examTemplates, bankQuestions } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";

// GET /api/exam-templates/[id] - Get exam template details
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const template = await db.select()
            .from(examTemplates)
            .where(eq(examTemplates.id, params.id))
            .limit(1);

        if (template.length === 0) {
            return NextResponse.json(
                { error: "Exam template not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(template[0]);
    } catch (error) {
        console.error("Error fetching exam template:", error);
        return NextResponse.json(
            { error: "Failed to fetch exam template" },
            { status: 500 }
        );
    }
}

// PUT /api/exam-templates/[id] - Update exam template
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        const updated = await db.update(examTemplates)
            .set({
                ...body,
                updatedAt: new Date(),
            })
            .where(eq(examTemplates.id, params.id))
            .returning();

        if (updated.length === 0) {
            return NextResponse.json(
                { error: "Exam template not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error("Error updating exam template:", error);
        return NextResponse.json(
            { error: "Failed to update exam template" },
            { status: 500 }
        );
    }
}

// DELETE /api/exam-templates/[id] - Delete exam template
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const deleted = await db.delete(examTemplates)
            .where(eq(examTemplates.id, params.id))
            .returning();

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Exam template not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: "Exam template deleted successfully" });
    } catch (error) {
        console.error("Error deleting exam template:", error);
        return NextResponse.json(
            { error: "Failed to delete exam template" },
            { status: 500 }
        );
    }
}
