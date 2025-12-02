import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankQuestions } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/question-banks/[bankId]/questions/[questionId]
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        const params = await context.params;
        const question = await db.select()
            .from(bankQuestions)
            .where(eq(bankQuestions.id, params.questionId))
            .limit(1);

        if (question.length === 0) {
            return NextResponse.json(
                { error: "Question not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(question[0]);
    } catch (error) {
        console.error("Error fetching question:", error);
        return NextResponse.json(
            { error: "Failed to fetch question" },
            { status: 500 }
        );
    }
}

// PUT /api/question-banks/[bankId]/questions/[questionId] - Update question
export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        const params = await context.params;
        const body = await request.json();
        const {
            type,
            content,
            answerKey,
            tags,
            difficulty,
            defaultPoints,
            metadata,
        } = body;

        const updated = await db.update(bankQuestions)
            .set({
                type,
                content,
                answerKey,
                tags,
                difficulty,
                defaultPoints,
                metadata,
                updatedAt: new Date(),
            })
            .where(eq(bankQuestions.id, params.questionId))
            .returning();

        if (updated.length === 0) {
            return NextResponse.json(
                { error: "Question not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error("Error updating question:", error);
        return NextResponse.json(
            { error: "Failed to update question" },
            { status: 500 }
        );
    }
}

// DELETE /api/question-banks/[bankId]/questions/[questionId]
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        const params = await context.params;
        const deleted = await db.delete(bankQuestions)
            .where(eq(bankQuestions.id, params.questionId))
            .returning();

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Question not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: "Question deleted successfully" });
    } catch (error) {
        console.error("Error deleting question:", error);
        return NextResponse.json(
            { error: "Failed to delete question" },
            { status: 500 }
        );
    }
}
