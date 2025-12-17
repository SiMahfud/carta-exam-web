import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, answers, bankQuestions, users, examSessions } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";

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
            questionOrder: submissions.questionOrder,
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

        // 1. Get ordered question IDs
        let questionIds: string[] = [];
        try {
            let parsed = submission.questionOrder;
            if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { } }
            if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { } }
            if (Array.isArray(parsed)) questionIds = parsed;
        } catch { }

        // 2. Fetch ALL questions in the order
        let assignedQuestions: any[] = [];
        if (questionIds.length > 0) {
            assignedQuestions = await db.select()
                .from(bankQuestions)
                .where(inArray(bankQuestions.id, questionIds));
        }

        // 3. Fetch existing answers
        const existingAnswers = await db.select()
            .from(answers)
            .where(eq(answers.submissionId, params.id));

        // 4. Map questions to answers (combining them)
        const combinedAnswers = questionIds.map(qId => {
            const question = assignedQuestions.find((q: typeof assignedQuestions[0]) => q.id === qId);
            const answer = existingAnswers.find((a: typeof existingAnswers[0]) => a.bankQuestionId === qId);

            if (!question) return null; // Should not happen if integrity is maintained

            // Parse question content & key
            let parsedContent: any = {};
            try {
                parsedContent = question.content;
                if (typeof parsedContent === 'string') { try { parsedContent = JSON.parse(parsedContent); } catch { } }
                if (typeof parsedContent === 'string') { try { parsedContent = JSON.parse(parsedContent); } catch { } }
            } catch { }

            let parsedAnswerKey: any = {};
            try {
                parsedAnswerKey = question.answerKey;
                if (typeof parsedAnswerKey === 'string') { try { parsedAnswerKey = JSON.parse(parsedAnswerKey); } catch { } }
                if (typeof parsedAnswerKey === 'string') { try { parsedAnswerKey = JSON.parse(parsedAnswerKey); } catch { } }
            } catch { }

            // Parse student answer
            let parsedStudentAnswer: any = null;
            if (answer && answer.studentAnswer) {
                try {
                    parsedStudentAnswer = answer.studentAnswer;
                    if (typeof parsedStudentAnswer === 'string') { try { parsedStudentAnswer = JSON.parse(parsedStudentAnswer); } catch { } }
                    if (typeof parsedStudentAnswer === 'string') { try { parsedStudentAnswer = JSON.parse(parsedStudentAnswer); } catch { } }
                } catch { }
            }

            // Improve correct answer format for frontend
            let correctAnswer = parsedAnswerKey;
            if (correctAnswer && typeof correctAnswer === 'object' && 'correct' in correctAnswer) {
                correctAnswer = correctAnswer.correct;
            }
            if (question.type === 'mc' && typeof correctAnswer === 'number') {
                correctAnswer = String.fromCharCode(65 + correctAnswer);
            }
            if (question.type === 'complex_mc' && Array.isArray(correctAnswer)) {
                correctAnswer = correctAnswer.map((idx: any) =>
                    typeof idx === 'number' ? String.fromCharCode(65 + idx) : idx
                );
            }

            return {
                answerId: answer?.id || `missing-${qId}`, // Virtual ID for missing answers
                questionId: question.id,
                type: question.type,
                questionText: parsedContent.question || parsedContent.questionText || "Pertanyaan tidak ditemukan",
                questionContent: parsedContent,
                studentAnswer: parsedStudentAnswer,
                correctAnswer: correctAnswer,
                isFlagged: answer?.isFlagged || false,
                isCorrect: answer?.isCorrect || false,
                score: answer?.score || 0,
                maxPoints: answer?.maxPoints || question.defaultPoints,
                partialPoints: answer?.partialPoints || 0,
                gradingStatus: answer?.gradingStatus || (answer ? "auto" : "not_answered"),
                gradingNotes: answer?.gradingNotes || null,
                defaultPoints: question.defaultPoints,
            };
        }).filter(Boolean);


        return NextResponse.json({
            submission,
            answers: combinedAnswers,
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

            // ID starting with "missing-" means it wasn't in DB yet, but we are grading a realized answer?
            // Actually, if it's "missing-", the user shouldn't be able to grade it properly unless they update the DB.
            // But usually grading only happens on existing answers. 
            // If the teacher wants to grade a skipped question (give points?), we might need to insert it.
            // For now, assume we only update existing answers. Frontend likely only sends valid IDs.
            if (!answerId.startsWith("missing-")) {
                await db.update(answers)
                    .set({
                        partialPoints: score,
                        gradingNotes: gradingNotes || null,
                        gradingStatus: "manual",
                    })
                    .where(eq(answers.id, answerId));
            }
        }

        // Recalculate total score CORRECTLY (Denominator = All Questions)
        // 1. Get submission ordering
        const submissionData = await db.select({ questionOrder: submissions.questionOrder })
            .from(submissions)
            .where(eq(submissions.id, params.id))
            .limit(1);

        const submission = submissionData[0];
        let questionIds: string[] = [];
        try {
            let parsed = submission?.questionOrder;
            if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { } }
            if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { } }
            if (Array.isArray(parsed)) questionIds = parsed;
        } catch { }

        // 2. Calculate Total Max Points from ALL assigned questions
        let totalMax = 0;
        if (questionIds.length > 0) {
            const allQuestions = await db.select({
                id: bankQuestions.id,
                defaultPoints: bankQuestions.defaultPoints
            })
                .from(bankQuestions)
                .where(inArray(bankQuestions.id, questionIds));

            // Sum distinct questions
            totalMax = allQuestions.reduce((sum: number, q: typeof allQuestions[0]) => sum + (q.defaultPoints || 0), 0);
        }

        // 3. Calculate Earned Points from Answers
        const allAnswers = await db.select({
            partialPoints: answers.partialPoints,
            gradingStatus: answers.gradingStatus
        })
            .from(answers)
            .where(eq(answers.submissionId, params.id));

        const totalEarned = allAnswers.reduce((sum: number, a: typeof allAnswers[0]) => sum + (a.partialPoints || 0), 0);
        const finalScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

        // Check if all essays are graded
        // Need to check if any assigned essay question is still pending
        // Simplified: check if any existing answer is pending
        const hasPendingEssays = allAnswers.some((a: typeof allAnswers[0]) => a.gradingStatus === 'pending_manual');

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
