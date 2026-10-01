"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";
import { MatchingResultViewer } from "@/components/exam/MatchingResultViewer";
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    BookOpen,
    HelpCircle,
    MessageSquare,
    Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReviewData {
    session: {
        id: string;
        name: string;
        subject: string;
        startTime: number;
        endTime: number;
        status: string;
        allowReview: boolean;
        showResult: boolean;
    };
    submission: {
        id: string;
        score: number | null;
        earnedPoints: number | null;
        totalPoints: number | null;
        status: string;
        gradingStatus: string;
        violationCount: number;
        submittedAt: number | null;
    };
    questions: Array<{
        id: string;
        type: string;
        questionText: string;
        content: any;
        points: number;
        studentAnswer: any;
        isCorrect: boolean;
        score: number;
        feedback: string | null;
        correctAnswer: any;
        explanation: string | null;
    }>;
}

export default function StudentExamReviewPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const sessionId = params.sessionId as string;

    const [data, setData] = useState<ReviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "essay">("all");

    useEffect(() => {
        const fetchReview = async () => {
            try {
                const res = await fetch(`/api/student/exams/${sessionId}/review`);
                if (!res.ok) {
                    const err = await res.json();
                    toast({
                        title: "Tidak Dapat Memuat Review",
                        description: err.error || "Gagal memuat hasil ujian.",
                        variant: "destructive",
                    });
                    return;
                }
                const json = await res.json();
                setData(json);
            } catch (err: any) {
                toast({
                    title: "Error",
                    description: err.message || "Terjadi kesalahan jaringan.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        if (sessionId) {
            fetchReview();
        }
    }, [sessionId, toast]);

    if (loading) {
        return (
            <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-44 w-full rounded-xl" />
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-48 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="container max-w-4xl mx-auto py-16 px-4">
                <EmptyState
                    icon={HelpCircle}
                    title="Data Review Tidak Ditemukan"
                    description="Hasil ujian belum tersedia atau Anda belum mengerjakan sesi ujian ini."
                    action={{
                        label: "Kembali ke Dashboard",
                        onClick: () => router.push("/student"),
                    }}
                />
            </div>
        );
    }

    const { session, submission, questions } = data;

    if (session.allowReview === false) {
        return (
            <div className="container max-w-4xl mx-auto py-16 px-4">
                <EmptyState
                    icon={HelpCircle}
                    title="Review Tidak Diaktifkan"
                    description="Guru mengatur agar lembar jawaban dan pembahasan soal tidak dapat dilihat untuk sesi ujian ini."
                    action={{
                        label: "Kembali ke Dashboard",
                        onClick: () => router.push("/student"),
                    }}
                />
            </div>
        );
    }

    const filteredQuestions = questions.filter((q) => {
        if (filter === "correct") return q.isCorrect;
        if (filter === "incorrect") return !q.isCorrect && q.type !== "essay";
        if (filter === "essay") return q.type === "essay" || q.type === "short";
        return true;
    });

    const correctCount = questions.filter((q) => q.isCorrect).length;
    const incorrectCount = questions.filter((q) => !q.isCorrect && q.type !== "essay").length;
    const essayCount = questions.filter((q) => q.type === "essay" || q.type === "short").length;

    const isResultVisible = session.showResult || submission.gradingStatus === "published";

    const scoreColor =
        (submission.score ?? 0) >= 80
            ? "text-emerald-600 dark:text-emerald-400"
            : (submission.score ?? 0) >= 65
            ? "text-blue-600 dark:text-blue-400"
            : "text-rose-600 dark:text-rose-400";

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "mc": return "Pilihan Ganda";
            case "complex_mc": return "PG Kompleks";
            case "true_false": return "Benar / Salah";
            case "matching": return "Menjodohkan";
            case "short": return "Isian Singkat";
            case "essay": return "Uraian";
            default: return type;
        }
    };

    return (
        <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/student")}
                    className="gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Kembali ke Beranda</span>
                </Button>
                <Badge variant="outline" className="text-xs">
                    {session.subject}
                </Badge>
            </div>

            {/* Score & Summary Card */}
            <Card className="border-slate-200 dark:border-slate-700 shadow-md overflow-hidden bg-gradient-to-br from-background to-muted/30">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                                {session.name}
                            </CardTitle>
                            <CardDescription className="text-sm mt-1">
                                Review Hasil dan Pembahasan Ujian Siswa
                            </CardDescription>
                        </div>
                        <Badge
                            className={`text-sm px-3 py-1 self-start sm:self-auto ${
                                submission.gradingStatus === "published"
                                    ? "bg-emerald-600"
                                    : "bg-amber-600"
                            }`}
                        >
                            {submission.gradingStatus === "published" ? "Sudah Dinilai" : "Menunggu Penilaian"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t">
                        <div className="p-3 bg-card rounded-lg border text-center">
                            <span className="text-xs text-muted-foreground block mb-1 font-medium">Nilai Akhir</span>
                            <span className={`text-3xl font-extrabold font-mono ${scoreColor}`}>
                                {isResultVisible ? (submission.score ?? "-") : "Dirahasiakan"}
                            </span>
                        </div>
                        <div className="p-3 bg-card rounded-lg border text-center">
                            <span className="text-xs text-muted-foreground block mb-1 font-medium">Poin Diperoleh</span>
                            <span className="text-xl font-bold text-slate-800 dark:text-slate-100 font-mono">
                                {isResultVisible ? `${submission.earnedPoints ?? 0} / ${submission.totalPoints ?? 0}` : "Dirahasiakan"}
                            </span>
                        </div>
                        <div className="p-3 bg-card rounded-lg border text-center">
                            <span className="text-xs text-muted-foreground block mb-1 font-medium">Soal Benar</span>
                            <span className="text-xl font-bold text-emerald-600 font-mono">
                                {correctCount} / {questions.length}
                            </span>
                        </div>
                        <div className="p-3 bg-card rounded-lg border text-center">
                            <span className="text-xs text-muted-foreground block mb-1 font-medium">Pelanggaran</span>
                            <span className="text-xl font-bold text-slate-700 dark:text-slate-300 font-mono">
                                {submission.violationCount}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2 flex-wrap pt-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
                    <Filter className="h-3.5 w-3.5" /> Filter:
                </span>
                <Button
                    size="sm"
                    variant={filter === "all" ? "default" : "outline"}
                    onClick={() => setFilter("all")}
                    className="text-xs h-8"
                >
                    Semua ({questions.length})
                </Button>
                <Button
                    size="sm"
                    variant={filter === "correct" ? "default" : "outline"}
                    onClick={() => setFilter("correct")}
                    className="text-xs h-8 gap-1.5"
                >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Benar ({correctCount})
                </Button>
                <Button
                    size="sm"
                    variant={filter === "incorrect" ? "default" : "outline"}
                    onClick={() => setFilter("incorrect")}
                    className="text-xs h-8 gap-1.5"
                >
                    <XCircle className="h-3.5 w-3.5 text-rose-500" />
                    Salah ({incorrectCount})
                </Button>
                {essayCount > 0 && (
                    <Button
                        size="sm"
                        variant={filter === "essay" ? "default" : "outline"}
                        onClick={() => setFilter("essay")}
                        className="text-xs h-8"
                    >
                        Esai / Isian ({essayCount})
                    </Button>
                )}
            </div>

            {/* Question Review List */}
            <div className="space-y-4">
                {filteredQuestions.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground text-sm">
                        Tidak ada soal yang sesuai dengan filter ini.
                    </Card>
                ) : (
                    filteredQuestions.map((q) => {
                        const questionIndex = questions.findIndex((orig) => orig.id === q.id) + 1;
                        const isEssay = q.type === "essay";

                        return (
                            <Card key={q.id} className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                <CardHeader className="py-3 px-4 bg-muted/40 border-b flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="font-mono">
                                            #{questionIndex}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            {getTypeLabel(q.type)}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {q.isCorrect ? (
                                            <Badge className="bg-emerald-600 text-xs flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Benar (+{q.score})
                                            </Badge>
                                        ) : q.score > 0 ? (
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 text-xs font-mono">
                                                Sebagian Benar ({q.score}/{q.points})
                                            </Badge>
                                        ) : isEssay ? (
                                            <Badge variant="secondary" className="text-xs font-mono">
                                                Skor: {q.score} / {q.points}
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                                <XCircle className="h-3 w-3" /> Salah (0/{q.points})
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 space-y-4">
                                    {/* Question text */}
                                    <div className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                                        <MathHtmlRenderer html={q.questionText} />
                                    </div>

                                    {/* MC Options Display */}
                                    {q.type === "mc" && q.content?.options && (
                                        <div className="space-y-2 pt-2">
                                            {q.content.options.map((opt: any, optIdx: number) => {
                                                const label = String.fromCharCode(65 + optIdx);
                                                const optText = typeof opt === "string" ? opt : opt.text || "";
                                                const isStudent = String(q.studentAnswer) === label;
                                                const isCorrectOpt = String(q.correctAnswer) === label;

                                                let styleClass = "border-slate-200 bg-background";
                                                if (isStudent && isCorrectOpt) {
                                                    styleClass = "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20";
                                                } else if (isStudent && !isCorrectOpt) {
                                                    styleClass = "border-rose-500 bg-rose-50/70 dark:bg-rose-950/20";
                                                } else if (isCorrectOpt) {
                                                    styleClass = "border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10";
                                                }

                                                return (
                                                    <div
                                                        key={label}
                                                        className={`p-3 rounded-lg border flex items-start justify-between gap-3 text-xs sm:text-sm ${styleClass}`}
                                                    >
                                                        <div className="flex items-start gap-2.5 flex-1">
                                                            <span className="font-bold shrink-0">{label}.</span>
                                                            <MathHtmlRenderer html={optText} />
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {isStudent && (
                                                                <Badge variant="outline" className="text-[11px]">
                                                                    Jawaban Anda
                                                                </Badge>
                                                            )}
                                                            {isCorrectOpt && (
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                            )}
                                                            {isStudent && !isCorrectOpt && (
                                                                <XCircle className="h-4 w-4 text-rose-600" />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* True / False Display */}
                                    {q.type === "true_false" && (
                                        <div className="space-y-2 pt-2 max-w-md">
                                            {["Benar", "Salah"].map((opt) => {
                                                const isStudent = q.studentAnswer === opt;
                                                const isCorrectOpt = q.correctAnswer === opt;

                                                let styleClass = "border-slate-200 bg-background";
                                                if (isStudent && isCorrectOpt) {
                                                    styleClass = "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20";
                                                } else if (isStudent && !isCorrectOpt) {
                                                    styleClass = "border-rose-500 bg-rose-50/70 dark:bg-rose-950/20";
                                                } else if (isCorrectOpt) {
                                                    styleClass = "border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10";
                                                }

                                                return (
                                                    <div key={opt} className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs sm:text-sm ${styleClass}`}>
                                                        <span className="font-semibold">{opt}</span>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {isStudent && (
                                                                <Badge variant="outline" className="text-[11px]">
                                                                    Jawaban Anda
                                                                </Badge>
                                                            )}
                                                            {isCorrectOpt && (
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                            )}
                                                            {isStudent && !isCorrectOpt && (
                                                                <XCircle className="h-4 w-4 text-rose-600" />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Complex MC Display */}
                                    {q.type === "complex_mc" && q.content?.options && (
                                        <div className="space-y-2 pt-2">
                                            {q.content.options.map((opt: any, optIdx: number) => {
                                                const isString = typeof opt === 'string';
                                                const label = isString ? String.fromCharCode(65 + optIdx) : (opt.label || String.fromCharCode(65 + optIdx));
                                                const text = isString ? opt : (opt.text || opt.html || "");

                                                const studentAnswers = Array.isArray(q.studentAnswer) ? q.studentAnswer : [];
                                                const correctAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];

                                                const isStudent = studentAnswers.includes(label);
                                                const isCorrectOpt = correctAnswers.includes(label) || correctAnswers.includes(optIdx) || correctAnswers.includes(String(optIdx));

                                                let styleClass = "border-slate-200 bg-background";
                                                if (isStudent && isCorrectOpt) {
                                                    styleClass = "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20";
                                                } else if (isStudent && !isCorrectOpt) {
                                                    styleClass = "border-rose-500 bg-rose-50/70 dark:bg-rose-950/20";
                                                } else if (isCorrectOpt) {
                                                    styleClass = "border-yellow-400 bg-yellow-50/40 dark:bg-yellow-950/10";
                                                }

                                                return (
                                                    <div key={label} className={`p-3 rounded-lg border flex items-start justify-between gap-3 text-xs sm:text-sm ${styleClass}`}>
                                                        <div className="flex items-start gap-2.5 flex-1">
                                                            <span className="font-bold shrink-0">{label}.</span>
                                                            <MathHtmlRenderer html={text} />
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {isStudent && isCorrectOpt && (
                                                                <Badge className="bg-emerald-600 text-[11px] flex items-center gap-1">
                                                                    <CheckCircle2 className="h-3 w-3" /> Benar Dipilih
                                                                </Badge>
                                                            )}
                                                            {isStudent && !isCorrectOpt && (
                                                                <Badge variant="destructive" className="text-[11px] flex items-center gap-1">
                                                                    <XCircle className="h-3 w-3" /> Salah Dipilih
                                                                </Badge>
                                                            )}
                                                            {!isStudent && isCorrectOpt && (
                                                                <Badge variant="secondary" className="text-[11px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                                                                    Kunci (Dilewatkan)
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Matching Display */}
                                    {q.type === "matching" && (() => {
                                        const leftItems = q.content?.leftItems || [];
                                        const rightItems = q.content?.rightItems || [];
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

                                        let studentPairs: any[] = [];
                                        if (Array.isArray(q.studentAnswer)) {
                                            studentPairs = q.studentAnswer.map((pair: any) => {
                                                const leftKey = pair.left ?? pair.leftId;
                                                const rightKey = pair.right ?? pair.rightId;
                                                return {
                                                    left: leftIdToIndex[leftKey] ?? leftKey,
                                                    right: rightIdToIndex[rightKey] ?? rightKey
                                                };
                                            });
                                        }

                                        let correctPairsIndexed: Record<number, number> = {};
                                        if (q.correctAnswer?.matches && Array.isArray(q.correctAnswer.matches)) {
                                            q.correctAnswer.matches.forEach((match: any) => {
                                                const leftIdx = leftIdToIndex[match.leftId];
                                                const rightIdx = rightIdToIndex[match.rightId];
                                                if (leftIdx !== undefined && rightIdx !== undefined) {
                                                    correctPairsIndexed[leftIdx] = rightIdx;
                                                }
                                            });
                                        } else if (q.correctAnswer?.pairs) {
                                            correctPairsIndexed = q.correctAnswer.pairs;
                                        } else if (typeof q.correctAnswer === 'object' && !Array.isArray(q.correctAnswer)) {
                                            correctPairsIndexed = q.correctAnswer;
                                        }

                                        return (
                                            <div className="pt-2">
                                                <MatchingResultViewer
                                                    question={{
                                                        id: q.id,
                                                        questionText: q.questionText,
                                                        leftItems,
                                                        rightItems,
                                                    }}
                                                    studentPairs={studentPairs}
                                                    correctPairs={correctPairsIndexed}
                                                />
                                            </div>
                                        );
                                    })()}

                                    {/* Short Answer Display */}
                                    {q.type === "short" && (
                                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                                            <div className={`p-3 rounded-lg border text-xs sm:text-sm ${q.isCorrect ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300" : "bg-rose-50 dark:bg-rose-950/20 border-rose-300"}`}>
                                                <span className="font-semibold text-muted-foreground block text-xs mb-1">
                                                    Jawaban Anda:
                                                </span>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {typeof q.studentAnswer === "string" ? q.studentAnswer : JSON.stringify(q.studentAnswer || "-")}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 rounded-lg text-xs sm:text-sm">
                                                <span className="font-semibold text-emerald-800 dark:text-emerald-300 block text-xs mb-1">
                                                    Jawaban Benar:
                                                </span>
                                                <p className="font-medium text-emerald-950 dark:text-emerald-100">
                                                    {typeof q.correctAnswer === "string" ? q.correctAnswer : JSON.stringify(q.correctAnswer || "-")}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Essay Display */}
                                    {isEssay && (
                                        <div className="space-y-3 pt-2">
                                            <div className="p-3 bg-muted/60 rounded-lg text-xs sm:text-sm space-y-1">
                                                <span className="font-semibold text-muted-foreground block text-xs">
                                                    Jawaban Anda:
                                                </span>
                                                <p className="whitespace-pre-wrap text-slate-900 dark:text-white">
                                                    {typeof q.studentAnswer === "string"
                                                        ? q.studentAnswer
                                                        : JSON.stringify(q.studentAnswer || "-")}
                                                </p>
                                            </div>

                                            {q.feedback && (
                                                <div className="p-3 bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg text-xs space-y-1">
                                                    <span className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                                                        <MessageSquare className="h-3.5 w-3.5" /> Catatan Guru:
                                                    </span>
                                                    <p className="text-blue-950 dark:text-blue-200 leading-relaxed">
                                                        {q.feedback}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Explanation / Pembahasan */}
                                    {q.explanation && (
                                        <div className="p-3 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30 rounded-lg text-xs space-y-1 mt-2">
                                            <span className="font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1">
                                                <BookOpen className="h-3.5 w-3.5" /> Pembahasan Soal:
                                            </span>
                                            <p className="text-purple-950 dark:text-purple-200 leading-relaxed">
                                                <MathHtmlRenderer html={q.explanation} />
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
