import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    examSessions,
    examTemplates,
    submissions,
    answers,
    bankQuestions,
    subjects,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { requireStudent } from "@/lib/auth-guard";
import { safeJsonParse } from "@/lib/json-utils";

// GET /api/student/exams/[sessionId]/review - Student review completed exam
export async function GET(
    _request: NextRequest,
    { params }: { params: { sessionId: string } }
) {
    try {
        const currentUser = await requireStudent();

        // 1. Get session & template info
        const sessionResult = await db
            .select({
                id: examSessions.id,
                sessionName: examSessions.sessionName,
                status: examSessions.status,
                startTime: examSessions.startTime,
                endTime: examSessions.endTime,
                templateId: examSessions.templateId,
                templateName: examTemplates.name,
                subjectId: examTemplates.subjectId,
                subjectName: subjects.name,
                allowReview: examTemplates.allowReview,
                showResult: examTemplates.showResult,
                totalScore: examTemplates.totalScore,
            })
            .from(examSessions)
            .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id))
            .leftJoin(subjects, eq(examTemplates.subjectId, subjects.id))
            .where(eq(examSessions.id, params.sessionId))
            .limit(1);

        if (sessionResult.length === 0) {
            return NextResponse.json({ error: "Sesi ujian tidak ditemukan" }, { status: 404 });
        }

        const session = sessionResult[0];

        // 2. Get student's submission
        const submissionResult = await db
            .select()
            .from(submissions)
            .where(
                and(
                    eq(submissions.sessionId, params.sessionId),
                    eq(submissions.userId, currentUser.id)
                )
            )
            .limit(1);

        if (submissionResult.length === 0) {
            return NextResponse.json(
                { error: "Anda belum memiliki data pengerjaan untuk ujian ini" },
                { status: 404 }
            );
        }

        const submission = submissionResult[0];

        // 3. Get all answers submitted by this student
        const studentAnswers = await db
            .select({
                id: answers.id,
                questionId: answers.questionId,
                answer: answers.answer,
                isCorrect: answers.isCorrect,
                score: answers.score,
                feedback: answers.feedback,
            })
            .from(answers)
            .where(eq(answers.submissionId, submission.id));

        const answerMap = new Map(studentAnswers.map((a) => [a.questionId, a]));

        // 4. Retrieve questions in the randomized questionOrder
        const questionIds: string[] = safeJsonParse(submission.questionOrder, []);

        let questionDetails: any[] = [];
        if (questionIds.length > 0) {
            const fetchedQuestions = await db
                .select({
                    id: bankQuestions.id,
                    type: bankQuestions.type,
                    content: bankQuestions.content,
                    answerKey: bankQuestions.answerKey,
                    defaultPoints: bankQuestions.defaultPoints,
                    explanation: bankQuestions.explanation,
                })
                .from(bankQuestions);

            const questionMap = new Map(fetchedQuestions.map((q) => [q.id, q]));

            questionDetails = questionIds
                .map((qId) => {
                    const q = questionMap.get(qId);
                    if (!q) return null;

                    const studentAns = answerMap.get(qId);
                    const parsedContent = safeJsonParse(q.content, {});
                    const parsedKey = safeJsonParse(q.answerKey, {});
                    const parsedStudentAnswer = studentAns?.answer ? safeJsonParse(studentAns.answer, studentAns.answer) : null;

                    return {
                        id: q.id,
                        type: q.type,
                        questionText: parsedContent.question || "",
                        content: parsedContent,
                        points: q.defaultPoints || 1,
                        studentAnswer: parsedStudentAnswer,
                        isCorrect: studentAns?.isCorrect ?? false,
                        score: studentAns?.score ?? 0,
                        feedback: studentAns?.feedback || null,
                        correctAnswer: parsedKey,
                        explanation: q.explanation || null,
                    };
                })
                .filter(Boolean);
        }

        return NextResponse.json({
            session: {
                id: session.id,
                name: session.sessionName,
                subject: session.subjectName || "Umum",
                startTime: session.startTime,
                endTime: session.endTime,
                status: session.status,
                allowReview: session.allowReview ?? true,
                showResult: session.showResult ?? true,
            },
            submission: {
                id: submission.id,
                score: submission.score,
                earnedPoints: submission.earnedPoints,
                totalPoints: submission.totalPoints,
                status: submission.status,
                gradingStatus: submission.gradingStatus,
                violationCount: submission.violationCount || 0,
                submittedAt: submission.endTime,
            },
            questions: questionDetails,
        });
    } catch (err: any) {
        console.error("Error in exam review API:", err);
        return NextResponse.json(
            { error: err.message || "Gagal memuat review ujian" },
            { status: err.status || 500 }
        );
    }
}
