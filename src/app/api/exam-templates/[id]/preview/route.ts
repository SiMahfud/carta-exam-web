import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examTemplates, bankQuestions, subjects } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { safeJsonParse } from "@/lib/json-utils";
import {
    applyQuestionRandomization,
    seededShuffle,
    shuffleArray,
    RandomizationRules
} from "@/lib/randomization";

/**
 * Helper to select and order questions based on template composition and randomization rules.
 */
function selectAndOrderQuestions(
    t: any,
    allQuestions: any[],
    bankIds: string[],
    seed?: string,
    isForPrint: boolean = false
) {
    // Parse question composition
    const composition: Record<string, number> = safeJsonParse<Record<string, number>>(t.questionComposition, {});

    // Parse randomization rules
    let randomizationRules: RandomizationRules = { mode: 'all' };
    try {
        let parsed = t.randomizationRules;
        if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch { }
        }
        if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch { }
        }
        if (parsed && typeof parsed === 'object') randomizationRules = parsed as RandomizationRules;
    } catch {
        randomizationRules = { mode: 'all' };
    }

    const shouldRandomize = Boolean(t.randomizeQuestions || (randomizationRules.mode && randomizationRules.mode !== 'all'));

    // Stable comparator based on bank order (bankIds order, questionNumber, createdAt, id)
    const compareBankOrder = (a: any, b: any) => {
        const bankIdxA = bankIds.indexOf(a.bankId);
        const bankIdxB = bankIds.indexOf(b.bankId);
        if (bankIdxA !== bankIdxB && bankIdxA !== -1 && bankIdxB !== -1) {
            return bankIdxA - bankIdxB;
        }

        const numA = a.questionNumber ?? a.question_number ?? 0;
        const numB = b.questionNumber ?? b.question_number ?? 0;
        if (numA !== numB && numA !== 0 && numB !== 0) return numA - numB;
        if (numA !== 0 && numB === 0) return -1;
        if (numA === 0 && numB !== 0) return 1;

        const timeA = new Date(a.createdAt ?? a.created_at ?? 0).getTime();
        const timeB = new Date(b.createdAt ?? b.created_at ?? 0).getTime();
        if (timeA !== timeB) return timeA - timeB;

        return (a.id || '').localeCompare(b.id || '');
    };

    const isTypeRandom = (type: string) => {
        if (!shouldRandomize) return false;
        if (randomizationRules.mode === 'all') return true;
        if (randomizationRules.mode === 'by_type') {
            return randomizationRules.types?.includes(type as any) ?? false;
        }
        if (randomizationRules.mode === 'exclude_type') {
            return !(randomizationRules.excludeTypes?.includes(type as any) ?? false);
        }
        return false;
    };

    let selectedQuestions: typeof allQuestions = [];

    if (Object.keys(composition).length === 0) {
        selectedQuestions = [...allQuestions].sort(compareBankOrder);
        if (selectedQuestions.length > 50 && !isForPrint) {
            selectedQuestions = selectedQuestions.slice(0, 50);
        }
    } else {
        const questionsByType: Record<string, typeof allQuestions> = {};
        allQuestions.forEach((q: any) => {
            if (!questionsByType[q.type]) questionsByType[q.type] = [];
            questionsByType[q.type].push(q);
        });

        const questionTypes = ['mc', 'complex_mc', 'matching', 'short', 'essay', 'true_false'];
        const allTypesToProcess = Array.from(new Set([...questionTypes, ...Object.keys(composition)]));

        for (const type of allTypesToProcess) {
            const count = composition[type] || 0;
            if (count > 0) {
                let typeQuestions = [...(questionsByType[type] || [])];
                typeQuestions.sort(compareBankOrder);

                if (isTypeRandom(type)) {
                    if (seed) {
                        typeQuestions = seededShuffle(typeQuestions, `${seed}-${type}`).shuffled;
                    } else {
                        typeQuestions = shuffleArray(typeQuestions);
                    }
                }

                selectedQuestions.push(...typeQuestions.slice(0, count));
            }
        }
    }

    let finalQuestions: typeof allQuestions = [];

    if (shouldRandomize) {
        if (t.essayAtEnd) {
            const essays = selectedQuestions.filter(q => q.type === 'essay');
            const nonEssays = selectedQuestions.filter(q => q.type !== 'essay');

            const randomizedNonEssayIds = applyQuestionRandomization(
                nonEssays,
                randomizationRules,
                seed ? `${seed}-nonessays` : undefined
            );
            const nonEssayMap = new Map(nonEssays.map(q => [q.id, q]));
            const orderedNonEssays = randomizedNonEssayIds.map(id => nonEssayMap.get(id)!).filter(Boolean);

            essays.sort(compareBankOrder);

            finalQuestions = [...orderedNonEssays, ...essays];
        } else {
            const randomizedIds = applyQuestionRandomization(
                selectedQuestions,
                randomizationRules,
                seed ? `${seed}-order` : undefined
            );
            const qMap = new Map(selectedQuestions.map(q => [q.id, q]));
            finalQuestions = randomizedIds.map(id => qMap.get(id)!).filter(Boolean);
        }
    } else {
        if (t.essayAtEnd) {
            const essays = selectedQuestions.filter(q => q.type === 'essay').sort(compareBankOrder);
            const nonEssays = selectedQuestions.filter(q => q.type !== 'essay').sort(compareBankOrder);
            finalQuestions = [...nonEssays, ...essays];
        } else {
            finalQuestions = [...selectedQuestions].sort(compareBankOrder);
        }
    }

    const randomizationApplied = shouldRandomize && finalQuestions.some(q =>
        isTypeRandom(q.type) ||
        (randomizationRules.mode === 'specific_numbers' && (randomizationRules.questionNumbers?.length ?? 0) > 0)
    );

    return { finalQuestions, randomizationApplied, randomizationRules };
}

