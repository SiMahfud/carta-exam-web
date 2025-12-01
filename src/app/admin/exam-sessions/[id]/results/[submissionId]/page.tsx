"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, User, Calendar, Award } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { MatchingResultViewer } from "@/components/exam/MatchingResultViewer";

interface Answer {
    answerId: string;
    questionId: string;
    type: string;
    questionText: string;
    questionContent: any;
    studentAnswer: any;
    correctAnswer: any;
    isFlagged: boolean;
    isCorrect: boolean | null;
    score: number;
    maxPoints: number;
    partialPoints: number | null;
    gradingStatus: string;
    gradingNotes: string | null;
}

interface SubmissionDetail {
    submission: {
        id: string;
        sessionId: string;
        userId: string;
        studentName: string;
        sessionName: string;
        status: string;
        gradingStatus: string;
        score: number | null;
        earnedPoints: number | null;
        totalPoints: number | null;
        startTime: string;
        endTime: string | null;
        violationCount: number;
    };
    answers: Answer[];
}

export default function SubmissionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<SubmissionDetail | null>(null);

    useEffect(() => {
        fetchSubmissionDetail();
    }, []);

    const fetchSubmissionDetail = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/grading/submissions/${params.submissionId}`);
            if (response.ok) {
                const fetchedData = await response.json();
                setData(fetchedData);
            } else {
                throw new Error("Failed to load submission details");
            }
        } catch (error) {
            console.error("Error fetching submission details:", error);
            toast({
                title: "Error",
                description: "Gagal memuat detail submission",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const renderAnswer = (answer: Answer) => {
        switch (answer.type) {
            case "mc":
                return (
                    <div className="space-y-3">
                        <div>
                            <h4 className="font-medium mb-2">{answer.questionText}</h4>
                            {answer.questionContent?.options && (
                                <div className="space-y-2">
                                    {(answer.questionContent.options as any[]).map((opt: any, idx: number) => {
                                        const optLabel = String.fromCharCode(65 + idx); // A, B, C, D, E
                                        const isStudentAnswer = answer.studentAnswer === optLabel;
                                        const isCorrectAnswer = answer.correctAnswer === optLabel;

                                        return (
                                            <div
                                                key={idx}
                                                className={`p-3 rounded-lg border ${isCorrectAnswer
                                                    ? "bg-green-50 border-green-300"
                                                    : isStudentAnswer
                                                        ? "bg-red-50 border-red-300"
                                                        : "bg-muted/30"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{optLabel}.</span>
                                                    <span>{opt}</span>
                                                    {isCorrectAnswer && (
                                                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                                                    )}
                                                    {isStudentAnswer && !isCorrectAnswer && (
                                                        <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Jawaban Siswa:</span>
                            <Badge variant={answer.isCorrect ? "default" : "destructive"}>
                                {typeof answer.studentAnswer === 'object' ? JSON.stringify(answer.studentAnswer) : (answer.studentAnswer || "Tidak dijawab")}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Jawaban Benar:</span>
                            <Badge className="bg-green-600">{typeof answer.correctAnswer === 'object' ? JSON.stringify(answer.correctAnswer) : String(answer.correctAnswer)}</Badge>
                        </div>
                    </div>
                );

            case "complex_mc":
                return (
                    <div className="space-y-3">
                        <div>
                            <h4 className="font-medium mb-2">{answer.questionText}</h4>
                            {answer.questionContent?.options && (
                                <div className="space-y-2">
                                    {(answer.questionContent.options as any[]).map((opt: any, idx: number) => {
                                        const optLabel = String.fromCharCode(65 + idx);
                                        const studentAnswers = Array.isArray(answer.studentAnswer) ? answer.studentAnswer : [];
                                        const correctAnswers = Array.isArray(answer.correctAnswer) ? answer.correctAnswer : [];

                                        const isStudentAnswer = studentAnswers.includes(optLabel);
                                        const isCorrectAnswer = correctAnswers.includes(optLabel);

                                        return (
                                            <div
                                                key={idx}
                                                className={`p-3 rounded-lg border ${isCorrectAnswer && isStudentAnswer
                                                    ? "bg-green-50 border-green-300"
                                                    : isCorrectAnswer
                                                        ? "bg-yellow-50 border-yellow-300"
                                                        : isStudentAnswer
                                                            ? "bg-red-50 border-red-300"
                                                            : "bg-muted/30"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{optLabel}.</span>
                                                    <span>{opt}</span>
                                                    {isCorrectAnswer && isStudentAnswer && (
                                                        <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                                                    )}
                                                    {isCorrectAnswer && !isStudentAnswer && (
                                                        <span className="text-xs bg-yellow-100 px-2 py-1 rounded ml-auto">
                                                            Benar (dilewatkan)
                                                        </span>
                                                    )}
                                                    {!isCorrectAnswer && isStudentAnswer && (
                                                        <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="font-medium">Jawaban Siswa:</span>
                            {Array.isArray(answer.studentAnswer) && answer.studentAnswer.length > 0 ? (
                                answer.studentAnswer.map((ans: any, idx: number) => (
                                    <Badge key={idx} variant="outline">{typeof ans === 'object' ? JSON.stringify(ans) : String(ans)}</Badge>
                                ))
                            ) : (
                                <Badge variant="outline">Tidak dijawab</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="font-medium">Jawaban Benar:</span>
                            {Array.isArray(answer.correctAnswer) && answer.correctAnswer.map((ans: any, idx: number) => (
                                <Badge key={idx} className="bg-green-600">{typeof ans === 'object' ? JSON.stringify(ans) : String(ans)}</Badge>
                            ))}
                        </div>
                    </div>
                );

            case "matching":
                const studentPairs = Array.isArray(answer.studentAnswer) ? answer.studentAnswer : [];
                const correctPairs = (answer.correctAnswer as any)?.pairs || {};
                const leftItems = (answer.questionContent as any)?.leftItems || [];
                const rightItems = (answer.questionContent as any)?.rightItems || [];

                return (
                    <div className="space-y-3">
                        <h4 className="font-medium mb-2">{answer.questionText}</h4>
                        <MatchingResultViewer
                            question={{
                                id: answer.questionId,
                                questionText: answer.questionText,
                                leftItems,
                                rightItems
                            }}
                            studentPairs={studentPairs}
                            correctPairs={correctPairs}
                        />
                        {/* Legacy Key View (Optional, maybe hidden or collapsed) */}
                        <details className="text-xs text-muted-foreground cursor-pointer mt-4">
                            <summary>Lihat Kunci Jawaban (Teks)</summary>
                            <div className="mt-2 p-2 bg-muted/20 rounded border">
                                {Object.entries(correctPairs).map(([left, right]: [string, any], idx) => {
                                    const rightIndices = Array.isArray(right) ? right : [right];
                                    return rightIndices.map((rIndex: number, rIdx: number) => (
                                        <div key={`${idx}-${rIdx}`} className="flex gap-2 py-1">
                                            <span className="font-medium">{leftItems[parseInt(left)]}</span>
                                            <span>→</span>
                                            <span>{rightItems[rIndex]}</span>
                                        </div>
                                    ));
                                })}
                            </div>
                        </details>
                    </div>
                );

            case "short":
                const studentAns = typeof answer.studentAnswer === 'string' ? answer.studentAnswer : JSON.stringify(answer.studentAnswer);
                const correctAns = typeof answer.correctAnswer === 'string' ? answer.correctAnswer : JSON.stringify(answer.correctAnswer);

                return (
                    <div className="space-y-3">
                        <h4 className="font-medium">{answer.questionText}</h4>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className={`p-4 rounded-lg border ${answer.isCorrect ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                                <p className="text-sm text-muted-foreground mb-1">Jawaban Siswa:</p>
                                <p className="font-medium">{studentAns || "(tidak dijawab)"}</p>
                            </div>
                            <div className="p-4 rounded-lg border bg-green-50 border-green-300">
                                <p className="text-sm text-muted-foreground mb-1">Jawaban Benar:</p>
                                <p className="font-medium">{correctAns}</p>
                            </div>
                        </div>
                    </div>
                );

            case "essay":
                return (
                    <div className="space-y-3">
                        <h4 className="font-medium">{answer.questionText}</h4>
                        <div className="p-4 rounded-lg border bg-muted/30">
                            <p className="text-sm text-muted-foreground mb-2">Jawaban Siswa:</p>
                            <p className="whitespace-pre-wrap">
                                {typeof answer.studentAnswer === 'string' ? answer.studentAnswer : JSON.stringify(answer.studentAnswer) || "(tidak dijawab)"}
                            </p>
                        </div>
                        {answer.gradingStatus === "manual" && answer.gradingNotes && (
                            <div className="p-4 rounded-lg border bg-blue-50 border-blue-300">
                                <p className="text-sm text-muted-foreground mb-2">Catatan Guru:</p>
                                <p>{answer.gradingNotes}</p>
                            </div>
                        )}
                    </div>
                );

            default:
                return <div>Unknown question type: {answer.type}</div>;
        }
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            mc: "Pilihan Ganda",
            complex_mc: "PG Kompleks",
            matching: "Menjodohkan",
            short: "Isian Singkat",
            essay: "Essay/Uraian",
        };
        return labels[type] || type;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="ml-4 text-muted-foreground">Memuat detail submission...</p>
            </div>
        );
    }

    if (!data) {
        return <div className="text-center py-20">Data tidak ditemukan</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/admin/exam-sessions/${params.id}/results`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Detail Ujian Siswa</h2>
                    <p className="text-muted-foreground">{data.submission.sessionName}</p>
                </div>
            </div>

            {/* Student Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Siswa</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Nama Siswa</p>
                                <p className="font-semibold">{data.submission.studentName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Waktu Selesai</p>
                                <p className="font-semibold">
                                    {data.submission.endTime
                                        ? format(new Date(data.submission.endTime), "d MMM yyyy, HH:mm", { locale: idLocale })
                                        : "Belum selesai"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Award className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Total Skor</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {data.submission.score || 0} / 100
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {data.submission.earnedPoints} / {data.submission.totalPoints} poin
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Questions and Answers */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Soal dan Jawaban</h3>
                {data.answers.map((answer, idx) => (
                    <Card key={answer.answerId}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 text-primary font-bold rounded-full w-10 h-10 flex items-center justify-center">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <Badge variant="outline" className="mb-1">
                                            {getTypeLabel(answer.type)}
                                        </Badge>
                                        {answer.isFlagged && (
                                            <Badge variant="secondary" className="ml-2">
                                                Ragu-ragu
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Skor:</span>
                                        <span className="text-lg font-bold">
                                            {answer.partialPoints || answer.score} / {answer.maxPoints}
                                        </span>
                                    </div>
                                    {answer.isCorrect !== null && (
                                        answer.isCorrect ? (
                                            <Badge variant="default">Benar</Badge>
                                        ) : (
                                            <Badge variant="destructive">Salah</Badge>
                                        )
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {renderAnswer(answer)}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
