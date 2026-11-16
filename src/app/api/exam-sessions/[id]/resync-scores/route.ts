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

// Helper to evaluate Multiple Choice
function evaluateMc(answerKey: any, rawStudentAnswer: any, maxPoints: number) {
    if (maxPoints === 0) return { isCorrect: false, score: 0, partialPoints: 0 };

    let correctVal = answerKey.correct !== undefined ? answerKey.correct : answerKey.correctAnswer;
    if (typeof correctVal === 'object' && correctVal !== null && 'correct' in correctVal) {
        correctVal = correctVal.correct;
    }

    const normalizeLetter = (val: any): string | null => {
        if (val === null || val === undefined) return null;
        if (typeof val === 'number') return String.fromCharCode(65 + val);
        const s = String(val).replace(/["']/g, '').trim().toUpperCase();
        if (s.length === 1 && s >= 'A' && s <= 'Z') return s;
        const n = parseInt(s, 10);
        if (!isNaN(n) && n >= 0 && n <= 25) return String.fromCharCode(65 + n);
        return null;
    };

    const studentLetter = normalizeLetter(rawStudentAnswer);
    const correctLetter = normalizeLetter(correctVal);

    if (studentLetter && correctLetter && studentLetter === correctLetter) {
        return { isCorrect: true, score: maxPoints, partialPoints: maxPoints };
    }
    return { isCorrect: false, score: 0, partialPoints: 0 };
}

// Helper to evaluate True / False
function evaluateTrueFalse(answerKey: any, rawStudentAnswer: any, maxPoints: number) {
    if (maxPoints === 0) return { isCorrect: false, score: 0, partialPoints: 0 };

    let correctVal = answerKey.correct !== undefined ? answerKey.correct : answerKey.correctAnswer;
    if (typeof correctVal === 'object' && correctVal !== null && 'correct' in correctVal) {
        correctVal = correctVal.correct;
    }

    const normalizeTf = (val: any): boolean | null => {
        if (val === null || val === undefined) return null;
        if (typeof val === 'boolean') return val;
        const s = String(val).replace(/["']/g, '').toLowerCase().trim();
        if (s === 'true' || s === 'benar' || s === '0' || s === 'a') return true;
        if (s === 'false' || s === 'salah' || s === '1' || s === 'b') return false;
        return null;
    };

    const studentTf = normalizeTf(rawStudentAnswer);
    const correctTf = normalizeTf(correctVal);

    if (studentTf !== null && correctTf !== null && studentTf === correctTf) {
        return { isCorrect: true, score: maxPoints, partialPoints: maxPoints };
    }
    return { isCorrect: false, score: 0, partialPoints: 0 };
}

// Helper to evaluate Complex Multiple Choice (PG Kompleks)
function evaluateComplexMc(answerKey: any, rawStudentAnswer: any, maxPoints: number) {
    if (maxPoints === 0) return { isCorrect: false, score: 0, partialPoints: 0 };

    // 1. Extract correct keys
    const rawCorrect = answerKey.correct !== undefined
        ? answerKey.correct
        : (answerKey.correctIndices || answerKey.correctAnswers || answerKey.correctOptions || []);

    let correctOrigIndices: number[] = [];
    if (Array.isArray(rawCorrect)) {
        correctOrigIndices = rawCorrect.map((val: any) => {
            if (typeof val === 'number') return val;
            const s = String(val).replace(/["']/g, '').trim().toUpperCase();
            if (s.length === 1 && s >= 'A' && s <= 'Z') {
                return s.charCodeAt(0) - 65;
            }
            const n = parseInt(s, 10);
            if (!isNaN(n)) return n;
            return -1;
        }).filter((idx) => idx >= 0);
    }

    if (correctOrigIndices.length === 0) {
        return { isCorrect: false, score: 0, partialPoints: 0 };
    }

    // 2. Parse student answers
    let studentArray: any[] = [];
    if (Array.isArray(rawStudentAnswer)) {
        studentArray = rawStudentAnswer;
    } else if (typeof rawStudentAnswer === 'string') {
        const parsed = safeJsonParse<any>(rawStudentAnswer, null);
        if (Array.isArray(parsed)) {
            studentArray = parsed;
        } else if (rawStudentAnswer.trim()) {
            studentArray = rawStudentAnswer.split(/[,;\s]+/).filter(Boolean);
        }
    }

    const chosenIndices = studentArray.map((val: any) => {
        if (typeof val === 'number') return val;
        const s = String(val).replace(/["']/g, '').trim().toUpperCase();
        if (s.length === 1 && s >= 'A' && s <= 'Z') {
            return s.charCodeAt(0) - 65;
        }
        const n = parseInt(s, 10);
        if (!isNaN(n)) return n;
        return -1;
    }).filter((idx: number) => idx >= 0);

    const uniqueChosen = Array.from(new Set(chosenIndices));
    const uniqueCorrect = Array.from(new Set(correctOrigIndices));

    const correctCount = uniqueChosen.filter((idx) => uniqueCorrect.includes(idx)).length;
    const incorrectCount = uniqueChosen.length - correctCount;

    let isCorrect = false;
    let earnedPoints = 0;

    if (uniqueCorrect.length > 0 && incorrectCount === 0 && correctCount === uniqueCorrect.length) {
        isCorrect = true;
        earnedPoints = maxPoints;
    } else if (uniqueCorrect.length > 0) {
        earnedPoints = Math.max(0, Math.round((correctCount - incorrectCount) / uniqueCorrect.length * maxPoints * 100) / 100);
        isCorrect = earnedPoints === maxPoints && uniqueCorrect.length > 0;
    }

    return { isCorrect, score: earnedPoints, partialPoints: earnedPoints };
}

// Helper to evaluate Matching (Menjodohkan)
function evaluateMatching(content: any, answerKey: any, rawStudentAnswer: any, maxPoints: number) {
    if (maxPoints === 0) return { isCorrect: false, score: 0, partialPoints: 0 };

    const leftItems = (content.leftItems as any[]) || [];
    const rightItems = (content.rightItems as any[]) || [];

    const leftIdToIndex: Record<string, number> = {};
    const rightIdToIndex: Record<string, number> = {};
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
                correctPairsList.push({ leftIdx: parseInt(leftIdx, 10), rightIdx: rIdx as number });
            });
        });
    }

    const studentPairs = safeJsonParse<any[]>(rawStudentAnswer, Array.isArray(rawStudentAnswer) ? rawStudentAnswer : []);
    let correctCount = 0;
    if (Array.isArray(studentPairs)) {
        const studentPairsIndexed = studentPairs.map((sp: any) => {
            const leftKey = sp.left ?? sp.leftId;
            const rightKey = sp.right ?? sp.rightId;
            const leftIdx = typeof leftKey === 'string' && leftIdToIndex[leftKey] !== undefined
                ? leftIdToIndex[leftKey]
                : (typeof leftKey === 'number' ? leftKey : parseInt(leftKey, 10) || -1);
            const rightIdx = typeof rightKey === 'string' && rightIdToIndex[rightKey] !== undefined
                ? rightIdToIndex[rightKey]
                : (typeof rightKey === 'number' ? rightKey : parseInt(rightKey, 10) || -1);
            return { leftIdx, rightIdx };
        });

        correctCount = studentPairsIndexed.filter((sp: any) =>
            correctPairsList.some((cp: any) => cp.leftIdx === sp.leftIdx && cp.rightIdx === sp.rightIdx)
        ).length;
    }

    const totalPairs = correctPairsList.length;
    const isCorrect = correctCount === totalPairs && totalPairs > 0;
    const score = totalPairs > 0 ? Math.round((correctCount / totalPairs) * maxPoints * 100) / 100 : 0;
    return { isCorrect, score, partialPoints: score };
}

// Helper to evaluate Short Answer (Isian Singkat)
function evaluateShort(answerKey: any, rawStudentAnswer: any, maxPoints: number) {
    if (maxPoints === 0) return { isCorrect: false, score: 0, partialPoints: 0 };

    const acceptedAnswers: string[] = answerKey.acceptedAnswers || [];
    const studentAnswer = (rawStudentAnswer || '').toString().replace(/^["']|["']$/g, '').trim().toLowerCase();
    const isCorrect = acceptedAnswers.some((a) => a.toString().replace(/^["']|["']$/g, '').trim().toLowerCase() === studentAnswer);
    const score = isCorrect ? maxPoints : 0;
    return { isCorrect, score, partialPoints: score };
}

// POST /api/exam-sessions/[id]/resync-scores - Recalculate & sync student scores with latest question bank points & answer keys
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
                const parsedContent = safeJsonParse<Record<string, any>>(q.content, q.content || {});
                const parsedAnswerKey = safeJsonParse<Record<string, any>>(q.answerKey, q.answerKey || {});

                let newScore = 0;
                let newPartialPoints = 0;
                let newIsCorrect = false;

                if (newMaxPoints === 0) {
                    newScore = 0;
                    newPartialPoints = 0;
                    // Still evaluate correctness for analytics/review display
                    if (q.type === 'complex_mc') {
                        newIsCorrect = evaluateComplexMc(parsedAnswerKey, ans.studentAnswer, 1).isCorrect;
                    } else if (q.type === 'mc') {
                        newIsCorrect = evaluateMc(parsedAnswerKey, ans.studentAnswer, 1).isCorrect;
                    } else if (q.type === 'true_false') {
                        newIsCorrect = evaluateTrueFalse(parsedAnswerKey, ans.studentAnswer, 1).isCorrect;
                    } else if (q.type === 'matching') {
                        newIsCorrect = evaluateMatching(parsedContent, parsedAnswerKey, ans.studentAnswer, 1).isCorrect;
                    } else if (q.type === 'short') {
                        newIsCorrect = evaluateShort(parsedAnswerKey, ans.studentAnswer, 1).isCorrect;
                    } else {
                        newIsCorrect = false;
                    }
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
                        newIsCorrect = newScore === newMaxPoints;
                    } else {
                        hasPendingEssays = true;
                        newScore = 0;
                        newPartialPoints = 0;
                        newIsCorrect = false;
                    }
                } else if (q.type === 'complex_mc') {
                    const evalResult = evaluateComplexMc(parsedAnswerKey, ans.studentAnswer, newMaxPoints);
                    newScore = evalResult.score;
                    newPartialPoints = evalResult.partialPoints;
                    newIsCorrect = evalResult.isCorrect;
                } else if (q.type === 'mc') {
                    const evalResult = evaluateMc(parsedAnswerKey, ans.studentAnswer, newMaxPoints);
                    newScore = evalResult.score;
                    newPartialPoints = evalResult.partialPoints;
                    newIsCorrect = evalResult.isCorrect;
                } else if (q.type === 'true_false') {
                    const evalResult = evaluateTrueFalse(parsedAnswerKey, ans.studentAnswer, newMaxPoints);
                    newScore = evalResult.score;
                    newPartialPoints = evalResult.partialPoints;
                    newIsCorrect = evalResult.isCorrect;
                } else if (q.type === 'matching') {
                    const evalResult = evaluateMatching(parsedContent, parsedAnswerKey, ans.studentAnswer, newMaxPoints);
                    newScore = evalResult.score;
                    newPartialPoints = evalResult.partialPoints;
                    newIsCorrect = evalResult.isCorrect;
                } else if (q.type === 'short') {
                    const evalResult = evaluateShort(parsedAnswerKey, ans.studentAnswer, newMaxPoints);
                    newScore = evalResult.score;
                    newPartialPoints = evalResult.partialPoints;
                    newIsCorrect = evalResult.isCorrect;
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
