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
import { eq, and, inArray } from "drizzle-orm";
import { requireStudent } from "@/lib/auth-guard";
import { safeJsonParse } from "@/lib/json-utils";
import { seededShuffle } from "@/lib/randomization";

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
                showResult: examTemplates.showResultImmediately,
                totalScore: examTemplates.totalScore,
                randomizeAnswers: examTemplates.randomizeAnswers,
                randomizationRules: examTemplates.randomizationRules,
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

        let rules: any = {};
        try {
            rules = typeof session.randomizationRules === 'string'
                ? JSON.parse(session.randomizationRules)
                : (session.randomizationRules || {});
        } catch { }
        const shuffleAnswers = session.randomizeAnswers || rules.shuffleAnswers || false;

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
                bankQuestionId: answers.bankQuestionId,
                answer: answers.studentAnswer,
                isCorrect: answers.isCorrect,
                score: answers.score,
                partialPoints: answers.partialPoints,
                maxPoints: answers.maxPoints,
                feedback: answers.gradingNotes,
            })
            .from(answers)
            .where(eq(answers.submissionId, submission.id));

        const answerMap = new Map(studentAnswers.map((a: any) => [a.bankQuestionId || a.questionId, a]));

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
                    metadata: bankQuestions.metadata,
                })
                .from(bankQuestions)
                .where(inArray(bankQuestions.id, questionIds));

            const questionMap = new Map(fetchedQuestions.map((q: any) => [q.id, q]));

            questionDetails = questionIds
                .map((qId) => {
                    const q: any = questionMap.get(qId);
                    if (!q) return null;

                    const studentAns: any = answerMap.get(qId);
                    const parsedContent: any = safeJsonParse(q.content, {});
                    const parsedKey: any = safeJsonParse(q.answerKey, {});
                    let parsedStudentAnswer = studentAns?.answer ? safeJsonParse(studentAns.answer, studentAns.answer) : null;

                    let formattedCorrectAnswer: any = parsedKey;
                    if (formattedCorrectAnswer && typeof formattedCorrectAnswer === 'object' && 'correct' in formattedCorrectAnswer) {
                        formattedCorrectAnswer = formattedCorrectAnswer.correct;
                    }

                    if (q.type === 'mc') {
                        if (typeof formattedCorrectAnswer === 'number') {
                            formattedCorrectAnswer = String.fromCharCode(65 + formattedCorrectAnswer);
                        } else if (typeof formattedCorrectAnswer === 'string' && formattedCorrectAnswer.length === 1 && !isNaN(parseInt(formattedCorrectAnswer))) {
                            formattedCorrectAnswer = String.fromCharCode(65 + parseInt(formattedCorrectAnswer));
                        }

                        // If legacy answer was stored as shuffled letter, map it to original letter
                        if (shuffleAnswers && typeof parsedStudentAnswer === 'string' && parsedStudentAnswer.length === 1) {
                            const options = (parsedContent.options as any[]) || [];
                            if (options.length > 0) {
                                const seed = `${submission.id}-${q.id}-options`;
                                const { mapping } = seededShuffle(options, seed);
                                const letterIdx = parsedStudentAnswer.toUpperCase().charCodeAt(0) - 65;
                                const origIdx = mapping[letterIdx];

                                if (origIdx !== undefined && origIdx >= 0) {
                                    const fixedLetter = String.fromCharCode(65 + origIdx);
                                    if ((studentAns?.isCorrect === false && parsedStudentAnswer === formattedCorrectAnswer) ||
                                        (studentAns?.isCorrect === true && parsedStudentAnswer !== formattedCorrectAnswer)) {
                                        parsedStudentAnswer = fixedLetter;
                                    }
                                }
                            }
                        }
                    } else if (q.type === 'complex_mc' && Array.isArray(formattedCorrectAnswer)) {
                        formattedCorrectAnswer = formattedCorrectAnswer.map((idx: any) =>
                            typeof idx === 'number' ? String.fromCharCode(65 + idx) : idx
                        );
                    } else if (q.type === 'true_false') {
                        const rawVal = typeof formattedCorrectAnswer === 'object' && formattedCorrectAnswer !== null && 'correct' in formattedCorrectAnswer
                            ? formattedCorrectAnswer.correct
                            : formattedCorrectAnswer;
                        if (rawVal === 0 || rawVal === true || rawVal === 'true' || String(rawVal).toLowerCase() === 'benar' || String(rawVal) === '0' || String(rawVal).toUpperCase() === 'A') {
                            formattedCorrectAnswer = "Benar";
                        } else {
                            formattedCorrectAnswer = "Salah";
                        }

                        if (parsedStudentAnswer !== null && parsedStudentAnswer !== undefined) {
                            const normS = String(parsedStudentAnswer).toLowerCase().trim();
                            if (normS === 'true' || normS === 'benar' || normS === '0' || normS === 'a') {
                                parsedStudentAnswer = "Benar";
                            } else if (normS === 'false' || normS === 'salah' || normS === '1' || normS === 'b') {
                                parsedStudentAnswer = "Salah";
                            }
                        }
                    } else if (q.type === 'short' && formattedCorrectAnswer && typeof formattedCorrectAnswer === 'object') {
                        if (Array.isArray(formattedCorrectAnswer.acceptedAnswers)) {
                            formattedCorrectAnswer = formattedCorrectAnswer.acceptedAnswers.join(", ");
                        } else if (typeof formattedCorrectAnswer.acceptedAnswers === 'string') {
                            formattedCorrectAnswer = formattedCorrectAnswer.acceptedAnswers;
                        }
                    }

                    const pointsEarned = studentAns?.partialPoints !== null && studentAns?.partialPoints !== undefined
                        ? studentAns.partialPoints
                        : (studentAns?.score ?? 0);

                    return {
                        id: q.id,
                        type: q.type,
                        questionText: parsedContent.question || "",
                        content: parsedContent,
                        points: studentAns?.maxPoints || q.defaultPoints || 1,
                        studentAnswer: parsedStudentAnswer,
                        isCorrect: studentAns?.isCorrect ?? false,
                        score: pointsEarned,
                        partialPoints: studentAns?.partialPoints ?? null,
                        feedback: studentAns?.feedback || null,
                        correctAnswer: formattedCorrectAnswer,
                        explanation: parsedContent.explanation || (q.metadata as any)?.explanation || null,
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
        const status = err.status || 500;
        if (status >= 500) {
            console.error("Error in exam review API:", err);
        }
        return NextResponse.json(
            { error: err.message || "Gagal memuat review ujian" },
            { status }
        );
    }
}
