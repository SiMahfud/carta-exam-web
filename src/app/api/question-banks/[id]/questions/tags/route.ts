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
        questions.forEach((q: any) => {
            let tags = q.tags;

            // Handle potential string format (if DB returns string instead of parsed JSON)
            if (typeof tags === 'string') {
                try {
                    tags = JSON.parse(tags);
                } catch (e) {
                    console.warn("Failed to parse tags JSON:", tags, e);
                    tags = [];
                }
            }

            if (Array.isArray(tags)) {
                tags.forEach((tag: string) => uniqueTags.add(tag));
            }
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
