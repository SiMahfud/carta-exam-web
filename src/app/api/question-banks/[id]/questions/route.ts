import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankQuestions } from "../../../../../lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { processContentImages } from "@/lib/image-processor";
import { BankQuestionSchema } from "@/lib/validations/questions";
import { z } from "zod";
import fs from 'fs';
import path from 'path';

// Helper to delete images associated with a question
const deleteQuestionImages = (content: any) => {
    try {
        const findAndDelete = (html: string) => {
            if (!html) return;
            // Match /uploads/questions/...
            const regex = /src=["'](\/uploads\/questions\/[^"']+)["']/g;
            let match;
            while ((match = regex.exec(html)) !== null) {
                const relativePath = match[1];
                const fullPath = path.join(process.cwd(), 'public', relativePath);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                        console.log(`Deleted image: ${fullPath}`);
                    } catch (e) {
                        console.error(`Failed to delete image: ${fullPath}`, e);
                    }
                }
            }
        };

        if (content.question) findAndDelete(content.question);

        if (content.options && Array.isArray(content.options)) {
            content.options.forEach((opt: any) => {
                if (typeof opt === 'string') findAndDelete(opt);
                else if (typeof opt === 'object' && opt.text) findAndDelete(opt.text);
            });
        }
    } catch (error) {
        console.error("Error in deleteQuestionImages:", error);
    }
};

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

        const conditions = [eq(bankQuestions.bankId, params.id)];

        if (type) {
            conditions.push(eq(bankQuestions.type, type as any));
        }

        if (difficulty) {
            conditions.push(eq(bankQuestions.difficulty, difficulty as any));
        }

        const query = db.select()
            .from(bankQuestions)
            .where(and(...conditions))
            .limit(limit)
            .offset(offset)
            .orderBy(bankQuestions.questionNumber);

        const questions = await query;

        // Parse JSON fields if they are returned as strings (handling potential DB driver inconsistencies)
        const parsedQuestions = questions.map((q: { tags: any; content: any; answerKey: any;[key: string]: any }) => {
            let tags = q.tags;
            try {
                if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { } }
                if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { } }
                if (!Array.isArray(tags)) tags = [];
            } catch { tags = []; }

            let content = q.content;
            try {
                if (typeof content === 'string') { try { content = JSON.parse(content); } catch { } }
                if (typeof content === 'string') { try { content = JSON.parse(content); } catch { } }
                if (!content || typeof content !== 'object') content = {};
            } catch { content = {}; }

            let answerKey = q.answerKey;
            try {
                if (typeof answerKey === 'string') { try { answerKey = JSON.parse(answerKey); } catch { } }
                if (typeof answerKey === 'string') { try { answerKey = JSON.parse(answerKey); } catch { } }
                if (!answerKey || typeof answerKey !== 'object') answerKey = {};
            } catch { answerKey = {}; }

            return { ...q, tags, content, answerKey };
        });

        // Filter by tags if provided
        let filteredQuestions = parsedQuestions;
        if (tags && tags.length > 0) {
            filteredQuestions = parsedQuestions.filter((q: any) => {
                return tags.some(tag => q.tags.includes(tag));
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

// POST /api/question-banks/[id]/questions - Add new question(s)
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get("mode");
        const body = await request.json();

        // Handle Replace Mode
        if (mode === 'replace') {
            // 1. Fetch existing questions to find images to delete
            const existingQuestions = await db.select()
                .from(bankQuestions)
                .where(eq(bankQuestions.bankId, params.id));

            // 2. Delete images for each question
            for (const q of existingQuestions) {
                if (q.content) {
                    deleteQuestionImages(q.content);
                }
            }

            // 3. Delete questions from DB
            await db.delete(bankQuestions).where(eq(bankQuestions.bankId, params.id));
        }

        // Handle bulk creation
        if (Array.isArray(body)) {
            const results = {
                created: 0,
                errors: [] as any[]
            };

            // Initialize monotonic clock to ensure correct ordering (backup for questionNumber)
            let lastCreatedAt = Date.now();

            // Calculate starting question number
            let currentQuestionNumber = 0;
            if (mode !== 'replace') {
                const maxResult = await db.select({ max: sql<number>`MAX(${bankQuestions.questionNumber})` })
                    .from(bankQuestions)
                    .where(eq(bankQuestions.bankId, params.id));
                if (maxResult[0].max) {
                    currentQuestionNumber = Number(maxResult[0].max);
                }
            }

            for (let i = 0; i < body.length; i++) {
                const item = body[i];
                try {
                    // 1. Validate
                    const validatedData = BankQuestionSchema.parse(item);

                    // 2. Process Images in Content
                    if (validatedData.content.question) {
                        validatedData.content.question = await processContentImages(validatedData.content.question);
                    }

                    if (validatedData.content.options && Array.isArray(validatedData.content.options)) {
                        const opts = validatedData.content.options;
                        for (let j = 0; j < opts.length; j++) {
                            if (typeof opts[j] === 'string') {
                                opts[j] = await processContentImages(opts[j] as string);
                            } else if (typeof opts[j] === 'object' && (opts[j] as any).text) {
                                (opts[j] as any).text = await processContentImages((opts[j] as any).text);
                            }
                        }
                    }

                    // 3. Create Question
                    // Ensure strictly increasing timestamp for valid sorting
                    const now = Date.now();
                    // If the loop runs too fast, force at least 10ms increment
                    const createdAtTime = now <= lastCreatedAt ? lastCreatedAt + 10 : now;
                    lastCreatedAt = createdAtTime;

                    await db.insert(bankQuestions).values({
                        id: crypto.randomUUID(),
                        bankId: params.id,
                        type: validatedData.type,
                        content: validatedData.content,
                        answerKey: validatedData.answerKey,
                        tags: validatedData.tags || [],
                        difficulty: validatedData.difficulty,
                        defaultPoints: validatedData.defaultPoints,
                        questionNumber: ++currentQuestionNumber,
                        createdAt: new Date(createdAtTime),
                        updatedAt: new Date(createdAtTime),
                    });

                    results.created++;
                } catch (err) {
                    console.error(`Error processing question index ${i}:`, err);
                    if (err instanceof z.ZodError) {
                        results.errors.push({ index: i, error: (err as any).errors });
                    } else {
                        results.errors.push({ index: i, error: "Internal server error" });
                    }
                }
            }

            return NextResponse.json(results);
        }

        // Single creation
        else {
            const validatedData = BankQuestionSchema.parse(body);

            if (validatedData.content.question) {
                validatedData.content.question = await processContentImages(validatedData.content.question);
            }

            // Calculate next question number
            let currentQuestionNumber = 0;
            const maxResult = await db.select({ max: sql<number>`MAX(${bankQuestions.questionNumber})` })
                .from(bankQuestions)
                .where(eq(bankQuestions.bankId, params.id));
            if (maxResult[0].max) {
                currentQuestionNumber = Number(maxResult[0].max);
            }

            const newId = crypto.randomUUID();
            await db.insert(bankQuestions).values({
                id: newId,
                bankId: params.id,
                type: validatedData.type,
                content: validatedData.content,
                answerKey: validatedData.answerKey,
                tags: validatedData.tags || [],
                difficulty: validatedData.difficulty,
                defaultPoints: validatedData.defaultPoints,
                questionNumber: ++currentQuestionNumber,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            return NextResponse.json({ id: newId, message: "Question created" });
        }
    } catch (error) {
        console.error("Error creating question:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation failed", details: (error as any).errors }, { status: 400 });
        }
        return NextResponse.json(
            { error: "Failed to create question" },
            { status: 500 }
        );
    }
}
