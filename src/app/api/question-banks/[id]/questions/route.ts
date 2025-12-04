import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankQuestions } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/question-banks/[id]/questions - List questions with filters
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");
        const difficulty = searchParams.get("difficulty");
        const tags = searchParams.get("tags")?.split(",").filter(Boolean);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        let conditions = [eq(bankQuestions.bankId, params.id)];

        if (type) {
            conditions.push(eq(bankQuestions.type, type as any));
        }

        if (difficulty) {
            conditions.push(eq(bankQuestions.difficulty, difficulty as any));
        }

        let query = db.select()
            .from(bankQuestions)
            .where(and(...conditions))
            .limit(limit)
            .offset(offset)
            .orderBy(bankQuestions.createdAt);

        const questions = await query;

        // Filter by tags if provided (client-side for simplicity with JSON field)
        let filteredQuestions = questions;
        if (tags && tags.length > 0) {
            filteredQuestions = questions.filter(q => {
                const questionTags = (q.tags as string[]) || [];
                return tags.some(tag => questionTags.includes(tag));
            });
        }

        // Get total count
        const totalQuery = await db.select({
            count: sql<number>`COUNT(*)`,
        })
            .from(bankQuestions)
            .where(and(...conditions));

        return NextResponse.json({
            questions: filteredQuestions,
            pagination: {
                page,
                limit,
                total: Number(totalQuery[0].count),
                totalPages: Math.ceil(Number(totalQuery[0].count) / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching questions:", error);
        return NextResponse.json(
            { error: "Failed to fetch questions" },
            { status: 500 }
        );
    }
}

// POST /api/question-banks/[id]/questions - Add new question
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const {
            type,
            content,
            answerKey,
            tags = [],
            difficulty = "medium",
            defaultPoints = 1,
            metadata = {},
            createdBy,
        } = body;

        if (!type || !content || !answerKey) {
            return NextResponse.json(
                { error: "Type, content, and answer key are required" },
                { status: 400 }
            );
        }

        const id = crypto.randomUUID();
        const newQuestionValues = {
            id,
            bankId: params.id,
            type,
            content,
            answerKey,
            tags,
            difficulty,
            defaultPoints,
            metadata,
            createdBy: createdBy || null, // Optional - set to null if not provided
        };

        await db.insert(bankQuestions).values(newQuestionValues);

        return NextResponse.json(newQuestionValues, { status: 201 });
    } catch (error) {
        console.error("Error creating question:", error);
        return NextResponse.json(
            { error: "Failed to create question" },
            { status: 500 }
        );
    }
}
