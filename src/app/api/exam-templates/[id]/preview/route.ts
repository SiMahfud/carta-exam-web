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

        // Get all questions from selected banks
        const bankIds = t.bankIds as string[];
        const allQuestions = await db.select()
            .from(bankQuestions)
            .where(inArray(bankQuestions.bankId, bankIds));

        // Group by type
        const questionsByType: Record<string, any[]> = {
            mc: [],
            complex_mc: [],
            matching: [],
            short: [],
            essay: [],
        };

        allQuestions.forEach(q => {
            if (questionsByType[q.type]) {
                questionsByType[q.type].push(q);
            }
        });

        // Select questions according to composition
        const composition = t.questionComposition as any;
        let selectedQuestions: any[] = [];

        for (const [type, count] of Object.entries(composition)) {
            const numCount = Number(count);
            if (numCount && numCount > 0) {
                const available = questionsByType[type as keyof typeof questionsByType] || [];
                const selected = available.slice(0, numCount);
                selectedQuestions.push(...selected.map((q, idx) => ({
                    ...q,
                    number: selectedQuestions.length + idx + 1,
                    type,
                })));
            }
        }

        // DISABLE RANDOMIZATION FOR PREVIEW - Keep original order for easier checking
        selectedQuestions = selectedQuestions.map((q, idx) => ({
            ...q,
            number: idx + 1,
        }));

        return NextResponse.json({
            examInfo: {
                name: t.name,
                durationMinutes: t.durationMinutes,
                totalScore: t.totalScore || 100,
            },
            questions: selectedQuestions.map(q => {
                const content = (q.content as any) || {};
                const answerKey = (q.answerKey as any) || {};

                // Transform options array to {label, text} format for MC questions
                let transformedOptions = null;
                if ((q.type === 'mc' || q.type === 'complex_mc') && content.options && Array.isArray(content.options)) {
                    const labels = ['A', 'B', 'C', 'D', 'E'];
                    transformedOptions = content.options.map((optionText: string, idx: number) => ({
                        label: labels[idx] || String.fromCharCode(65 + idx),
                        text: optionText
                    }));
                }

                // Transform leftItems/rightItems to pairs format for matching
                let transformedPairs = null;
                if (q.type === 'matching' && content.leftItems && content.rightItems) {
                    transformedPairs = content.leftItems.map((leftItem: string, idx: number) => ({
                        left: leftItem,
                        right: content.rightItems[idx] || ''
                    }));
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

                return {
                    number: q.number,
                    type: q.type,
                    questionText: content.question || content.questionText || '',
                    options: transformedOptions,
                    correctAnswer: answerKey.correct || answerKey.correctAnswer,
                    points: q.defaultPoints,
                    difficulty: q.difficulty,
                    pairs: transformedPairs,
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
