import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PieChart, Award, BookOpen, Layers } from "lucide-react";

interface ScoreDistribution {
    poor: number;
    fair: number;
    good: number;
    excellent: number;
    total: number;
}

interface QuestionTypeStat {
    type: string;
    label: string;
    count: number;
}

interface SubjectStat {
    id: string;
    name: string;
    code: string | null;
    avgScore: number;
    submissionCount: number;
}

interface AnalyticsData {
    scoreDistribution: ScoreDistribution;
    questionTypeDistribution: QuestionTypeStat[];
    subjectPerformance: SubjectStat[];
    summary: {
        totalSubmissions: number;
        totalTeachers: number;
        averageSystemScore: number;
    };
}

export function DashboardAnalytics() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch("/api/admin/analytics");
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (err) {
                console.error("Failed to load analytics:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200 dark:border-slate-700 shadow-sm dark:bg-slate-800">
                    <CardHeader>
                        <Skeleton className="h-5 w-40 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-8 w-full" />
                        ))}
                    </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-700 shadow-sm dark:bg-slate-800">
                    <CardHeader>
                        <Skeleton className="h-5 w-40 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-8 w-full" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!data) return null;

    const totalSubmissions = data.scoreDistribution.total || 1;
    const getPercent = (count: number) =>
        Math.round((count / totalSubmissions) * 100);

    const scoreBins = [
        {
            label: "Sangat Baik (85 - 100)",
            count: data.scoreDistribution.excellent,
            percent: getPercent(data.scoreDistribution.excellent),
            color: "bg-emerald-500",
            textColor: "text-emerald-700 dark:text-emerald-400",
        },
        {
            label: "Baik (75 - 84)",
            count: data.scoreDistribution.good,
            percent: getPercent(data.scoreDistribution.good),
            color: "bg-blue-500",
            textColor: "text-blue-700 dark:text-blue-400",
        },
        {
            label: "Cukup (60 - 74)",
            count: data.scoreDistribution.fair,
            percent: getPercent(data.scoreDistribution.fair),
            color: "bg-amber-500",
            textColor: "text-amber-700 dark:text-amber-400",
        },
        {
            label: "Perlu Bimbingan (< 60)",
            count: data.scoreDistribution.poor,
            percent: getPercent(data.scoreDistribution.poor),
            color: "bg-rose-500",
            textColor: "text-rose-700 dark:text-rose-400",
        },
    ];

    const totalQuestions = data.questionTypeDistribution.reduce(
        (acc, curr) => acc + curr.count,
        0
    ) || 1;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Analitik Nilai & Pembelajaran
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Statistik hasil ujian dan distribusi butir soal secara keseluruhan.
                    </p>
                </div>
                {data.summary.totalSubmissions > 0 && (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 bg-background text-sm">
                            <Award className="h-3.5 w-3.5 mr-1 text-primary" />
                            Rata-Rata Sistem: <strong>{data.summary.averageSystemScore}</strong>
                        </Badge>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Distribusi Nilai */}
                <Card className="border-slate-200 dark:border-slate-700 shadow-sm dark:bg-slate-800">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <PieChart className="h-4 w-4 text-primary" />
                            Distribusi Nilai Siswa
                        </CardTitle>
                        <CardDescription>
                            Berdasarkan {data.scoreDistribution.total} ujian yang telah selesai dinilai
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {data.scoreDistribution.total === 0 ? (
                            <div className="text-center py-6 text-sm text-muted-foreground">
                                Belum ada data ujian yang selesai.
                            </div>
                        ) : (
                            scoreBins.map((bin) => (
                                <div key={bin.label} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-slate-700 dark:text-slate-200">
                                            {bin.label}
                                        </span>
                                        <span className={bin.textColor}>
                                            {bin.count} siswa ({bin.percent}%)
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${bin.color} rounded-full transition-all duration-500`}
                                            style={{ width: `${Math.max(bin.percent, 2)}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* 2. Komposisi Bank Soal */}
                <Card className="border-slate-200 dark:border-slate-700 shadow-sm dark:bg-slate-800">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Layers className="h-4 w-4 text-purple-600" />
                            Komposisi Tipe Soal
                        </CardTitle>
                        <CardDescription>
                            Total {totalQuestions} butir soal tersedia di semua bank soal
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.questionTypeDistribution.length === 0 ? (
                            <div className="text-center py-6 text-sm text-muted-foreground">
                                Belum ada bank soal terdaftar.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {data.questionTypeDistribution.map((item) => {
                                    const percent = Math.round(
                                        (item.count / totalQuestions) * 100
                                    );
                                    return (
                                        <div
                                            key={item.type}
                                            className="p-3 bg-muted/40 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between"
                                        >
                                            <div className="text-xs font-medium text-muted-foreground truncate">
                                                {item.label}
                                            </div>
                                            <div className="mt-2 flex items-baseline justify-between">
                                                <span className="text-lg font-bold text-slate-800 dark:text-white">
                                                    {item.count}
                                                </span>
                                                <span className="text-xs font-semibold text-muted-foreground">
                                                    {percent}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 3. Rata-Rata Nilai Per Mata Pelajaran */}
            {data.subjectPerformance.length > 0 && (
                <Card className="border-slate-200 dark:border-slate-700 shadow-sm dark:bg-slate-800">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                            Rata-Rata Nilai Berdasarkan Mata Pelajaran
                        </CardTitle>
                        <CardDescription>
                            Performa kelulusan siswa per mata pelajaran yang telah diujikan
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.subjectPerformance.map((subj) => (
                                <div
                                    key={subj.id}
                                    className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-xs"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                                {subj.name}
                                            </h4>
                                            {subj.code && (
                                                <span className="text-xs text-muted-foreground">
                                                    Kode: {subj.code}
                                                </span>
                                            )}
                                        </div>
                                        <Badge
                                            variant={subj.avgScore >= 75 ? "default" : "secondary"}
                                            className="font-mono text-xs"
                                        >
                                            {subj.avgScore}
                                        </Badge>
                                    </div>
                                    <div className="mt-3">
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${
                                                    subj.avgScore >= 85
                                                        ? "bg-emerald-500"
                                                        : subj.avgScore >= 75
                                                        ? "bg-blue-500"
                                                        : subj.avgScore >= 60
                                                        ? "bg-amber-500"
                                                        : "bg-rose-500"
                                                } rounded-full`}
                                                style={{ width: `${Math.min(subj.avgScore, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-[11px] text-muted-foreground mt-1 block">
                                            {subj.submissionCount} ujian terkumpul
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
