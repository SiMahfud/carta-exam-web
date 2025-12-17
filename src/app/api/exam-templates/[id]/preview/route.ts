import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examTemplates, bankQuestions } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";

// POST /api/exam-templates/[id]/preview - Generate exam preview with actual questions
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const seed = body.seed || Date.now().toString();

        // Get the template
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

        const t = template[0];

        // Parse bankIds with recursive strategy
        let bankIds: string[] = [];
        try {
            let parsed = t.bankIds;
            if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { } }
            if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { } }
            if (Array.isArray(parsed)) bankIds = parsed;
        } catch { bankIds = []; }

        if (bankIds.length === 0) {
            return NextResponse.json({ questions: [], totalQuestions: 0 });
        }

        // Get questions from banks
        const allQuestions = await db.select()
            .from(bankQuestions)
            .where(inArray(bankQuestions.bankId, bankIds));

        // Parse question composition with recursive strategy
        let composition: Record<string, number> = {};
        try {
            let parsed = t.questionComposition;
            if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { } }
            if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { } }
            if (parsed && typeof parsed === 'object') composition = parsed as Record<string, number>;
        } catch { composition = {}; }

        // Filter and select questions based on composition
        let selectedQuestions: typeof allQuestions = [];

        // If no composition set, return all questions (limited to 50 for preview)
        if (Object.keys(composition).length === 0) {
            selectedQuestions = allQuestions.slice(0, 50);
        } else {
            // Select random questions based on composition
            const questionsByType: Record<string, typeof allQuestions> = {};
            allQuestions.forEach((q: any) => {
                if (!questionsByType[q.type]) questionsByType[q.type] = [];
                questionsByType[q.type].push(q);
            });

            Object.entries(composition).forEach(([type, count]) => {
                const typeQuestions = questionsByType[type] || [];
                // Simple random selection for preview
                const shuffled = [...typeQuestions].sort(() => Math.random() - 0.5);
                selectedQuestions.push(...shuffled.slice(0, count));
            });
        }

        // Format for preview



        // DISABLE RANDOMIZATION FOR PREVIEW - Keep original order for easier checking
        selectedQuestions = selectedQuestions.map((q: any, idx: number) => ({
            ...q,
            number: idx + 1,
        }));

        return NextResponse.json({
            examInfo: {
                name: t.name,
                durationMinutes: t.durationMinutes,
                totalScore: t.totalScore || 100,
            },
            questions: selectedQuestions.map((q: any) => {
                // Parse content if it's a JSON string
                let content: any;
                if (typeof q.content === 'string') {
                    try {
                        content = JSON.parse(q.content);
                    } catch {
                        content = {};
                    }
                } else {
                    content = q.content || {};
                }

                // Parse answerKey if it's a JSON string
                let answerKey: any;
                if (typeof q.answerKey === 'string') {
                    try {
                        answerKey = JSON.parse(q.answerKey);
                    } catch {
                        answerKey = {};
                    }
                } else {
                    answerKey = q.answerKey || {};
                }

                // Transform options array to {label, text} format for MC questions
                let transformedOptions = null;
                if ((q.type === 'mc' || q.type === 'complex_mc') && content.options && Array.isArray(content.options)) {
                    const labels = ['A', 'B', 'C', 'D', 'E'];
                    transformedOptions = content.options.map((optionText: any, idx: number) => ({
                        label: labels[idx] || String.fromCharCode(65 + idx),
                        text: typeof optionText === 'object' ? optionText.text : optionText
                    }));
                }

                // Transform leftItems/rightItems to pairs format for matching
                let transformedPairs = null;
                if (q.type === 'matching' && content.leftItems && content.rightItems && answerKey.pairs) {
                    transformedPairs = [];
                    // answerKey.pairs is { "0": [1], "1": [0, 2] } mapping left index to right indices
                    Object.entries(answerKey.pairs).forEach(([leftIdx, rightIndices]) => {
                        const lIdx = parseInt(leftIdx);
                        const leftItem = content.leftItems[lIdx];

                        if (Array.isArray(rightIndices)) {
                            rightIndices.forEach((rIdx: any) => {
                                const rightItem = content.rightItems[rIdx];
                                if (leftItem && rightItem) {
                                    transformedPairs.push({
                                        left: typeof leftItem === 'object' ? leftItem.text : leftItem,
                                        right: typeof rightItem === 'object' ? rightItem.text : rightItem
                                    });
                                }
                            });
                        } else {
                            // Handle legacy format if any
                            const rIdx = rightIndices as number;
                            const rightItem = content.rightItems[rIdx];
                            if (leftItem && rightItem) {
                                transformedPairs.push({
                                    left: typeof leftItem === 'object' ? leftItem.text : leftItem,
                                    right: typeof rightItem === 'object' ? rightItem.text : rightItem
                                });
                            }
                        }
                    });
                } else if (q.type === 'matching' && content.leftItems && content.rightItems) {
                    // Fallback for questions without explicit pairs in answerKey (legacy/imported)
                    // Try to match by index if pairs not defined
                    transformedPairs = content.leftItems.map((leftItem: any, idx: number) => {
                        const rightItem = content.rightItems[idx];
                        return {
                            left: typeof leftItem === 'object' ? leftItem.text : leftItem,
                            right: typeof rightItem === 'object' ? rightItem.text : (rightItem || '')
                        };
                    });
                }

                // Get accepted answers for short answer
                let acceptableAnswers = null;
                if (q.type === 'short') {
                    acceptableAnswers = answerKey.acceptedAnswers || content.acceptableAnswers || answerKey.correct || null;
                    if (acceptableAnswers && !Array.isArray(acceptableAnswers)) {
                        acceptableAnswers = [acceptableAnswers];
                    }
                }

                // Transform rubric format
                let transformedRubric = null;
                if (q.type === 'essay' && answerKey.rubric && Array.isArray(answerKey.rubric)) {
                    transformedRubric = answerKey.rubric.map((r: any) => ({
                        criterion: r.criteria || r.criterion,
                        points: r.maxPoints || r.points || 0
                    }));
                }

                // Handle matches from imported questions (ID-based)
                if (q.type === 'matching' && content.leftItems && content.rightItems && answerKey.matches) {
                    transformedPairs = [];
                    answerKey.matches.forEach((match: any) => {
                        const leftItem = content.leftItems.find((i: any) => i.id === match.leftId);
                        const rightItem = content.rightItems.find((i: any) => i.id === match.rightId);

                        if (leftItem && rightItem) {
                            transformedPairs.push({
                                left: typeof leftItem === 'object' ? leftItem.text : leftItem,
                                right: typeof rightItem === 'object' ? rightItem.text : rightItem
                            });
                        }
                    });
                }

                return {
                    number: q.number,
                    type: q.type,
                    questionText: content.question || content.questionText || '',
                    options: transformedOptions,
                    correctAnswer: answerKey.correct ?? answerKey.correctAnswer ?? answerKey.correctIndices,
                    points: q.defaultPoints,
                    difficulty: q.difficulty,
                    pairs: transformedPairs,
                    leftItems: content.leftItems,
                    rightItems: content.rightItems,
                    rawAnswerKey: answerKey,
                    acceptableAnswers: acceptableAnswers,
                    rubric: transformedRubric || content.rubric || null,
                    guidelines: content.guidelines || content.maxWords || null,
                };
            }),
            metadata: {
                totalQuestions: selectedQuestions.length,
                randomizationApplied: false,
                seed: seed,
            }
        });
    } catch (error) {
        console.error("Error generating preview:", error);
        return NextResponse.json(
            { error: "Failed to generate preview" },
            { status: 500 }
        );
    }
}
