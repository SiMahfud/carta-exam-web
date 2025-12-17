"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    ArrowLeft,
    Download,
    Users,
    TrendingUp,
    Award,
    Target,
    Search,
    CheckCircle,
    XCircle,
    Clock,
    Eye
} from "lucide-react";
import Link from "next/link";
// import { format } from "date-fns";
// import { id as idLocale } from "date-fns/locale";
// import { exportToExcel } from "@/lib/excel-export";


interface ScoreByType {
    correct: number;
    incorrect: number;
    score: number;
    maxScore: number;
}

interface EssayQuestion {
    questionId: string;
    questionText: string;
    studentAnswer: any;
    score: number;
    maxScore: number;
    gradingStatus: string;
    gradedBy: string | null;
}

interface StudentResult {
    studentId: string;
    studentName: string;
    className: string;
    submissionId: string;
    status: string;
    scoresByType: {
        mc: ScoreByType;
        complex_mc: ScoreByType;
        matching: ScoreByType;
        short: ScoreByType;
    };
    essayQuestions: EssayQuestion[];
    totalScore: number;
    totalEarnedPoints: number;
    totalMaxScore: number;
    endTime: string | null;
}

interface Statistics {
    totalStudents: number;
    completedStudents: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    completionRate: number;
}

interface SessionInfo {
    id: string;
    name: string;
    templateName: string;
    status: string;
    startTime: string;
    endTime: string;
}

