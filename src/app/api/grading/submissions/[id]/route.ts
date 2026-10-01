import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, answers, bankQuestions, users, examSessions, examTemplates } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { safeJsonParse } from "@/lib/json-utils";
import { seededShuffle } from "@/lib/randomization";

// GET /api/grading/submissions/[id] - Get submission details for grading
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth(["admin", "teacher"]);
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

        // Check if session has answer randomization enabled
        let shuffleAnswers = false;
        if (submission.sessionId) {
            const sessionData = await db.select({ templateId: examSessions.templateId })
                .from(examSessions)
                .where(eq(examSessions.id, submission.sessionId))
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
        }

        // 1. Get ordered question IDs
        const questionIds: string[] = safeJsonParse<string[]>(submission.questionOrder, []);

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

        let hasScoreUpdates = false;

        // 4. Map questions to answers (combining them)
        const combinedAnswers = questionIds.map(qId => {
            const question = assignedQuestions.find((q: typeof assignedQuestions[0]) => q.id === qId);
            const answer = existingAnswers.find((a: typeof existingAnswers[0]) => a.bankQuestionId === qId || a.questionId === qId);

            if (!question) return null; // Should not happen if integrity is maintained

            // Parse question content & key
            const parsedContent = safeJsonParse<Record<string, unknown>>(question.content, {});
            const parsedAnswerKey = safeJsonParse<Record<string, unknown>>(question.answerKey, {});

            // Parse student answer
            let parsedStudentAnswer = answer?.studentAnswer ? safeJsonParse<unknown>(answer.studentAnswer, answer.studentAnswer) : null;

            // Improve correct answer format for frontend
            let correctAnswer: any = parsedAnswerKey;
            if (correctAnswer && typeof correctAnswer === 'object' && 'correct' in correctAnswer) {
                correctAnswer = correctAnswer.correct;
            }
            if (question.type === 'mc') {
                if (typeof correctAnswer === 'number') {
                    correctAnswer = String.fromCharCode(65 + correctAnswer);
                } else if (typeof correctAnswer === 'string' && correctAnswer.length === 1 && !isNaN(parseInt(correctAnswer))) {
                    correctAnswer = String.fromCharCode(65 + parseInt(correctAnswer));
                }

                // If legacy student answer was stored as shuffled letter, map it to the original option letter
                if (shuffleAnswers && typeof parsedStudentAnswer === 'string' && parsedStudentAnswer.length === 1) {
                    const options = (parsedContent.options as any[]) || [];
                    if (options.length > 0) {
                        const seed = `${submission.id}-${question.id}-options`;
                        const { mapping } = seededShuffle(options, seed);
                        const letterIdx = parsedStudentAnswer.toUpperCase().charCodeAt(0) - 65;
                        const origIdx = mapping[letterIdx];

                        if (origIdx !== undefined && origIdx >= 0) {
                            const fixedLetter = String.fromCharCode(65 + origIdx);
                            const isCorrectInDB = Boolean(answer?.isCorrect);
                            if ((!isCorrectInDB && parsedStudentAnswer === correctAnswer && fixedLetter !== correctAnswer) ||
                                (isCorrectInDB && parsedStudentAnswer !== correctAnswer && fixedLetter === correctAnswer)) {
                                parsedStudentAnswer = fixedLetter;
                                if (answer?.id) {
                                    db.update(answers).set({ studentAnswer: fixedLetter }).where(eq(answers.id, answer.id)).catch(() => {});
                                }
                            }
                        }
                    }
                }
            } else if (question.type === 'complex_mc') {
                if (Array.isArray(correctAnswer)) {
                    correctAnswer = correctAnswer.map((idx: any) =>
                        typeof idx === 'number' ? String.fromCharCode(65 + idx) : idx
                    );
                }

                // If legacy complex_mc student answer was stored as shuffled letters, map it
                if (shuffleAnswers && Array.isArray(parsedStudentAnswer) && parsedStudentAnswer.length > 0) {
                    const options = (parsedContent.options as any[]) || [];
                    if (options.length > 0) {
                        const seed = `${submission.id}-${question.id}-options`;
                        const { mapping } = seededShuffle(options, seed);
                        const fixedLetters = parsedStudentAnswer.map((l: any) => {
                            if (typeof l === 'string' && l.length === 1) {
                                const idx = l.toUpperCase().charCodeAt(0) - 65;
                                return mapping[idx] !== undefined ? String.fromCharCode(65 + mapping[idx]) : l;
                            }
                            return l;
                        }).sort();

                        const isCorrectInDB = Boolean(answer?.isCorrect);
                        const correctLetters = (Array.isArray(correctAnswer) ? correctAnswer : []).sort();
                        const fixedMatches = JSON.stringify(fixedLetters) === JSON.stringify(correctLetters);
                        const rawMatches = JSON.stringify([...parsedStudentAnswer].sort()) === JSON.stringify(correctLetters);

                        if ((isCorrectInDB && !rawMatches && fixedMatches) || (!isCorrectInDB && rawMatches && !fixedMatches)) {
                            parsedStudentAnswer = fixedLetters;
                            if (answer?.id) {
                                db.update(answers).set({ studentAnswer: JSON.stringify(fixedLetters) }).where(eq(answers.id, answer.id)).catch(() => {});
                            }
                        }
                    }
                }
            } else if (question.type === 'true_false') {
                const rawVal = typeof correctAnswer === 'object' && correctAnswer !== null && 'correct' in correctAnswer
                    ? correctAnswer.correct
                    : correctAnswer;
                if (rawVal === 0 || rawVal === true || rawVal === 'true' || String(rawVal).toLowerCase() === 'benar' || String(rawVal) === '0' || String(rawVal).toUpperCase() === 'A') {
                    correctAnswer = "Benar";
                } else {
                    correctAnswer = "Salah";
                }

                if (parsedStudentAnswer !== null && parsedStudentAnswer !== undefined) {
                    const normS = String(parsedStudentAnswer).toLowerCase().trim();
                    if (normS === 'true' || normS === 'benar' || normS === '0' || normS === 'a') {
                        parsedStudentAnswer = "Benar";
                    } else if (normS === 'false' || normS === 'salah' || normS === '1' || normS === 'b') {
                        parsedStudentAnswer = "Salah";
                    }
                }
            } else if (question.type === 'short' && correctAnswer && typeof correctAnswer === 'object') {
                if (Array.isArray(correctAnswer.acceptedAnswers)) {
                    correctAnswer = correctAnswer.acceptedAnswers.join(", ");
                } else if (typeof correctAnswer.acceptedAnswers === 'string') {
                    correctAnswer = correctAnswer.acceptedAnswers;
                }
            }

            let currentScore = answer?.score !== null && answer?.score !== undefined ? Number(answer.score) : 0;
            let currentPartialPoints = answer?.partialPoints !== null && answer?.partialPoints !== undefined ? Number(answer.partialPoints) : currentScore;
            let currentIsCorrect = Boolean(answer?.isCorrect);

            // Recalculate matching score if affected by legacy shuffle bug
            if (question.type === 'matching' && answer) {
                const leftItems = (parsedContent.leftItems as any[]) || [];
                const rightItems = (parsedContent.rightItems as any[]) || [];

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
                if (parsedAnswerKey.matches && Array.isArray(parsedAnswerKey.matches)) {
                    parsedAnswerKey.matches.forEach((match: any) => {
                        const leftIdx = leftIdToIndex[match.leftId];
                        const rightIdx = rightIdToIndex[match.rightId];
                        if (leftIdx !== undefined && rightIdx !== undefined) {
                            correctPairsList.push({ leftIdx, rightIdx });
                        }
                    });
                } else if (parsedAnswerKey.pairs) {
                    Object.entries(parsedAnswerKey.pairs).forEach(([leftIdx, rightValue]) => {
                        const rightIndices = Array.isArray(rightValue) ? rightValue : [rightValue];
                        rightIndices.forEach((rIdx: any) => {
                            correctPairsList.push({ leftIdx: parseInt(leftIdx), rightIdx: rIdx as number });
                        });
                    });
                }

                const studentPairs = parsedStudentAnswer || [];
                let correctCount = 0;
                if (Array.isArray(studentPairs)) {
                    const studentPairsIndexed = studentPairs.map((sp: any) => {
                        const leftKey = sp.left ?? sp.leftId;
                        const rightKey = sp.right ?? sp.rightId;
                        const leftIdx = typeof leftKey === 'string' && leftIdToIndex[leftKey] !== undefined
                            ? leftIdToIndex[leftKey]
                            : (typeof leftKey === 'number' ? leftKey : parseInt(leftKey) || -1);
                        const rightIdx = typeof rightKey === 'string' && rightIdToIndex[rightKey] !== undefined
                            ? rightIdToIndex[rightKey]
                            : (typeof rightKey === 'number' ? rightKey : parseInt(rightKey) || -1);
                        return { leftIdx, rightIdx };
                    });

                    correctCount = studentPairsIndexed.filter((sp: any) =>
                        correctPairsList.some((cp: any) => cp.leftIdx === sp.leftIdx && cp.rightIdx === sp.rightIdx)
                    ).length;
                }

                const totalPairs = correctPairsList.length;
                const maxPoints = question.defaultPoints || 1;
                const recalculatedPoints = totalPairs > 0 ? Math.round((correctCount / totalPairs) * maxPoints * 100) / 100 : 0;
                const recalculatedIsCorrect = correctCount === totalPairs && totalPairs > 0;

                if (recalculatedPoints !== currentScore || recalculatedIsCorrect !== currentIsCorrect) {
                    currentScore = recalculatedPoints;
                    currentPartialPoints = recalculatedPoints;
                    currentIsCorrect = recalculatedIsCorrect;
                    hasScoreUpdates = true;
                    db.update(answers).set({
                        score: recalculatedPoints,
                        partialPoints: recalculatedPoints,
                        isCorrect: recalculatedIsCorrect ? (1 as any) : (0 as any)
                    }).where(eq(answers.id, answer.id)).catch(() => {});
                }
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
                isCorrect: currentIsCorrect,
                score: currentScore,
                maxPoints: answer?.maxPoints || question.defaultPoints,
                partialPoints: currentPartialPoints,
                gradingStatus: answer?.gradingStatus || (answer ? "auto" : "not_answered"),
                gradingNotes: answer?.gradingNotes || null,
                defaultPoints: question.defaultPoints,
            };
        }).filter(Boolean);

        if (hasScoreUpdates) {
            const updatedTotalEarned = combinedAnswers.reduce((sum, a: any) => sum + (a.partialPoints || 0), 0);
            const totalMax = submission.totalPoints || 1;
            const recalculatedScore = Math.round((updatedTotalEarned / totalMax) * 100);
            submission.earnedPoints = updatedTotalEarned;
            submission.score = recalculatedScore;
            db.update(submissions).set({
                earnedPoints: updatedTotalEarned,
                score: recalculatedScore
            }).where(eq(submissions.id, submission.id)).catch(() => {});
        }


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
        await requireAuth(["admin", "teacher"]);
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
        const questionIds: string[] = safeJsonParse<string[]>(submission?.questionOrder, []);

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
