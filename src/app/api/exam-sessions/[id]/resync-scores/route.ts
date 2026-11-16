import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    examSessions,
    submissions,
    answers,
    bankQuestions,
} from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { safeJsonParse } from "@/lib/json-utils";
import { logActivity } from "@/lib/activity-logger";

// POST /api/exam-sessions/[id]/resync-scores - Recalculate & sync student scores with latest question bank points
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(["admin", "teacher"]);

        // 1. Get session info
        const sessionResult = await db.select({
            id: examSessions.id,
            sessionName: examSessions.sessionName,
            status: examSessions.status,
            createdBy: examSessions.createdBy,
        })
            .from(examSessions)
            .where(eq(examSessions.id, params.id))
            .limit(1);

        if (sessionResult.length === 0) {
            return NextResponse.json(
                { error: "Sesi ujian tidak ditemukan" },
                { status: 404 }
            );
        }

        const session = sessionResult[0];

        if (user.role === "teacher" && session.createdBy !== user.id) {
            return NextResponse.json(
                { error: "Akses ditolak. Anda hanya dapat menyinkronkan skor sesi ujian yang Anda buat sendiri." },
                { status: 403 }
            );
        }

        // 2. Get all submissions for this session
        const subList = await db.select({
            id: submissions.id,
            userId: submissions.userId,
            status: submissions.status,
            questionOrder: submissions.questionOrder,
            gradingStatus: submissions.gradingStatus,
        })
            .from(submissions)
            .where(eq(submissions.sessionId, params.id));

        if (subList.length === 0) {
            return NextResponse.json({
                success: true,
                message: "Tidak ada data pengerjaan siswa yang perlu disinkronkan.",
                updatedSubmissions: 0,
                updatedAnswers: 0,
            });
        }

        const submissionIds = subList.map((s: typeof subList[0]) => s.id);

        // 3. Fetch all existing answers for all submissions in this session
        const allAnswers = await db.select({
            id: answers.id,
            submissionId: answers.submissionId,
            bankQuestionId: answers.bankQuestionId,
            questionId: answers.questionId,
            studentAnswer: answers.studentAnswer,
            isCorrect: answers.isCorrect,
            score: answers.score,
            partialPoints: answers.partialPoints,
            maxPoints: answers.maxPoints,
            gradingStatus: answers.gradingStatus,
        })
            .from(answers)
            .where(inArray(answers.submissionId, submissionIds));

        // 4. Collect all distinct question IDs across submissions & answers
        const questionIdSet = new Set<string>();
        for (const sub of subList) {
            const qIds: string[] = safeJsonParse<string[]>(sub.questionOrder, []);
            qIds.forEach((id) => questionIdSet.add(id));
        }
        for (const ans of allAnswers) {
            const qId = ans.bankQuestionId || ans.questionId;
            if (qId) questionIdSet.add(qId);
        }

        const allQuestionIds = Array.from(questionIdSet);
        if (allQuestionIds.length === 0) {
            return NextResponse.json({
                success: true,
                message: "Tidak ada soal yang ditemukan untuk disinkronkan.",
                updatedSubmissions: 0,
                updatedAnswers: 0,
            });
        }

        // 5. Fetch fresh data from bank_questions
        const fetchedQuestions = await db.select({
            id: bankQuestions.id,
            type: bankQuestions.type,
            content: bankQuestions.content,
            answerKey: bankQuestions.answerKey,
            defaultPoints: bankQuestions.defaultPoints,
        })
            .from(bankQuestions)
            .where(inArray(bankQuestions.id, allQuestionIds));

        const questionMap = new Map<string, typeof fetchedQuestions[0]>();
        for (const q of fetchedQuestions) {
            questionMap.set(q.id, q);
        }

        // Group answers by submissionId
        const answersBySubmission = new Map<string, typeof allAnswers>();
        for (const ans of allAnswers) {
            const list = answersBySubmission.get(ans.submissionId) || [];
            list.push(ans);
            answersBySubmission.set(ans.submissionId, list);
        }

        let updatedAnswersCount = 0;

        // 6. Recalculate each submission
        for (const sub of subList) {
            const assignedQIds: string[] = safeJsonParse<string[]>(sub.questionOrder, []);
            const subAnswers = answersBySubmission.get(sub.id) || [];

            // If assignedQIds is empty, use questions found in answers
            const effectiveQIds = assignedQIds.length > 0
                ? assignedQIds
                : Array.from(new Set(subAnswers.map((a: any) => a.bankQuestionId || a.questionId).filter(Boolean) as string[]));

            // Calculate totalMax from fresh defaultPoints
            let totalMax = 0;
            for (const qId of effectiveQIds) {
                const q = questionMap.get(qId);
                if (q) {
                    totalMax += (q.defaultPoints ?? 0);
                }
            }

            let totalEarned = 0;
            let hasPendingEssays = false;

            for (const ans of subAnswers) {
                const qId = ans.bankQuestionId || ans.questionId;
                const q = qId ? questionMap.get(qId) : null;
                if (!q) {
                    totalEarned += (ans.partialPoints ?? ans.score ?? 0);
                    continue;
                }

                const newMaxPoints = q.defaultPoints ?? 0;
                let newScore = 0;
                let newPartialPoints = 0;
                let newIsCorrect = Boolean(ans.isCorrect);

                if (newMaxPoints === 0) {
                    newScore = 0;
                    newPartialPoints = 0;
                } else if (q.type === 'essay') {
                    if (ans.gradingStatus === 'manual') {
                        // Preserve manual grade. If old max was > 0, scale proportionally
                        const oldMax = ans.maxPoints ?? 0;
                        if (oldMax > 0) {
                            const ratio = Math.min(1, Math.max(0, (ans.partialPoints ?? ans.score ?? 0) / oldMax));
                            newPartialPoints = Math.round(ratio * newMaxPoints * 100) / 100;
                        } else {
                            newPartialPoints = Math.min(newMaxPoints, ans.partialPoints ?? ans.score ?? 0);
                        }
                        newScore = newPartialPoints;
                    } else {
                        hasPendingEssays = true;
                        newScore = 0;
                        newPartialPoints = 0;
                    }
                } else if (q.type === 'short') {
                    // Check student answer against current acceptedAnswers
                    const answerKey = safeJsonParse<Record<string, any>>(q.answerKey, {});
                    const acceptedAnswers: string[] = answerKey.acceptedAnswers || [];
                    const studentAnswer = (ans.studentAnswer || '').toString().trim().toLowerCase();
                    const isCorrect = acceptedAnswers.some((a) => a.trim().toLowerCase() === studentAnswer);
                    newIsCorrect = isCorrect;
                    newScore = isCorrect ? newMaxPoints : 0;
                    newPartialPoints = newScore;
                } else if (q.type === 'complex_mc' || q.type === 'matching') {
                    const oldMax = ans.maxPoints ?? 0;
                    if (ans.isCorrect) {
                        newScore = newMaxPoints;
                        newPartialPoints = newMaxPoints;
                    } else if (oldMax > 0) {
                        const ratio = Math.max(0, Math.min(1, (ans.partialPoints ?? ans.score ?? 0) / oldMax));
                        newScore = Math.round(ratio * newMaxPoints * 100) / 100;
                        newPartialPoints = newScore;
                    } else {
                        newScore = 0;
                        newPartialPoints = 0;
                    }
                } else {
                    // mc, true_false
                    newScore = ans.isCorrect ? newMaxPoints : 0;
                    newPartialPoints = newScore;
                }

                totalEarned += newPartialPoints;

                // Update answer row if values changed
                const isCorrectChanged = Boolean(ans.isCorrect) !== newIsCorrect;
                const scoreChanged = ans.score !== newScore;
                const partialChanged = ans.partialPoints !== newPartialPoints;
                const maxChanged = ans.maxPoints !== newMaxPoints;

                if (isCorrectChanged || scoreChanged || partialChanged || maxChanged) {
                    await db.update(answers).set({
                        maxPoints: newMaxPoints,
                        score: newScore,
                        partialPoints: newPartialPoints,
                        isCorrect: newIsCorrect,
                    }).where(eq(answers.id, ans.id));
                    updatedAnswersCount++;
                }
            }

            const finalScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
            const newGradingStatus = hasPendingEssays ? 'pending_manual' : 'completed';

            await db.update(submissions).set({
                totalPoints: totalMax,
                earnedPoints: totalEarned,
                score: finalScore,
                gradingStatus: newGradingStatus as any,
            }).where(eq(submissions.id, sub.id));
        }

        // Log activity
        await logActivity({
            userId: user.id,
            action: "RESYNC_EXAM_SCORES",
            entityType: "EXAM_SESSION",
            entityId: params.id,
            details: {
                sessionName: session.sessionName,
                updatedSubmissionsCount: subList.length,
                updatedAnswersCount,
            },
        });

        return NextResponse.json({
            success: true,
            message: `Skor berhasil disinkronkan untuk ${subList.length} siswa (${updatedAnswersCount} butir jawaban diperbarui).`,
            updatedSubmissions: subList.length,
            updatedAnswers: updatedAnswersCount,
        });

    } catch (error: any) {
        console.error("Error resyncing exam scores:", error);
        return NextResponse.json(
            { error: error.message || "Gagal menyinkronkan skor" },
            { status: 500 }
        );
    }
}
