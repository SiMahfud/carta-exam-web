import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, answers, bankQuestions, users, examSessions } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/grading/submissions/[id] - Get submission details for grading
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Get submission
        const submissionData = await db.select({
            id: submissions.id,
            sessionId: submissions.sessionId,
            userId: submissions.userId,
            studentName: users.name,
            sessionName: examSessions.sessionName,
            status: submissions.status,
            gradingStatus: submissions.gradingStatus,
            score: submissions.score,
            earnedPoints: submissions.earnedPoints,
            totalPoints: submissions.totalPoints,
            startTime: submissions.startTime,
            endTime: submissions.endTime,
            violationCount: submissions.violationCount,
        })
            .from(submissions)
            .innerJoin(users, eq(submissions.userId, users.id))
            .innerJoin(examSessions, eq(submissions.sessionId, examSessions.id))
            .where(eq(submissions.id, params.id))
            .limit(1);

        if (submissionData.length === 0) {
            return NextResponse.json(
                { error: "Submission not found" },
                { status: 404 }
            );
        }

        const submission = submissionData[0];

        // Get all answers with question details (FIX: use bankQuestionId)
        const answersData = await db.select({
            answerId: answers.id,
            questionId: answers.bankQuestionId,
            studentAnswer: answers.studentAnswer,
            isFlagged: answers.isFlagged,
            isCorrect: answers.isCorrect,
            score: answers.score,
            maxPoints: answers.maxPoints,
            partialPoints: answers.partialPoints,
            gradingStatus: answers.gradingStatus,
            gradingNotes: answers.gradingNotes,
            questionType: bankQuestions.type,
            questionContent: bankQuestions.content,
            questionAnswerKey: bankQuestions.answerKey,
            defaultPoints: bankQuestions.defaultPoints,
        })
            .from(answers)
            .innerJoin(bankQuestions, eq(answers.bankQuestionId, bankQuestions.id))
            .where(eq(answers.submissionId, params.id));

        // Format answers for frontend with proper answer key conversion
        const formattedAnswers = answersData.map(a => {
            let correctAnswer = a.questionAnswerKey;

            // Extract value if stored as object {correct: value}
            if (correctAnswer && typeof correctAnswer === 'object' && 'correct' in correctAnswer) {
                correctAnswer = (correctAnswer as any).correct;
            }

            // For MC: convert index to letter (0->A, 1->B, 2->C, etc.)
            if (a.questionType === 'mc' && typeof correctAnswer === 'number') {
                correctAnswer = String.fromCharCode(65 + correctAnswer);
            }

            // For Complex MC: convert array of indices to array of letters
            if (a.questionType === 'complex_mc' && Array.isArray(correctAnswer)) {
                correctAnswer = correctAnswer.map((idx: any) =>
                    typeof idx === 'number' ? String.fromCharCode(65 + idx) : idx
                );
            }

            return {
                answerId: a.answerId,
                questionId: a.questionId,
                type: a.questionType,
                questionText: (a.questionContent as any).question || (a.questionContent as any).questionText,
                questionContent: a.questionContent,
                studentAnswer: a.studentAnswer,
                correctAnswer: correctAnswer,
                isFlagged: a.isFlagged,
                isCorrect: a.isCorrect,
                score: a.score,
                maxPoints: a.maxPoints,
                partialPoints: a.partialPoints,
                gradingStatus: a.gradingStatus,
                gradingNotes: a.gradingNotes,
                defaultPoints: a.defaultPoints,
            };
        });

        return NextResponse.json({
            submission,
            answers: formattedAnswers,
        });
    } catch (error) {
        console.error("Error fetching submission details:", error);
        return NextResponse.json(
            { error: "Failed to fetch submission details" },
            { status: 500 }
        );
    }
}

// PATCH /api/grading/submissions/[id] - Update manual grading for specific answers
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { answerUpdates } = body;
        // answerUpdates: [{ answerId, score, gradingNotes }]

        if (!answerUpdates || !Array.isArray(answerUpdates)) {
            return NextResponse.json(
                { error: "Invalid request body" },
                { status: 400 }
            );
        }

        // Update each answer
        for (const update of answerUpdates) {
            const { answerId, score, gradingNotes } = update;

            await db.update(answers)
                .set({
                    partialPoints: score,
                    gradingNotes: gradingNotes || null,
                    gradingStatus: "manual" as any,
                })
                .where(eq(answers.id, answerId));
        }

        // Recalculate total score
        const allAnswers = await db.select()
            .from(answers)
            .where(eq(answers.submissionId, params.id));

        const totalEarned = allAnswers.reduce((sum, a) => sum + (a.partialPoints || 0), 0);
        const totalMax = allAnswers.reduce((sum, a) => sum + (a.maxPoints || 0), 0);
        const finalScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

        // Check if all essays are graded
        const hasPendingEssays = allAnswers.some(a => a.gradingStatus === 'pending_manual');

        // Update submission
        await db.update(submissions)
            .set({
                earnedPoints: totalEarned,
                totalPoints: totalMax,
                score: finalScore,
                gradingStatus: hasPendingEssays ? 'pending_manual' : 'completed',
            })
            .where(eq(submissions.id, params.id));

        return NextResponse.json({
            success: true,
            score: finalScore,
            message: "Grading updated successfully"
        });
    } catch (error) {
        console.error("Error updating grading:", error);
        return NextResponse.json(
            { error: "Failed to update grading" },
            { status: 500 }
        );
    }
}
