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
            isCorrect = answer === answerKey.correctAnswer;
            earnedPoints = isCorrect ? maxPoints : 0;
        } else if (question.type === 'complex_mc') {
            const correctAnswers = answerKey.correctAnswers || [];
            const studentAnswers = answer || [];
            const correctCount = studentAnswers.filter((a: string) => correctAnswers.includes(a)).length;
            const incorrectCount = studentAnswers.length - correctCount;

            if (incorrectCount === 0 && correctCount === correctAnswers.length) {
                isCorrect = true;
                earnedPoints = maxPoints;
            } else {
                // Partial credit
                earnedPoints = Math.max(0, (correctCount - incorrectCount) / correctAnswers.length * maxPoints);
            }
        } else if (question.type === 'short') {
            const acceptedAnswers = answerKey.acceptedAnswers || [];
            const studentAnswer = (answer || '').trim().toLowerCase();
            isCorrect = acceptedAnswers.some((a: string) => a.toLowerCase() === studentAnswer);
            earnedPoints = isCorrect ? maxPoints : 0;
        } else if (question.type === 'matching') {
            const correctPairs = answerKey.pairs || [];
            const studentPairs = answer || [];
            const correctCount = studentPairs.filter((sp: any) =>
                correctPairs.some((cp: any) => cp.left === sp.left && cp.right === sp.right)
            ).length;
            earnedPoints = (correctCount / correctPairs.length) * maxPoints;
            isCorrect = correctCount === correctPairs.length;
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
