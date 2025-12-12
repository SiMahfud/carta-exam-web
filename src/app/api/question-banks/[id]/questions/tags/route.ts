import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankQuestions } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/question-banks/[id]/questions/tags - Get all unique tags
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Get all questions from this bank
        const questions = await db.select({ tags: bankQuestions.tags })
            .from(bankQuestions)
            .where(eq(bankQuestions.bankId, params.id));

        // Extract unique tags
        const uniqueTags = new Set<string>();
        questions.forEach((q: typeof questions[0]) => {
            const tags = (q.tags as string[]) || [];
            tags.forEach((tag: string) => uniqueTags.add(tag));
        });

        return NextResponse.json({
            tags: Array.from(uniqueTags).sort(),
        });
    } catch (error) {
        console.error("Error fetching tags:", error);
        return NextResponse.json(
            { error: "Failed to fetch tags" },
            { status: 500 }
        );
    }
}
