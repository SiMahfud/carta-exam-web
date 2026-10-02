import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankQuestions, questionBanks } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/question-banks/[bankId]/questions/[questionId]
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        await requireAuth(["admin", "teacher"]);
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
    } catch (error: any) {
        console.error("Error fetching question:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch question" },
            { status: error.status || 500 }
        );
    }
}

// PUT /api/question-banks/[bankId]/questions/[questionId] - Update question
export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        const user = await requireAuth(["admin", "teacher"]);
        const params = await context.params;

        const bank = await db.select().from(questionBanks).where(eq(questionBanks.id, params.id)).limit(1);
        if (bank.length === 0) {
            return NextResponse.json({ error: "Question bank not found" }, { status: 404 });
        }
        if (user.role === "teacher" && bank[0].createdBy !== user.id) {
            return NextResponse.json(
                { error: "Akses ditolak. Anda hanya dapat mengubah soal pada bank soal milik Anda sendiri." },
                { status: 403 }
            );
        }

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

        await db.update(bankQuestions)
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
            .where(eq(bankQuestions.id, params.questionId));

        const updated = await db.select().from(bankQuestions).where(eq(bankQuestions.id, params.questionId)).limit(1);

        if (updated.length === 0) {
            return NextResponse.json(
                { error: "Question not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(updated[0]);
    } catch (error: any) {
        console.error("Error updating question:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update question" },
            { status: error.status || 500 }
        );
    }
}

// DELETE /api/question-banks/[bankId]/questions/[questionId]
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        const user = await requireAuth(["admin", "teacher"]);
        const params = await context.params;

        const bank = await db.select().from(questionBanks).where(eq(questionBanks.id, params.id)).limit(1);
        if (bank.length === 0) {
            return NextResponse.json({ error: "Question bank not found" }, { status: 404 });
        }
        if (user.role === "teacher" && bank[0].createdBy !== user.id) {
            return NextResponse.json(
                { error: "Akses ditolak. Anda hanya dapat menghapus soal pada bank soal milik Anda sendiri." },
                { status: 403 }
            );
        }

        const deleted = await db.select().from(bankQuestions).where(eq(bankQuestions.id, params.questionId)).limit(1);

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Question not found" },
                { status: 404 }
            );
        }

        await db.delete(bankQuestions).where(eq(bankQuestions.id, params.questionId));

        return NextResponse.json({ message: "Question deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting question:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete question" },
            { status: error.status || 500 }
        );
    }
}
