import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, answers, bankQuestions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

// POST /api/student/exams/[sessionId]/answer - Save answer
export async function POST(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    try {
        const body = await request.json();
        const { studentId, questionId, answer, isFlagged } = body;

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
        const answerKey = question.answerKey as any;

        // Auto-grade based on question type
        let isCorrect = false;
        let earnedPoints = 0;
        const maxPoints = question.defaultPoints;

        if (question.type === 'mc') {
            // Extract correct answer from answerKey (may be {correct: 2} or direct value)
            let correctAnswer = answerKey.correct !== undefined ? answerKey.correct : answerKey.correctAnswer;

            // Convert index to letter if numeric (0->A, 1->B, 2->C, etc.)
            if (typeof correctAnswer === 'number') {
                correctAnswer = String.fromCharCode(65 + correctAnswer);
            }

            isCorrect = answer === correctAnswer;
            earnedPoints = isCorrect ? maxPoints : 0;
        } else if (question.type === 'complex_mc') {
            // Extract correct answers (handle multiple formats)
            // Formats: {correct: [0,2,4]} or {correctAnswers: ["A","C","E"]} or {correctIndices: [0,2,4]}
            let correctAnswers = answerKey.correct !== undefined
                ? answerKey.correct
                : (answerKey.correctAnswers || answerKey.correctIndices || answerKey.correctOptions || []);

            // Convert indices to letters if array of numbers
            if (Array.isArray(correctAnswers) && correctAnswers.length > 0 && typeof correctAnswers[0] === 'number') {
                correctAnswers = correctAnswers.map((idx: number) => String.fromCharCode(65 + idx));
            }

            const studentAnswers = answer || [];
            const correctCount = studentAnswers.filter((a: string) => correctAnswers.includes(a)).length;
            const incorrectCount = studentAnswers.length - correctCount;

            if (incorrectCount === 0 && correctCount === correctAnswers.length) {
                isCorrect = true;
                earnedPoints = maxPoints;
            } else {
                // Partial credit: each correct answer adds points, each incorrect subtracts
                earnedPoints = Math.max(0, Math.round((correctCount - incorrectCount) / correctAnswers.length * maxPoints * 100) / 100);
            }
        } else if (question.type === 'short') {
            const acceptedAnswers = answerKey.acceptedAnswers || [];
            const studentAnswer = (answer || '').trim().toLowerCase();
            isCorrect = acceptedAnswers.some((a: string) => a.toLowerCase() === studentAnswer);
            earnedPoints = isCorrect ? maxPoints : 0;
        } else if (question.type === 'matching') {
            const content = question.content as any;
            const leftItems = content.leftItems || [];
            const rightItems = content.rightItems || [];

            // Build lookup maps for UUID-based matching
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

            // Handle different answer key formats:
            // 1. New format: { matches: [{leftId, rightId}] }
            // 2. Old format: { pairs: {0: 1} } (indices)
            let correctPairsList: { leftIdx: number; rightIdx: number }[] = [];

            if (answerKey.matches && Array.isArray(answerKey.matches)) {
                // New UUID-based format
                answerKey.matches.forEach((match: any) => {
                    const leftIdx = leftIdToIndex[match.leftId];
                    const rightIdx = rightIdToIndex[match.rightId];
                    if (leftIdx !== undefined && rightIdx !== undefined) {
                        correctPairsList.push({ leftIdx, rightIdx });
                    }
                });
            } else if (answerKey.pairs) {
                // Old index-based format
                Object.entries(answerKey.pairs).forEach(([leftIdx, rightValue]) => {
                    const rightIndices = Array.isArray(rightValue) ? rightValue : [rightValue];
                    rightIndices.forEach((rIdx: any) => {
                        correctPairsList.push({ leftIdx: parseInt(leftIdx), rightIdx: rIdx as number });
                    });
                });
            }

            const studentPairs = answer || []; // Array of { left, right } with UUIDs or indices

            // Convert student pairs to index format
            const studentPairsIndexed = studentPairs.map((sp: any) => ({
                leftIdx: typeof sp.left === 'string' && leftIdToIndex[sp.left] !== undefined
                    ? leftIdToIndex[sp.left]
                    : (typeof sp.left === 'number' ? sp.left : parseInt(sp.left) || -1),
                rightIdx: typeof sp.right === 'string' && rightIdToIndex[sp.right] !== undefined
                    ? rightIdToIndex[sp.right]
                    : (typeof sp.right === 'number' ? sp.right : parseInt(sp.right) || -1)
            }));

            const correctCount = studentPairsIndexed.filter((sp: any) =>
                correctPairsList.some((cp: any) => cp.leftIdx === sp.leftIdx && cp.rightIdx === sp.rightIdx)
            ).length;

            // Calculate partial credit
            const totalPairs = correctPairsList.length;
            earnedPoints = totalPairs > 0 ? Math.round((correctCount / totalPairs) * maxPoints * 100) / 100 : 0;
            isCorrect = correctCount === totalPairs && totalPairs > 0;
        } else if (question.type === 'essay') {
            // Essay requires manual grading
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
            // Update
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
            // Insert
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
    } catch (error) {
        console.error("Error saving answer:", error);
        return NextResponse.json(
            { error: "Failed to save answer" },
            { status: 500 }
        );
    }
}
