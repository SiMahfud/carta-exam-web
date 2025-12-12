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
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeParseJSON = (data: any) => {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error("Failed to parse JSON:", e);
            return data;
        }
    }
    return data;
};

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
                            <div className="font-medium mb-2"><MathHtmlRenderer html={answer.questionText} /></div>
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
                                                    ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-600"
                                                    : isStudentAnswer
                                                        ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600"
                                                        : "bg-muted/30"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{optLabel}.</span>
                                                    <div className="flex-1"><MathHtmlRenderer html={opt} /></div>
                                                    {isCorrectAnswer && (
                                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto" />
                                                    )}
                                                    {isStudentAnswer && !isCorrectAnswer && (
                                                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 ml-auto" />
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

            case "complex_mc": {
                const options = (answer.questionContent as any)?.options || [];
                const studentAnswers = Array.isArray(answer.studentAnswer) ? answer.studentAnswer : [];

                // Robustly parse correctAnswer: handle { correctOptions: [...] }, { correctIndices: [...] }, or direct array
                const parsedCorrect = safeParseJSON(answer.correctAnswer);
                const correctAnswers = Array.isArray(parsedCorrect)
                    ? parsedCorrect
                    : parsedCorrect?.correctOptions || parsedCorrect?.correctIndices || [];

                return (
                    <div className="space-y-3">
                        <div>
                            <div className="font-medium mb-2"><MathHtmlRenderer html={answer.questionText} /></div>
                            <div className="space-y-2">
                                {options.map((opt: any, idx: number) => {
                                    const isString = typeof opt === 'string';
                                    const optLabel = isString ? String.fromCharCode(65 + idx) : (opt.label || String.fromCharCode(65 + idx));
                                    const optText = isString ? opt : (opt.text || opt.html || "");

                                    const isStudentAnswer = studentAnswers.includes(optLabel);
                                    // Check correctness by Label ("A") or Index (0) or String Index ("0")
                                    const isCorrectAnswer = correctAnswers.includes(optLabel) || correctAnswers.includes(idx) || correctAnswers.includes(String(idx));

                                    return (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-lg border ${isCorrectAnswer && isStudentAnswer
                                                ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-600"
                                                : isCorrectAnswer
                                                    ? "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600"
                                                    : isStudentAnswer
                                                        ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600"
                                                        : "bg-muted/30"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{optLabel}.</span>
                                                <div className="flex-1"><MathHtmlRenderer html={optText} /></div>
                                                {isCorrectAnswer && isStudentAnswer && (
                                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 ml-auto" />
                                                )}
                                                {isCorrectAnswer && !isStudentAnswer && (
                                                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-200 px-2 py-1 rounded ml-auto">
                                                        Benar (dilewatkan)
                                                    </span>
                                                )}
                                                {!isCorrectAnswer && isStudentAnswer && (
                                                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 ml-auto" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="font-medium">Jawaban Siswa:</span>
                            {studentAnswers.length > 0 ? (
                                studentAnswers.map((ans: any, idx: number) => (
                                    <Badge key={idx} variant="outline">{typeof ans === 'object' ? JSON.stringify(ans) : String(ans)}</Badge>
                                ))
                            ) : (
                                <Badge variant="outline">Tidak dijawab</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="font-medium">Jawaban Benar:</span>
                            {correctAnswers.map((ans: any, idx: number) => (
                                <Badge key={idx} className="bg-green-600">{typeof ans === 'number' ? String.fromCharCode(65 + ans) : String(ans)}</Badge>
                            ))}
                        </div>
                    </div>
                );
            }

            case "matching": {
                const leftItems = (answer.questionContent as any)?.leftItems || [];
                const rightItems = (answer.questionContent as any)?.rightItems || [];

                // Build UUID -> index lookup maps
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

                // Convert studentPairs to index-based format
                let studentPairs: any[] = [];
                if (Array.isArray(answer.studentAnswer)) {
                    studentPairs = answer.studentAnswer.map((pair: any) => {
                        // Handle both {left, right} and {leftId, rightId} formats
                        const leftKey = pair.left ?? pair.leftId;
                        const rightKey = pair.right ?? pair.rightId;
                        return {
                            left: leftIdToIndex[leftKey] ?? leftKey,
                            right: rightIdToIndex[rightKey] ?? rightKey
                        };
                    });
                } else if (typeof answer.studentAnswer === 'object' && answer.studentAnswer !== null) {
                    studentPairs = Object.entries(answer.studentAnswer).map(([left, right]) => ({
                        left: leftIdToIndex[left] ?? left,
                        right: rightIdToIndex[right as string] ?? right
                    }));
                }

                // Convert correctPairs to index-based { leftIndex: rightIndex } format
                const parsedCorrect = safeParseJSON(answer.correctAnswer);
                let correctPairsIndexed: Record<number, number> = {};

                // Handle new format: { matches: [{leftId, rightId}] }
                if (parsedCorrect?.matches && Array.isArray(parsedCorrect.matches)) {
                    parsedCorrect.matches.forEach((match: any) => {
                        const leftIdx = leftIdToIndex[match.leftId];
                        const rightIdx = rightIdToIndex[match.rightId];
                        if (leftIdx !== undefined && rightIdx !== undefined) {
                            correctPairsIndexed[leftIdx] = rightIdx;
                        }
                    });
                }
                // Handle old format: { pairs: {0: 1} } or direct {0: 1}
                else if (parsedCorrect?.pairs) {
                    correctPairsIndexed = parsedCorrect.pairs;
                } else if (typeof parsedCorrect === 'object' && !Array.isArray(parsedCorrect)) {
                    correctPairsIndexed = parsedCorrect;
                }

                return (
                    <div className="space-y-3">
                        <div className="font-medium mb-2"><MathHtmlRenderer html={answer.questionText} /></div>
                        <MatchingResultViewer
                            question={{
                                id: answer.questionId,
                                questionText: answer.questionText,
                                leftItems,
                                rightItems
                            }}
                            studentPairs={studentPairs}
                            correctPairs={correctPairsIndexed}
                        />
                        {/* Legacy Key View (Optional, maybe hidden or collapsed) */}
                        <details className="text-xs text-muted-foreground cursor-pointer mt-4">
                            <summary>Lihat Kunci Jawaban (Teks)</summary>
                            <div className="mt-2 p-2 bg-muted/20 rounded border">
                                {Object.entries(correctPairsIndexed).map(([left, right]: [string, any], idx) => {
                                    const rightIndices = Array.isArray(right) ? right : [right];
                                    const leftItem = leftItems[parseInt(left)];
                                    const leftText = typeof leftItem === 'object' && leftItem?.text ? leftItem.text : leftItem;
                                    return rightIndices.map((rIndex: number, rIdx: number) => {
                                        const rightItem = rightItems[rIndex];
                                        const rightText = typeof rightItem === 'object' && rightItem?.text ? rightItem.text : rightItem;

                                        return (
                                            <div key={`${idx}-${rIdx}`} className="flex gap-2 py-1">
                                                <div className="font-medium flex-1"><MathHtmlRenderer html={leftText} /></div>
                                                <span>→</span>
                                                <div className="flex-1"><MathHtmlRenderer html={rightText} /></div>
                                            </div>
                                        );
                                    });
                                })}
                            </div>
                        </details>
                    </div>
                );
            }

            case "short":
                const studentAns = typeof answer.studentAnswer === 'string' ? answer.studentAnswer : JSON.stringify(answer.studentAnswer);
                const correctAns = typeof answer.correctAnswer === 'string' ? answer.correctAnswer : JSON.stringify(answer.correctAnswer);

                return (
                    <div className="space-y-3">
                        <div className="font-medium"><MathHtmlRenderer html={answer.questionText} /></div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className={`p-4 rounded-lg border ${answer.isCorrect ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-600" : "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600"}`}>
                                <p className="text-sm text-muted-foreground mb-1">Jawaban Siswa:</p>
                                <p className="font-medium">{studentAns || "(tidak dijawab)"}</p>
                            </div>
                            <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-600">
                                <p className="text-sm text-muted-foreground mb-1">Jawaban Benar:</p>
                                <div className="font-medium"><MathHtmlRenderer html={correctAns} /></div>
                            </div>
                        </div>
                    </div>
                );

            case "essay":
                return (
                    <div className="space-y-3">
                        <div className="font-medium"><MathHtmlRenderer html={answer.questionText} /></div>
                        <div className="p-4 rounded-lg border bg-muted/30">
                            <p className="text-sm text-muted-foreground mb-2">Jawaban Siswa:</p>
                            <p className="whitespace-pre-wrap">
                                {typeof answer.studentAnswer === 'string' ? answer.studentAnswer : JSON.stringify(answer.studentAnswer) || "(tidak dijawab)"}
                            </p>
                        </div>
                        {answer.gradingStatus === "manual" && answer.gradingNotes && (
                            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600">
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
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
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
