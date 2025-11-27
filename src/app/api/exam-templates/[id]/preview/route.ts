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
        const seed = body.seed || Date.now().toString(); // For reproducible randomization

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

        // Apply randomization rules
        const randomizationRules = (t.randomizationRules as any) || { mode: 'all' };
        const randomSeed = parseInt(seed);

        selectedQuestions = applyRandomization(selectedQuestions, randomizationRules, randomSeed);

        // Apply essay at end rule if enabled (from base randomization settings)
        if (t.essayAtEnd) {
            const essays = selectedQuestions.filter(q => q.type === 'essay');
            const others = selectedQuestions.filter(q => q.type !== 'essay');
            selectedQuestions = [...others, ...essays];
        }

        // Renumber questions
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

                return {
                    number: q.number,
                    type: q.type,
                    questionText: content.question || content.questionText || '',
                    options: content.options || null,
                    correctAnswer: answerKey.correct || answerKey.correctAnswer,
                    points: q.defaultPoints,
                    difficulty: q.difficulty,
                    // Include additional data based on question type
                    pairs: content.pairs || null, // for matching
                    acceptableAnswers: content.acceptableAnswers || null, // for short answer
                    rubric: content.rubric || null, // for essay
                    guidelines: content.guidelines || content.maxWords || null, // for essay
                };
            }),
            metadata: {
                totalQuestions: selectedQuestions.length,
                randomizationApplied: randomizationRules.mode !== 'none',
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

// Randomization helper function
function applyRandomization(questions: any[], rules: any, seed: number) {
    const seededRandom = createSeededRandom(seed);

    switch (rules.mode) {
        case 'all':
            return shuffleArray(questions, seededRandom);

        case 'by_type':
            const typesToRandomize = rules.types || [];
            const toRandomize = questions.filter(q => typesToRandomize.includes(q.type));
            const notToRandomize = questions.filter(q => !typesToRandomize.includes(q.type));
            return [...shuffleArray(toRandomize, seededRandom), ...notToRandomize];

        case 'exclude_type':
            const typesToExclude = rules.excludeTypes || [];
            const toRandomizeExclude = questions.filter(q => !typesToExclude.includes(q.type));
            const notToRandomizeExclude = questions.filter(q => typesToExclude.includes(q.type));
            return [...shuffleArray(toRandomizeExclude, seededRandom), ...notToRandomizeExclude];

        case 'specific_numbers':
            const numbersToRandomize = rules.questionNumbers || [];
            const result = [...questions];
            const indicesToRandomize = numbersToRandomize.map((n: number) => n - 1).filter((i: number) => i >= 0 && i < result.length);

            if (indicesToRandomize.length > 0) {
                const itemsToShuffle = indicesToRandomize.map((i: number) => result[i]);
                const shuffled = shuffleArray(itemsToShuffle, seededRandom);
                indicesToRandomize.forEach((idx: number, i: number) => {
                    result[idx] = shuffled[i];
                });
            }
            return result;

        default:
            return questions;
    }
}

// Seeded random number generator
function createSeededRandom(seed: number) {
    let currentSeed = seed;
    return () => {
        const x = Math.sin(currentSeed++) * 10000;
        return x - Math.floor(x);
    };
}

// Fisher-Yates shuffle with seeded random
function shuffleArray(array: any[], random: () => number) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
