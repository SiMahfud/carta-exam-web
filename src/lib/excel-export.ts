import * as XLSX from 'xlsx';

interface ExportData {
    session: {
        name: string;
        templateName: string;
    };
    statistics: {
        totalStudents: number;
        completedStudents: number;
        averageScore: number;
        highestScore: number;
        lowestScore: number;
        completionRate: number;
    };
    results: any[];
}

export function exportToExcel(data: ExportData) {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Auto-Graded Results
    const autoGradedData = data.results.map((result, idx) => ({
        'No': idx + 1,
        'Nama Siswa': result.studentName,
        'Kelas': result.className,
        'PG - Benar': result.scoresByType.mc.correct,
        'PG - Salah': result.scoresByType.mc.incorrect,
        'PG - Skor': `${result.scoresByType.mc.score}/${result.scoresByType.mc.maxScore}`,
        'PG Kompleks - Benar': result.scoresByType.complex_mc.correct,
        'PG Kompleks - Salah': result.scoresByType.complex_mc.incorrect,
        'PG Kompleks - Skor': `${result.scoresByType.complex_mc.score}/${result.scoresByType.complex_mc.maxScore}`,
        'Menjodohkan - Benar': result.scoresByType.matching.correct,
        'Menjodohkan - Salah': result.scoresByType.matching.incorrect,
        'Menjodohkan - Skor': `${result.scoresByType.matching.score}/${result.scoresByType.matching.maxScore}`,
        'Isian Singkat - Benar': result.scoresByType.short.correct,
        'Isian Singkat - Salah': result.scoresByType.short.incorrect,
        'Isian Singkat - Skor': `${result.scoresByType.short.score}/${result.scoresByType.short.maxScore}`,
        'Status': result.status === 'completed' ? 'Selesai' : result.status === 'in_progress' ? 'Mengerjakan' : 'Belum Mulai',
        'Total Skor': result.totalScore,
        'Skor Maksimal': result.totalMaxScore,
    }));

    const ws1 = XLSX.utils.json_to_sheet(autoGradedData);

    // Set column widths
    ws1['!cols'] = [
        { wch: 5 },   // No
        { wch: 25 },  // Nama
        { wch: 10 },  // Kelas
        { wch: 10 },  // PG - Benar
        { wch: 10 },  // PG - Salah
        { wch: 12 },  // PG - Skor
        { wch: 15 },  // PG Kompleks - Benar
        { wch: 15 },  // PG Kompleks - Salah
        { wch: 15 },  // PG Kompleks - Skor
        { wch: 15 },  // Menjodohkan - Benar
        { wch: 15 },  // Menjodohkan - Salah
        { wch: 15 },  // Menjodohkan - Skor
        { wch: 15 },  // Isian Singkat - Benar
        { wch: 15 },  // Isian Singkat - Salah
        { wch: 15 },  // Isian Singkat - Skor
        { wch: 15 },  // Status
        { wch: 12 },  // Total Skor
        { wch: 15 },  // Skor Maksimal
    ];

    XLSX.utils.book_append_sheet(workbook, ws1, 'Nilai Otomatis');

    // Sheet 2: Essay Results
    const essayData: any[] = [];
    data.results.forEach(result => {
        result.essayQuestions.forEach((essay: any, idx: number) => {
            essayData.push({
                'Nama Siswa': result.studentName,
                'Kelas': result.className,
                'Soal No': idx + 1,
                'Pertanyaan': essay.questionText,
                'Jawaban Siswa': typeof essay.studentAnswer === 'string' ? essay.studentAnswer : JSON.stringify(essay.studentAnswer),
                'Skor': essay.score,
                'Skor Maksimal': essay.maxScore,
                'Status Koreksi': essay.gradingStatus === 'completed' ? 'Sudah Dikoreksi' :
                    essay.gradingStatus === 'pending_manual' ? 'Perlu Koreksi' :
                        essay.gradingStatus,
                'Dikoreksi Oleh': essay.gradedBy || '-',
            });
        });
    });

    if (essayData.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(essayData);
        ws2['!cols'] = [
            { wch: 25 },  // Nama
            { wch: 10 },  // Kelas
            { wch: 10 },  // Soal No
            { wch: 50 },  // Pertanyaan
            { wch: 50 },  // Jawaban
            { wch: 10 },  // Skor
            { wch: 15 },  // Skor Maksimal
            { wch: 15 },  // Status Koreksi
            { wch: 20 },  // Dikoreksi Oleh
        ];
        XLSX.utils.book_append_sheet(workbook, ws2, 'Soal Essay');
    }

    // Sheet 3: Statistics
    const statsData = [
        { 'Metrik': 'Total Siswa', 'Nilai': data.statistics.totalStudents },
        { 'Metrik': 'Siswa Selesai', 'Nilai': data.statistics.completedStudents },
        { 'Metrik': 'Rata-rata Nilai', 'Nilai': data.statistics.averageScore.toFixed(2) },
        { 'Metrik': 'Nilai Tertinggi', 'Nilai': data.statistics.highestScore },
        { 'Metrik': 'Nilai Terendah', 'Nilai': data.statistics.lowestScore },
        { 'Metrik': 'Tingkat Penyelesaian (%)', 'Nilai': data.statistics.completionRate },
    ];

    const ws3 = XLSX.utils.json_to_sheet(statsData);
    ws3['!cols'] = [
        { wch: 30 },  // Metrik
        { wch: 15 },  // Nilai
    ];
    XLSX.utils.book_append_sheet(workbook, ws3, 'Statistik');

    // Generate filename
    const filename = `Hasil_Ujian_${data.session.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
}
