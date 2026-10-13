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
import { eq, inArray } from "drizzle-orm";
import * as XLSX from 'xlsx';
import { safeJsonParse } from "@/lib/json-utils";

import { requireAuth } from "@/lib/auth-guard";

// GET /api/exam-sessions/[id]/export - Export exam results to Excel
export async function GET(
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
            startTime: examSessions.startTime,
            endTime: examSessions.endTime,
            templateName: examTemplates.name,
            totalScore: examTemplates.totalScore,
            createdBy: examSessions.createdBy,
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

        if (user.role === "teacher" && session.createdBy !== user.id) {
            return NextResponse.json(
                { error: "Akses ditolak. Anda hanya dapat mengekspor hasil sesi ujian yang Anda buat sendiri." },
                { status: 403 }
            );
        }

        // 2. Get all submissions for this session
        const rawSubmissionsData = await db.select({
            submissionId: submissions.id,
            userId: submissions.userId,
            studentName: users.name,
            status: submissions.status,
            score: submissions.score,
            earnedPoints: submissions.earnedPoints,
            totalPoints: submissions.totalPoints,
            endTime: submissions.endTime,
            className: classes.name,
            classGrade: classes.grade,
        })
            .from(submissions)
            .innerJoin(users, eq(submissions.userId, users.id))
            .leftJoin(classStudents, eq(users.id, classStudents.studentId))
            .leftJoin(classes, eq(classStudents.classId, classes.id))
            .where(eq(submissions.sessionId, params.id));

        // Deduplicate submissions by userId (prefer completed, highest score, latest submission)
        const userMap = new Map<string, typeof rawSubmissionsData[0]>();
        for (const sub of rawSubmissionsData) {
            const existing = userMap.get(sub.userId);
            if (!existing) {
                userMap.set(sub.userId, sub);
                continue;
            }
            const isCompleted = sub.status === 'completed';
            const existingCompleted = existing.status === 'completed';
            if (isCompleted && !existingCompleted) {
                userMap.set(sub.userId, sub);
            } else if (isCompleted && existingCompleted) {
                if ((sub.score ?? 0) > (existing.score ?? 0)) {
                    userMap.set(sub.userId, sub);
                }
            } else if (!isCompleted && !existingCompleted) {
                if (sub.endTime && existing.endTime && new Date(sub.endTime) > new Date(existing.endTime)) {
                    userMap.set(sub.userId, sub);
                }
            }
        }

        // Sort by className first, then by studentName (natural sort)
        const submissionsData = Array.from(userMap.values()).sort((a, b) => {
            const classA = a.className || '';
            const classB = b.className || '';
            const classCompare = classA.localeCompare(classB, 'id', { numeric: true });
            if (classCompare !== 0) return classCompare;
            return (a.studentName || '').localeCompare(b.studentName || '', 'id');
        });

        // 3. Get all answers for these submissions
        const submissionIds = submissionsData.map((s: typeof submissionsData[0]) => s.submissionId);
        let answersData: any[] = [];

        if (submissionIds.length > 0) {
            answersData = await db.select({
                answerId: answers.id,
                submissionId: answers.submissionId,
                bankQuestionId: answers.bankQuestionId,
                questionId: answers.questionId,
                questionType: bankQuestions.type,
                questionContent: bankQuestions.content,
                studentAnswer: answers.studentAnswer,
                isCorrect: answers.isCorrect,
                score: answers.score,
                maxPoints: answers.maxPoints,
                partialPoints: answers.partialPoints,
                gradingStatus: answers.gradingStatus,
            })
                .from(answers)
                .leftJoin(bankQuestions, eq(answers.bankQuestionId, bankQuestions.id))
                .where(inArray(answers.submissionId, submissionIds));
        }

        // 4. Build Excel workbook
        const workbook = XLSX.utils.book_new();

        // === Sheet 1: Rekap Nilai ===
        const rekapData = submissionsData.map((sub: typeof submissionsData[0], idx: number) => {
            const rawStudentAnswers = answersData.filter((a: typeof answersData[0]) => a.submissionId === sub.submissionId);

            // Deduplicate answers by questionId / bankQuestionId (in case autosave created duplicate rows)
            const answersMap = new Map<string, typeof rawStudentAnswers[0]>();
            for (const a of rawStudentAnswers) {
                const qKey = a.bankQuestionId || a.questionId || a.answerId;
                const prev = answersMap.get(qKey);
                if (!prev || (a.partialPoints || a.score || 0) >= (prev.partialPoints || prev.score || 0)) {
                    answersMap.set(qKey, a);
                }
            }
            const studentAnswers = Array.from(answersMap.values());

            // Calculate scores by type
            const scores: Record<string, { correct: number; total: number; score: number; maxScore: number }> = {
                mc: { correct: 0, total: 0, score: 0, maxScore: 0 },
                complex_mc: { correct: 0, total: 0, score: 0, maxScore: 0 },
                matching: { correct: 0, total: 0, score: 0, maxScore: 0 },
                short: { correct: 0, total: 0, score: 0, maxScore: 0 },
                essay: { correct: 0, total: 0, score: 0, maxScore: 0 },
                true_false: { correct: 0, total: 0, score: 0, maxScore: 0 },
            };

            studentAnswers.forEach(ans => {
                const type = ans.questionType || 'mc';
                if (scores[type]) {
                    scores[type].total++;
                    scores[type].score += (ans.partialPoints || ans.score || 0);
                    scores[type].maxScore += (ans.maxPoints || 0);
                    if (ans.isCorrect) scores[type].correct++;
                }
            });

            // Calculate Non-Essay and Essay totals
            const nonEssayScore = scores.mc.score + scores.complex_mc.score + scores.matching.score + scores.short.score + scores.true_false.score;
            const essayScore = scores.essay.score;
            const essayMax = scores.essay.maxScore;

            // Total points: student's assigned totalPoints, or fallback to session/calculated
            const calculatedNonEssayMax = scores.mc.maxScore + scores.complex_mc.maxScore + scores.matching.maxScore + scores.short.maxScore + scores.true_false.maxScore;
            const totalPoints = sub.totalPoints || (calculatedNonEssayMax + essayMax) || session.totalScore || 100;
            // Full ceiling for non-essay questions
            const nonEssayMax = sub.totalPoints ? Math.max(sub.totalPoints - essayMax, 0) : calculatedNonEssayMax;

            // Earned points: calculated directly from answers so it's always consistent with nonEssayScore + essayScore
            const earnedPoints = nonEssayScore + essayScore;
            const percentageScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

            const statusText = sub.status === 'completed'
                ? 'Selesai'
                : sub.status === 'in_progress'
                    ? 'Mengerjakan'
                    : sub.status === 'terminated'
                        ? 'Dihentikan'
                        : 'Belum Mulai';

            return {
                'No': idx + 1,
                'Nama Siswa': sub.studentName,
                'Kelas': sub.className || '-',
                'Status': statusText,
                'PG Benar': scores.mc.correct,
                'PG Skor': scores.mc.score,
                'Kompleks Benar': scores.complex_mc.correct,
                'Kompleks Skor': scores.complex_mc.score,
                'Menjodohkan Skor': scores.matching.score,
                'Isian Skor': scores.short.score,
                'B/S Benar': scores.true_false.correct,
                'B/S Skor': scores.true_false.score,
                'Non-Essay Skor': nonEssayScore,
                'Non-Essay Max': nonEssayMax,
                'Essay Skor': essayScore,
                'Essay Max': essayMax,
                'Poin Diperoleh': earnedPoints,
                'Total Poin': totalPoints,
                'Nilai (%)': percentageScore,
                'Nilai Non-Essay (%)': nonEssayMax > 0 ? Math.round((nonEssayScore / nonEssayMax) * 100) : '-',
            };
        });

        const ws1 = XLSX.utils.json_to_sheet(rekapData);
        ws1['!cols'] = [
            { wch: 5 },  // No
            { wch: 25 }, // Nama Siswa
            { wch: 15 }, // Kelas
            { wch: 14 }, // Status
            { wch: 10 }, // PG Benar
            { wch: 10 }, // PG Skor
            { wch: 14 }, // Kompleks Benar
            { wch: 14 }, // Kompleks Skor
            { wch: 15 }, // Menjodohkan Skor
            { wch: 10 }, // Isian Skor
            { wch: 10 }, // B/S Benar
            { wch: 10 }, // B/S Skor
            { wch: 14 }, // Non-Essay Skor
            { wch: 14 }, // Non-Essay Max
            { wch: 12 }, // Essay Skor
            { wch: 12 }, // Essay Max
            { wch: 16 }, // Poin Diperoleh
            { wch: 12 }, // Total Poin
            { wch: 10 }, // Nilai (%)
            { wch: 20 }, // Nilai Non-Essay (%)
        ];
        XLSX.utils.book_append_sheet(workbook, ws1, 'Rekap Nilai');

        // === Sheet 2: Essay (if any) ===
        const essayData: any[] = [];
        submissionsData.forEach((sub: typeof submissionsData[0]) => {
            const studentAnswers = answersData.filter((a: typeof answersData[0]) => a.submissionId === sub.submissionId && a.questionType === 'essay');
            studentAnswers.forEach((ans: typeof answersData[0], idx: number) => {
                const content = safeJsonParse<Record<string, string>>(ans.questionContent, {});
                const questionText = content?.question || content?.questionText || '';
                const studentAns = typeof ans.studentAnswer === 'string' ? ans.studentAnswer : (ans.studentAnswer?.text || JSON.stringify(ans.studentAnswer));

                essayData.push({
                    'Nama Siswa': sub.studentName,
                    'Kelas': sub.className || '-',
                    'Soal No': idx + 1,
                    'Pertanyaan': questionText.replace(/<[^>]*>/g, '').substring(0, 200),
                    'Jawaban Siswa': studentAns?.replace(/<[^>]*>/g, '') || '(Tidak dijawab)',
                    'Skor': ans.partialPoints || ans.score || 0,
                    'Skor Max': ans.maxPoints || 0,
                    'Status Koreksi': ans.gradingStatus === 'completed' ? 'Selesai' : 'Perlu Koreksi',
                });
            });
        });

        if (essayData.length > 0) {
            const ws2 = XLSX.utils.json_to_sheet(essayData);
            ws2['!cols'] = [
                { wch: 25 }, { wch: 15 }, { wch: 8 }, { wch: 50 },
                { wch: 50 }, { wch: 8 }, { wch: 10 }, { wch: 15 },
            ];
            XLSX.utils.book_append_sheet(workbook, ws2, 'Jawaban Essay');
        }

        // === Sheet 3: Statistik ===
        const completedResults = submissionsData.filter((r: typeof submissionsData[0]) => r.status === 'completed');
        // Use percentage scores (matching web UI) instead of raw earnedPoints
        const scores = completedResults.map((r: typeof completedResults[0]) => {
            const tp = r.totalPoints || session.totalScore || 100;
            const ep = r.earnedPoints || 0;
            return r.score || (tp > 0 ? Math.round((ep / tp) * 100) : 0);
        });
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length * 10) / 10 : 0;

        const statsData = [
            { 'Informasi Ujian': 'Nama Sesi', 'Nilai': session.sessionName },
            { 'Informasi Ujian': 'Template', 'Nilai': session.templateName },
            { 'Informasi Ujian': 'Status', 'Nilai': session.status },
            { 'Informasi Ujian': '', 'Nilai': '' },
            { 'Informasi Ujian': 'Total Peserta', 'Nilai': submissionsData.length },
            { 'Informasi Ujian': 'Selesai Mengerjakan', 'Nilai': completedResults.length },
            { 'Informasi Ujian': 'Tingkat Penyelesaian', 'Nilai': `${submissionsData.length > 0 ? Math.round((completedResults.length / submissionsData.length) * 100) : 0}%` },
            { 'Informasi Ujian': '', 'Nilai': '' },
            { 'Informasi Ujian': 'Rata-rata Nilai', 'Nilai': avgScore },
            { 'Informasi Ujian': 'Nilai Tertinggi', 'Nilai': scores.length > 0 ? Math.max(...scores) : 0 },
            { 'Informasi Ujian': 'Nilai Terendah', 'Nilai': scores.length > 0 ? Math.min(...scores) : 0 },
            { 'Informasi Ujian': '', 'Nilai': '' },
            { 'Informasi Ujian': 'Tanggal Export', 'Nilai': new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }) },
        ];

        const ws3 = XLSX.utils.json_to_sheet(statsData);
        ws3['!cols'] = [{ wch: 25 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(workbook, ws3, 'Statistik');

        // 5. Generate buffer and return as download
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const filename = `Hasil_${session.sessionName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error("Error exporting exam results:", error);
        return NextResponse.json(
            { error: "Failed to export exam results" },
            { status: 500 }
        );
    }
}
