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

// GET /api/exam-sessions/[id]/export - Export exam results to Excel
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Get session info
        const sessionResult = await db.select({
            id: examSessions.id,
            sessionName: examSessions.sessionName,
            status: examSessions.status,
            startTime: examSessions.startTime,
            endTime: examSessions.endTime,
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

        // 2. Get all submissions for this session
        const submissionsData = await db.select({
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

        // 3. Get all answers for these submissions
        const submissionIds = submissionsData.map(s => s.submissionId);
        let answersData: any[] = [];

        if (submissionIds.length > 0) {
            answersData = await db.select({
                submissionId: answers.submissionId,
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
        const rekapData = submissionsData.map((sub, idx) => {
            const studentAnswers = answersData.filter(a => a.submissionId === sub.submissionId);

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

            return {
                'No': idx + 1,
                'Nama Siswa': sub.studentName,
                'Kelas': sub.className || '-',
                'Status': sub.status === 'completed' ? 'Selesai' : sub.status === 'in_progress' ? 'Mengerjakan' : 'Belum Mulai',
                'PG Benar': scores.mc.correct,
                'PG Skor': scores.mc.score,
                'Kompleks Benar': scores.complex_mc.correct,
                'Kompleks Skor': scores.complex_mc.score,
                'Menjodohkan Skor': scores.matching.score,
                'Isian Skor': scores.short.score,
                'B/S Benar': scores.true_false.correct,
                'B/S Skor': scores.true_false.score,
                'Essay Skor': scores.essay.score,
                'Total Skor': sub.earnedPoints || sub.score || 0,
                'Skor Maksimal': sub.totalPoints || session.totalScore || 100,
                'Nilai (%)': sub.totalPoints ? Math.round(((sub.earnedPoints || 0) / sub.totalPoints) * 100) : '-',
            };
        });

        const ws1 = XLSX.utils.json_to_sheet(rekapData);
        ws1['!cols'] = [
            { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
            { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
            { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
            { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
        ];
        XLSX.utils.book_append_sheet(workbook, ws1, 'Rekap Nilai');

        // === Sheet 2: Essay (if any) ===
        const essayData: any[] = [];
        submissionsData.forEach(sub => {
            const studentAnswers = answersData.filter(a => a.submissionId === sub.submissionId && a.questionType === 'essay');
            studentAnswers.forEach((ans, idx) => {
                const content = typeof ans.questionContent === 'string' ? JSON.parse(ans.questionContent) : ans.questionContent;
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
        const completedResults = submissionsData.filter(r => r.status === 'completed');
        const scores = completedResults.map(r => r.earnedPoints || r.score || 0);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0;

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