// POST /api/exam-templates/[id]/preview - Generate exam preview with actual questions
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth(["admin", "teacher"]);
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

        // Parse bankIds
        const bankIds: string[] = safeJsonParse<string[]>(t.bankIds, []);

        if (bankIds.length === 0) {
            return NextResponse.json({ questions: [], totalQuestions: 0 });
        }

        // Get questions from banks
        const allQuestions = await db.select()
            .from(bankQuestions)
            .where(inArray(bankQuestions.bankId, bankIds));

        const { finalQuestions, randomizationApplied, randomizationRules } = selectAndOrderQuestions(
            t,
            allQuestions,
            bankIds,
            seed,
            false
        );

        const shuffleAnswers = Boolean(t.randomizeAnswers || randomizationRules.shuffleAnswers);

        const selectedQuestions = finalQuestions.map((q: any, idx: number) => ({
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
                    let options = [...content.options];
                    if (shuffleAnswers) {
                        const optSeed = `${seed}-${q.id}-options`;
                        const { shuffled } = seededShuffle(options, optSeed);
                        options = shuffled;
                    }
                    const labels = ['A', 'B', 'C', 'D', 'E'];
                    transformedOptions = options.map((optionText: any, idx: number) => ({
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
                randomizationApplied: randomizationApplied,
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

// GET /api/exam-templates/[id]/preview - Get template data for print page
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth(["admin", "teacher"]);

        // Get the template with all settings
        const templateResult = await db.select()
            .from(examTemplates)
            .where(eq(examTemplates.id, params.id))
            .limit(1);

        if (templateResult.length === 0) {
            return NextResponse.json(
                { error: "Template ujian tidak ditemukan" },
                { status: 404 }
            );
        }

        const t = templateResult[0];

        // Get subject name
        let subjectName = "Semua Mapel";
        if (t.subjectId) {
            const subjectResult = await db.select({ name: subjects.name })
                .from(subjects)
                .where(eq(subjects.id, t.subjectId))
                .limit(1);
            if (subjectResult.length > 0) {
                subjectName = subjectResult[0].name;
            }
        }

        // Parse bankIds
        const bankIds: string[] = safeJsonParse<string[]>(t.bankIds, []);

        let questions: any[] = [];
        if (bankIds.length > 0) {
            // Get questions from banks
            const allQuestions = await db.select()
                .from(bankQuestions)
                .where(inArray(bankQuestions.bankId, bankIds));

            const seed = new URL(request.url).searchParams.get("seed") || t.id;
            const { finalQuestions } = selectAndOrderQuestions(
                t,
                allQuestions,
                bankIds,
                seed,
                true
            );

            questions = finalQuestions;
        }

        return NextResponse.json({
            template: {
                id: t.id,
                name: t.name,
                subjectName: subjectName,
                durationMinutes: t.durationMinutes || 90,
                totalScore: t.totalScore || 100,
                passingScore: 75,
                description: t.description,
            },
            questions: questions,
        });
    } catch (error: any) {
        console.error("Error fetching print preview:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch print preview" },
            { status: error.status || 500 }
        );
    }
}