export default function ExamResultsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<SessionInfo | null>(null);
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [results, setResults] = useState<StudentResult[]>([]);

    // Filters
    const [classFilter, setClassFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedView, setSelectedView] = useState<"auto" | "essay">("auto");



    const fetchResults = async () => {
        setLoading(true);
        try {
            const params_url = new URLSearchParams();
            if (classFilter !== "all") params_url.append("classId", classFilter);
            if (searchQuery) params_url.append("search", searchQuery);

            const response = await fetch(`/api/exam-sessions/${params.id}/results?${params_url.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setSession(data.session);
                setStatistics(data.statistics);
                setResults(data.results);
            } else {
                throw new Error("Failed to load results");
            }
        } catch (error) {
            console.error("Error fetching results:", error);
            toast({
                title: "Error",
                description: "Gagal memuat hasil ujian",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classFilter, searchQuery]);



    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-600 font-semibold";
        if (score >= 60) return "text-yellow-600 font-semibold";
        return "text-red-600 font-semibold";
    };

    const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
        if (score >= 80) return "default";
        if (score >= 60) return "secondary";
        return "destructive";
    };

    const handleExport = async () => {
        try {
            toast({
                title: "Memproses...",
                description: "Menyiapkan file Excel",
            });

            const response = await fetch(`/api/exam-sessions/${params.id}/export`);

            if (!response.ok) {
                throw new Error("Failed to export");
            }

            // Get filename from Content-Disposition header if available
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `Hasil_Ujian_${session?.name || 'export'}.xlsx`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Berhasil",
                description: "Hasil ujian berhasil di-export ke Excel",
            });
        } catch (error) {
            console.error("Error exporting to Excel:", error);
            toast({
                title: "Error",
                description: "Gagal meng-export hasil ujian",
                variant: "destructive",
            });
        }
    };

    // Get unique classes for filter
    const uniqueClasses = Array.from(new Set(results.map(r => r.className))).filter(c => c !== 'N/A').sort();

    // Filter results for essay questions
    const resultsWithEssays = results.filter(r => r.essayQuestions.length > 0);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="ml-4 text-muted-foreground">Memuat hasil ujian...</p>
            </div>
        );
    }

    if (!session || !statistics) {
        return <div className="text-center py-20">Data tidak ditemukan</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div className="flex items-center gap-4">
                    <Link href={`/admin/exam-sessions/${params.id}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Hasil Ujian</h2>
                        <p className="text-muted-foreground">{session.name}</p>
                        <p className="text-sm text-muted-foreground">{session.templateName}</p>
                    </div>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export ke Excel
                </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statistics.totalStudents}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {statistics.completedStudents} selesai
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rata-rata Nilai</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${getScoreColor(statistics.averageScore)}`}>
                            {statistics.averageScore.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Dari {statistics.completedStudents} siswa
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nilai Tertinggi</CardTitle>
                        <Award className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {statistics.highestScore}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Terendah: {statistics.lowestScore}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tingkat Penyelesaian</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statistics.completionRate}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {statistics.totalStudents - statistics.completedStudents} belum selesai
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Cari Siswa</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Cari nama siswa..."
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-48">
                            <label className="text-sm font-medium mb-2 block">Filter Kelas</label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                            >
                                <option value="all">Semua Kelas</option>
                                {uniqueClasses.map(cls => (
                                    <option key={cls} value={cls}>{cls}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-full md:w-48">
                            <label className="text-sm font-medium mb-2 block">Tampilan</label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                value={selectedView}
                                onChange={(e) => setSelectedView(e.target.value as "auto" | "essay")}
                            >
                                <option value="auto">Nilai Otomatis</option>
                                <option value="essay">Soal Essay</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Auto-Graded Results Table */}
            {selectedView === "auto" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Tabel Nilai Otomatis</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Pilihan Ganda, PG Kompleks, Menjodohkan, Isian Singkat
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="p-3 text-left font-medium w-12">No</th>
                                        <th className="p-3 text-left font-medium min-w-[200px]">Nama Siswa</th>
                                        <th className="p-3 text-left font-medium">Kelas</th>
                                        <th className="p-3 text-center font-medium">PG</th>
                                        <th className="p-3 text-center font-medium">PG Kompleks</th>
                                        <th className="p-3 text-center font-medium">Menjodohkan</th>
                                        <th className="p-3 text-center font-medium">Isian Singkat</th>
                                        <th className="p-3 text-center font-medium">Status</th>
                                        <th className="p-3 text-center font-medium">Total Skor</th>
                                        <th className="p-3 text-center font-medium">Detail</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((result, idx) => (
                                        <tr key={result.studentId} className="border-b last:border-0 hover:bg-muted/30">
                                            <td className="p-3 text-muted-foreground">{idx + 1}</td>
                                            <td className="p-3 font-medium">{result.studentName}</td>
                                            <td className="p-3 text-muted-foreground">{result.className}</td>

                                            {/* MC */}
                                            <td className="p-3 text-center">
                                                {result.scoresByType.mc.maxScore > 0 ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-center gap-2 text-xs">
                                                            <span className="flex items-center gap-1 text-green-600">
                                                                <CheckCircle className="h-3 w-3" />
                                                                {result.scoresByType.mc.correct}
                                                            </span>
                                                            <span className="flex items-center gap-1 text-red-600">
                                                                <XCircle className="h-3 w-3" />
                                                                {result.scoresByType.mc.incorrect}
                                                            </span>
                                                        </div>
                                                        <div className="font-semibold">
                                                            {result.scoresByType.mc.score}/{result.scoresByType.mc.maxScore}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>

                                            {/* Complex MC */}
                                            <td className="p-3 text-center">
                                                {result.scoresByType.complex_mc.maxScore > 0 ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-center gap-2 text-xs">
                                                            <span className="flex items-center gap-1 text-green-600">
                                                                <CheckCircle className="h-3 w-3" />
                                                                {result.scoresByType.complex_mc.correct}
                                                            </span>
                                                            <span className="flex items-center gap-1 text-red-600">
                                                                <XCircle className="h-3 w-3" />
                                                                {result.scoresByType.complex_mc.incorrect}
                                                            </span>
                                                        </div>
                                                        <div className="font-semibold">
                                                            {result.scoresByType.complex_mc.score}/{result.scoresByType.complex_mc.maxScore}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>

                                            {/* Matching */}
                                            <td className="p-3 text-center">
                                                {result.scoresByType.matching.maxScore > 0 ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-center gap-2 text-xs">
                                                            <span className="flex items-center gap-1 text-green-600">
                                                                <CheckCircle className="h-3 w-3" />
                                                                {result.scoresByType.matching.correct}
                                                            </span>
                                                            <span className="flex items-center gap-1 text-red-600">
                                                                <XCircle className="h-3 w-3" />
                                                                {result.scoresByType.matching.incorrect}
                                                            </span>
                                                        </div>
                                                        <div className="font-semibold">
                                                            {result.scoresByType.matching.score}/{result.scoresByType.matching.maxScore}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>

                                            {/* Short Answer */}
                                            <td className="p-3 text-center">
                                                {result.scoresByType.short.maxScore > 0 ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-center gap-2 text-xs">
                                                            <span className="flex items-center gap-1 text-green-600">
                                                                <CheckCircle className="h-3 w-3" />
                                                                {result.scoresByType.short.correct}
                                                            </span>
                                                            <span className="flex items-center gap-1 text-red-600">
                                                                <XCircle className="h-3 w-3" />
                                                                {result.scoresByType.short.incorrect}
                                                            </span>
                                                        </div>
                                                        <div className="font-semibold">
                                                            {result.scoresByType.short.score}/{result.scoresByType.short.maxScore}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="p-3 text-center">
                                                {result.status === 'completed' ? (
                                                    <Badge variant="default">Selesai</Badge>
                                                ) : result.status === 'in_progress' ? (
                                                    <Badge variant="secondary">Mengerjakan</Badge>
                                                ) : (
                                                    <Badge variant="outline">Belum Mulai</Badge>
                                                )}
                                            </td>

                                            {/* Total Score */}
                                            <td className="p-3 text-center">
                                                <Badge variant={getScoreBadgeVariant(result.totalScore)} className="px-3 py-1">
                                                    <span className="text-base font-bold">{result.totalScore}</span>
                                                </Badge>
                                            </td>

                                            {/* Detail Button */}
                                            <td className="p-3 text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.push(`/admin/exam-sessions/${params.id}/results/${result.submissionId}`)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Lihat
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {results.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-muted-foreground">
                                                Tidak ada data hasil ujian
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Essay Questions Table */}
            {selectedView === "essay" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Tabel Soal Essay</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Soal uraian yang memerlukan koreksi manual
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {resultsWithEssays.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Tidak ada soal essay dalam ujian ini
                                </div>
                            ) : (
                                resultsWithEssays.map((result, _idx) => (
                                    <div key={result.studentId} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-semibold text-lg">{result.studentName}</h4>
                                                <p className="text-sm text-muted-foreground">{result.className}</p>
                                            </div>
                                            <Badge variant={getScoreBadgeVariant(result.totalScore)}>
                                                Total: {result.totalScore}
                                            </Badge>
                                        </div>

                                        <div className="space-y-3">
                                            {result.essayQuestions.map((essay, essayIdx) => (
                                                <div key={essay.questionId} className="bg-muted/30 rounded-lg p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h5 className="font-medium text-sm">Soal {essayIdx + 1}</h5>
                                                        <div className="flex gap-2 items-center">
                                                            {essay.gradingStatus === 'completed' ? (
                                                                <Badge variant="default" className="text-xs">
                                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                                    Sudah Dikoreksi
                                                                </Badge>
                                                            ) : essay.gradingStatus === 'pending_manual' ? (
                                                                <Badge variant="destructive" className="text-xs">
                                                                    <Clock className="h-3 w-3 mr-1" />
                                                                    Perlu Koreksi
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {essay.gradingStatus}
                                                                </Badge>
                                                            )}
                                                            <span className="text-sm font-semibold">
                                                                {essay.score}/{essay.maxScore}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm mb-2">{essay.questionText}</p>
                                                    <div className="bg-background rounded p-3 text-sm">
                                                        <p className="text-muted-foreground mb-1">Jawaban:</p>
                                                        <p>{typeof essay.studentAnswer === 'string' ? essay.studentAnswer : JSON.stringify(essay.studentAnswer)}</p>
                                                    </div>
                                                    {essay.gradingStatus === 'pending_manual' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="mt-2"
                                                            onClick={() => router.push(`/admin/grading/${result.submissionId}`)}
                                                        >
                                                            Koreksi Sekarang
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
