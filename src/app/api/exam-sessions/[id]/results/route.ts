import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    examSessions,
    examTemplates,
    submissions,
    answers,
    bankQuestions,
    users,
    classStudents,
    classes
} from "@/lib/schema";
import { eq, inArray, and, like } from "drizzle-orm";

// GET /api/exam-sessions/[id]/results - Get exam results with aggregation
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const classId = searchParams.get("classId");
        const search = searchParams.get("search");

        // 1. Get session info
        const sessionResult = await db.select({
            id: examSessions.id,
            sessionName: examSessions.sessionName,
            status: examSessions.status,
            startTime: examSessions.startTime,
            endTime: examSessions.endTime,
            targetType: examSessions.targetType,
            targetIds: examSessions.targetIds,
            templateId: examSessions.templateId,
            templateName: examTemplates.name,
            totalScore: examTemplates.totalScore,
        })
            .from(examSessions)
            .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id))
            .where(eq(examSessions.id, params.id))
            .limit(1);

        if (sessionResult.length === 0) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        const session = sessionResult[0];

        // 2. Get all submissions for this session (defined for potential future use)
        const _submissionsQuery = db.select({
            submissionId: submissions.id,
            userId: submissions.userId,
            studentName: users.name,
            status: submissions.status,
            score: submissions.score,
            earnedPoints: submissions.earnedPoints,
            totalPoints: submissions.totalPoints,
            endTime: submissions.endTime,
            classId: classStudents.classId,
            className: classes.name,
        })
            .from(submissions)
            .innerJoin(users, eq(submissions.userId, users.id))
            .leftJoin(classStudents, eq(users.id, classStudents.studentId))
            .leftJoin(classes, eq(classStudents.classId, classes.id))
            .where(eq(submissions.sessionId, params.id));

        // Apply filters
        const conditions = [eq(submissions.sessionId, params.id)];

        if (classId) {
            conditions.push(eq(classStudents.classId, classId));
        }

        if (search) {
            conditions.push(like(users.name, `%${search}%`));
        }

        const submissionsData = await db.select({
            submissionId: submissions.id,
            userId: submissions.userId,
            studentName: users.name,
            status: submissions.status,
            score: submissions.score,
            earnedPoints: submissions.earnedPoints,
            totalPoints: submissions.totalPoints,
            endTime: submissions.endTime,
            classId: classStudents.classId,
            className: classes.name,
        })
            .from(submissions)
            .innerJoin(users, eq(submissions.userId, users.id))
            .leftJoin(classStudents, eq(users.id, classStudents.studentId))
            .leftJoin(classes, eq(classStudents.classId, classes.id))
            .where(and(...conditions));

        // 3. Get all answers for these submissions with question details
        const submissionIds = submissionsData.map((s: typeof submissionsData[0]) => s.submissionId);

        let answersData: any[] = [];
        if (submissionIds.length > 0) {
            answersData = await db.select({
                submissionId: answers.submissionId,
                answerId: answers.id,
                questionId: answers.questionId,
                bankQuestionId: answers.bankQuestionId,
                questionType: bankQuestions.type,
                questionContent: bankQuestions.content,
                answerKey: bankQuestions.answerKey,
                studentAnswer: answers.studentAnswer,
                isCorrect: answers.isCorrect,
                score: answers.score,
                maxPoints: answers.maxPoints,
                partialPoints: answers.partialPoints,
                gradingStatus: answers.gradingStatus,
                gradedBy: answers.gradedBy,
            })
                .from(answers)
                .leftJoin(bankQuestions, eq(answers.bankQuestionId, bankQuestions.id))
                .where(inArray(answers.submissionId, submissionIds));
        }

        // 4. Aggregate results by student
        const results = submissionsData.map((submission: typeof submissionsData[0]) => {
            const studentAnswers = answersData.filter((a: typeof answersData[0]) => a.submissionId === submission.submissionId);

            // Initialize score aggregation by type
            const scoresByType: Record<string, any> = {
                mc: { correct: 0, incorrect: 0, score: 0, maxScore: 0 },
                complex_mc: { correct: 0, incorrect: 0, score: 0, maxScore: 0 },
                matching: { correct: 0, incorrect: 0, score: 0, maxScore: 0 },
                short: { correct: 0, incorrect: 0, score: 0, maxScore: 0 },
            };

            const essayQuestions: any[] = [];

            studentAnswers.forEach(answer => {
                const type = answer.questionType;
                const earnedScore = answer.partialPoints || answer.score || 0;
                const maxScore = answer.maxPoints || 0;

                if (type === 'essay') {
                    // Add to essay questions array
                    essayQuestions.push({
                        questionId: answer.questionId || answer.bankQuestionId,
                        questionText: (answer.questionContent as any)?.question || (answer.questionContent as any)?.questionText || '',
                        studentAnswer: answer.studentAnswer,
                        score: earnedScore,
                        maxScore: maxScore,
                        gradingStatus: answer.gradingStatus,
                        gradedBy: answer.gradedBy,
                    });
                } else if (scoresByType[type]) {
                    // Aggregate auto-graded questions
                    scoresByType[type].maxScore += maxScore;
                    scoresByType[type].score += earnedScore;

                    if (answer.isCorrect) {
                        scoresByType[type].correct += 1;
                    } else {
                        scoresByType[type].incorrect += 1;
                    }
                }
            });

            return {
                studentId: submission.userId,
                studentName: submission.studentName,
                className: submission.className || 'N/A',
                submissionId: submission.submissionId,
                status: submission.status,
                scoresByType,
                essayQuestions,
                totalScore: submission.score || 0,
                totalEarnedPoints: submission.earnedPoints || 0,
                totalMaxScore: submission.totalPoints || 0,
                endTime: submission.endTime,
            };
        });

        // 5. Calculate statistics
        const completedResults = results.filter((r: typeof results[0]) => r.status === 'completed');
        const scores = completedResults.map((r: typeof completedResults[0]) => r.totalScore).filter((s: number) => s !== null);

        const statistics = {
            totalStudents: results.length,
            completedStudents: completedResults.length,
            averageScore: scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length * 10) / 10 : 0,
            highestScore: scores.length > 0 ? Math.max(...scores) : 0,
            lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
            completionRate: results.length > 0 ? Math.round((completedResults.length / results.length) * 100) : 0,
        };

        return NextResponse.json({
            session: {
                id: session.id,
                name: session.sessionName,
                templateName: session.templateName,
                status: session.status,
                startTime: session.startTime,
                endTime: session.endTime,
            },
            statistics,
            results,
        });

    } catch (error) {
        console.error("Error fetching exam results:", error);
        return NextResponse.json(
            { error: "Failed to fetch exam results" },
            { status: 500 }
        );
    }
}
