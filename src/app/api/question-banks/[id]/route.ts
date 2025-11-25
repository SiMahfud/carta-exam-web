import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { questionBanks, bankQuestions } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

// GET /api/question-banks/[id] - Get question bank with statistics
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const bank = await db.select()
            .from(questionBanks)
            .where(eq(questionBanks.id, params.id))
            .limit(1);

        if (bank.length === 0) {
            return NextResponse.json(
                { error: "Question bank not found" },
                { status: 404 }
            );
        }

        // Get question statistics
        const stats = await db.select({
            total: sql<number>`COUNT(*)`,
            mc: sql<number>`SUM(CASE WHEN ${bankQuestions.type} = 'mc' THEN 1 ELSE 0 END)`,
            complex_mc: sql<number>`SUM(CASE WHEN ${bankQuestions.type} = 'complex_mc' THEN 1 ELSE 0 END)`,
            matching: sql<number>`SUM(CASE WHEN ${bankQuestions.type} = 'matching' THEN 1 ELSE 0 END)`,
            short: sql<number>`SUM(CASE WHEN ${bankQuestions.type} = 'short' THEN 1 ELSE 0 END)`,
            essay: sql<number>`SUM(CASE WHEN ${bankQuestions.type} = 'essay' THEN 1 ELSE 0 END)`,
            easy: sql<number>`SUM(CASE WHEN ${bankQuestions.difficulty} = 'easy' THEN 1 ELSE 0 END)`,
            medium: sql<number>`SUM(CASE WHEN ${bankQuestions.difficulty} = 'medium' THEN 1 ELSE 0 END)`,
            hard: sql<number>`SUM(CASE WHEN ${bankQuestions.difficulty} = 'hard' THEN 1 ELSE 0 END)`,
        })
            .from(bankQuestions)
            .where(eq(bankQuestions.bankId, params.id));

        return NextResponse.json({
            ...bank[0],
            statistics: stats[0],
        });
    } catch (error) {
        console.error("Error fetching question bank:", error);
        return NextResponse.json(
            { error: "Failed to fetch question bank" },
            { status: 500 }
        );
    }
}

// PUT /api/question-banks/[id] - Update question bank
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { name, description } = body;

        const updated = await db.update(questionBanks)
            .set({
                name,
                description,
                updatedAt: new Date(),
            })
            .where(eq(questionBanks.id, params.id))
            .returning();

        if (updated.length === 0) {
            return NextResponse.json(
                { error: "Question bank not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error("Error updating question bank:", error);
        return NextResponse.json(
            { error: "Failed to update question bank" },
            { status: 500 }
        );
    }
}

// DELETE /api/question-banks/[id] - Delete question bank
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const deleted = await db.delete(questionBanks)
            .where(eq(questionBanks.id, params.id))
            .returning();

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Question bank not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: "Question bank deleted successfully" });
    } catch (error) {
        console.error("Error deleting question bank:", error);
        return NextResponse.json(
            { error: "Failed to delete question bank" },
            { status: 500 }
        );
    }
}
