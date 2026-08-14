import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, answers, bankQuestions, examSessions, examTemplates } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { seededShuffle } from "@/lib/randomization";
import { safeJsonParse } from "@/lib/json-utils";

// POST /api/student/exams/[sessionId]/answer - Save answer
export async function POST(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    try {
        const user = await requireAuth(["student", "admin", "teacher"]);
        const body = await request.json();
        const { questionId, answer, isFlagged } = body;

        // For student role, always use authenticated user ID
        const studentId = user.role === "student" ? user.id : (body.studentId || user.id);

        if (!studentId || !questionId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get submission
        const submissionData = await db.select()
            .from(submissions)
            .where(and(
                eq(submissions.sessionId, params.sessionId),
                eq(submissions.userId, studentId)
            ))
            .limit(1);

        if (submissionData.length === 0) {
            return NextResponse.json(
                { error: "No active submission" },
                { status: 404 }
            );
        }

        const submission = submissionData[0];

        // Get question for auto-grading
        const questionData = await db.select()
            .from(bankQuestions)
            .where(eq(bankQuestions.id, questionId))
            .limit(1);

        if (questionData.length === 0) {
            return NextResponse.json({ error: "Question not found" }, { status: 404 });
        }

        const question = questionData[0];

        // Check if session has answer randomization enabled
        let shuffleAnswers = false;
        const sessionData = await db.select({ templateId: examSessions.templateId })
            .from(examSessions)
            .where(eq(examSessions.id, params.sessionId))
            .limit(1);

        if (sessionData.length > 0) {
            const templateData = await db.select({
                randomizeAnswers: examTemplates.randomizeAnswers,
                randomizationRules: examTemplates.randomizationRules
            })
                .from(examTemplates)
                .where(eq(examTemplates.id, sessionData[0].templateId))
                .limit(1);

            if (templateData.length > 0) {
                let rules: any = {};
                try {
                    rules = typeof templateData[0].randomizationRules === 'string'
                        ? JSON.parse(templateData[0].randomizationRules)
                        : (templateData[0].randomizationRules || {});
                } catch { }
                shuffleAnswers = templateData[0].randomizeAnswers || rules.shuffleAnswers || false;
            }
        }

        // Parse content & answerKey
        const content = safeJsonParse<Record<string, any>>(question.content, {});
        const answerKey = safeJsonParse<Record<string, any>>(question.answerKey, {});

        // Auto-grade based on question type
        let isCorrect = false;
        let earnedPoints = 0;
        const maxPoints = question.defaultPoints;

        if (question.type === 'mc' || question.type === 'true_false') {
            const options = content.options || [];
            let chosenOrigIndex = -1;

            if (typeof answer === 'string' && answer.length === 1) {
                const chosenLetterIdx = answer.toUpperCase().charCodeAt(0) - 65; // A->0, B->1, etc.

                if (shuffleAnswers && options.length > 0) {
                    const seed = `${submission.id}-${question.id}-options`;
                    const { mapping } = seededShuffle(options, seed);
                    chosenOrigIndex = mapping[chosenLetterIdx] !== undefined ? mapping[chosenLetterIdx] : chosenLetterIdx;
                } else {
                    chosenOrigIndex = chosenLetterIdx;
                }
            }

            // Extract correct answer original index
            let correctOrigIndex = -1;
            const correctVal = answerKey.correct !== undefined ? answerKey.correct : answerKey.correctAnswer;

            if (typeof correctVal === 'number') {
                correctOrigIndex = correctVal;
            } else if (typeof correctVal === 'string' && correctVal.length === 1) {
                correctOrigIndex = correctVal.toUpperCase().charCodeAt(0) - 65;
            } else if (typeof correctVal === 'boolean') {
                correctOrigIndex = correctVal ? 0 : 1;
            }

            isCorrect = chosenOrigIndex !== -1 && chosenOrigIndex === correctOrigIndex;
            earnedPoints = isCorrect ? maxPoints : 0;
        } else if (question.type === 'complex_mc') {
            const options = content.options || [];
            let correctOrigIndices: number[] = [];

            const rawCorrect = answerKey.correct !== undefined
                ? answerKey.correct
                : (answerKey.correctAnswers || answerKey.correctIndices || answerKey.correctOptions || []);

            if (Array.isArray(rawCorrect)) {
                correctOrigIndices = rawCorrect.map((val: any) => {
                    if (typeof val === 'number') return val;
                    if (typeof val === 'string' && val.length === 1) return val.toUpperCase().charCodeAt(0) - 65;
                    return -1;
                }).filter(idx => idx >= 0);
            }

            const studentAnswers: string[] = Array.isArray(answer) ? answer : [];
            let chosenOrigIndices: number[] = [];

            if (shuffleAnswers && options.length > 0) {
                const seed = `${submission.id}-${question.id}-options`;
                const { mapping } = seededShuffle(options, seed);
                chosenOrigIndices = studentAnswers.map(letter => {
                    const letterIdx = letter.toUpperCase().charCodeAt(0) - 65;
                    return mapping[letterIdx] !== undefined ? mapping[letterIdx] : letterIdx;
                });
            } else {
                chosenOrigIndices = studentAnswers.map(letter => letter.toUpperCase().charCodeAt(0) - 65);
            }

            const correctCount = chosenOrigIndices.filter(idx => correctOrigIndices.includes(idx)).length;
            const incorrectCount = chosenOrigIndices.length - correctCount;

            if (correctOrigIndices.length > 0 && incorrectCount === 0 && correctCount === correctOrigIndices.length) {
                isCorrect = true;
                earnedPoints = maxPoints;
            } else if (correctOrigIndices.length > 0) {
                earnedPoints = Math.max(0, Math.round((correctCount - incorrectCount) / correctOrigIndices.length * maxPoints * 100) / 100);
            }
        } else if (question.type === 'short') {
            const acceptedAnswers = answerKey.acceptedAnswers || [];
            const studentAnswer = (answer || '').trim().toLowerCase();
            isCorrect = acceptedAnswers.some((a: string) => a.toLowerCase() === studentAnswer);
            earnedPoints = isCorrect ? maxPoints : 0;
        } else if (question.type === 'matching') {
            const leftItems = content.leftItems || [];
            const rightItems = content.rightItems || [];

            let rightMapping: number[] = rightItems.map((_: any, i: number) => i);
            if (shuffleAnswers && rightItems.length > 0) {
                const seed = `${submission.id}-${question.id}-matching`;
                const result = seededShuffle(rightItems, seed);
                rightMapping = result.mapping;
            }

            const leftIdToIndex: { [id: string]: number } = {};
            const rightIdToIndex: { [id: string]: number } = {};
            leftItems.forEach((item: any, idx: number) => {
                const id = typeof item === 'object' ? item.id : item;
                leftIdToIndex[id] = idx;
            });
            rightItems.forEach((item: any, idx: number) => {
                const id = typeof item === 'object' ? item.id : item;
                rightIdToIndex[id] = idx;
            });

            const correctPairsList: { leftIdx: number; rightIdx: number }[] = [];
            if (answerKey.matches && Array.isArray(answerKey.matches)) {
                answerKey.matches.forEach((match: any) => {
                    const leftIdx = leftIdToIndex[match.leftId];
                    const rightIdx = rightIdToIndex[match.rightId];
                    if (leftIdx !== undefined && rightIdx !== undefined) {
                        correctPairsList.push({ leftIdx, rightIdx });
                    }
                });
            } else if (answerKey.pairs) {
                Object.entries(answerKey.pairs).forEach(([leftIdx, rightValue]) => {
                    const rightIndices = Array.isArray(rightValue) ? rightValue : [rightValue];
                    rightIndices.forEach((rIdx: any) => {
                        correctPairsList.push({ leftIdx: parseInt(leftIdx), rightIdx: rIdx as number });
                    });
                });
            }

            const studentPairs = answer || [];
            const studentPairsIndexed = studentPairs.map((sp: any) => {
                const leftIdx = typeof sp.left === 'string' && leftIdToIndex[sp.left] !== undefined
                    ? leftIdToIndex[sp.left]
                    : (typeof sp.left === 'number' ? sp.left : parseInt(sp.left) || -1);

                const rawRightIdx = typeof sp.right === 'string' && rightIdToIndex[sp.right] !== undefined
                    ? rightIdToIndex[sp.right]
                    : (typeof sp.right === 'number' ? sp.right : parseInt(sp.right) || -1);

                // Map shuffled right index back to original
                const rightIdx = (shuffleAnswers && rightMapping[rawRightIdx] !== undefined)
                    ? rightMapping[rawRightIdx]
                    : rawRightIdx;

                return { leftIdx, rightIdx };
            });


            const correctCount = studentPairsIndexed.filter((sp: any) =>
                correctPairsList.some((cp: any) => cp.leftIdx === sp.leftIdx && cp.rightIdx === sp.rightIdx)
            ).length;

            const totalPairs = correctPairsList.length;
            earnedPoints = totalPairs > 0 ? Math.round((correctCount / totalPairs) * maxPoints * 100) / 100 : 0;
            isCorrect = correctCount === totalPairs && totalPairs > 0;
        } else if (question.type === 'essay') {
            earnedPoints = 0;
            isCorrect = false;
        }

        // Check if answer already exists
        const existingAnswer = await db.select()
            .from(answers)
            .where(and(
                eq(answers.submissionId, submission.id),
                eq(answers.bankQuestionId, questionId)
            ))
            .limit(1);

        if (existingAnswer.length > 0) {
            await db.update(answers)
                .set({
                    studentAnswer: answer,
                    isFlagged: isFlagged || false,
                    isCorrect,
                    score: earnedPoints,
                    maxPoints,
                    partialPoints: earnedPoints,
                })
                .where(eq(answers.id, existingAnswer[0].id));
        } else {
            await db.insert(answers).values({
                submissionId: submission.id,
                bankQuestionId: questionId,
                studentAnswer: answer,
                isFlagged: isFlagged || false,
                isCorrect,
                score: earnedPoints,
                maxPoints,
                partialPoints: earnedPoints,
                gradingStatus: question.type === 'essay' ? 'pending_manual' : 'auto',
            });
        }

        return NextResponse.json({
            success: true,
            isCorrect,
            earnedPoints,
            maxPoints
        });
    } catch (error: any) {
        console.error("Error saving answer:", error);
        return NextResponse.json(
            { error: error.message || "Failed to save answer" },
            { status: error.status || 500 }
        );
    }
}
