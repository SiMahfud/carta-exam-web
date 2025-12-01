"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Send, Check, X } from "lucide-react";
import Link from "next/link";
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
    isCorrect: boolean;
    score: number;
    maxPoints: number;
    partialPoints: number;
    gradingStatus: string;
    gradingNotes: string | null;
    defaultPoints: number;
}

interface Submission {
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
    endTime: string;
    violationCount: number;
}

export default function GradingDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [grades, setGrades] = useState<Map<string, { score: number; comment: string }>>(new Map());

    useEffect(() => {
        fetchSubmissionDetails();
    }, []);

    const fetchSubmissionDetails = async () => {
        try {
            const response = await fetch(`/api/grading/submissions/${params.id}`);
            if (response.ok) {
                const data = await response.json();
                setSubmission(data.submission);
                setAnswers(data.answers);

                // Initialize grades map with existing data
                const initialGrades = new Map();
                data.answers.forEach((a: Answer) => {
                    initialGrades.set(a.answerId, {
                        score: a.partialPoints,
                        comment: a.gradingNotes || "",
                    });
                });
                setGrades(initialGrades);
            }
        } catch (error) {
            console.error("Error fetching submission:", error);
            toast({
                title: "Error",
                description: "Gagal memuat detail pengumpulan",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGradeChange = (answerId: string, score: number, comment: string) => {
        const newGrades = new Map(grades);
        newGrades.set(answerId, { score, comment });
        setGrades(newGrades);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = Array.from(grades.entries()).map(([answerId, data]) => ({
                answerId,
                score: data.score,
                gradingNotes: data.comment,
            }));

            const response = await fetch(`/api/grading/submissions/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answerUpdates: updates }),
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Penilaian berhasil disimpan",
                });
                fetchSubmissionDetails(); // Refresh data
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal menyimpan penilaian",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        setPublishing(true);
        try {
            const response = await fetch(`/api/grading/submissions/${params.id}/publish`, {
                method: "POST",
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Hasil ujian berhasil dipublikasikan",
                });
                router.push("/admin/grading");
            } else {
                const error = await response.json();
                throw new Error(error.error || "Failed to publish");
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setPublishing(false);
        }
    };

    const renderAnswer = (answer: Answer) => {
        const grade = grades.get(answer.answerId) || { score: answer.partialPoints, comment: "" };

        if (answer.type === "essay") {
            const rubric = (answer.correctAnswer as any)?.rubric || [];
            const guidelines = (answer.correctAnswer as any)?.guidelines || "";

            return (
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold mb-2">Jawaban Siswa:</h4>
                        <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                            {answer.studentAnswer || <span className="text-muted-foreground italic">Tidak ada jawaban</span>}
                        </div>
                    </div>

                    {guidelines && (
                        <div>
                            <h4 className="font-semibold mb-2">Panduan Penilaian:</h4>
                            <p className="text-sm text-muted-foreground">{guidelines}</p>
                        </div>
                    )}

                    {rubric.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2">Rubrik:</h4>
                            <div className="space-y-2">
                                {rubric.map((r: any, idx: number) => (
                                    <div key={idx} className="flex gap-2 text-sm">
                                        <Badge variant="outline">{r.points} poin</Badge>
                                        <span>{r.criteria}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Nilai (Max: {answer.maxPoints})
                            </label>
                            <Input
                                type="number"
                                min="0"
                                max={answer.maxPoints}
                                value={grade.score}
                                onChange={(e) => handleGradeChange(
                                    answer.answerId,
                                    parseFloat(e.target.value) || 0,
                                    grade.comment
                                )}
                                className="w-full"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-2">Komentar (Opsional)</label>
                            <Textarea
                                value={grade.comment}
                                onChange={(e) => handleGradeChange(
                                    answer.answerId,
                                    grade.score,
                                    e.target.value
                                )}
                                placeholder="Berikan feedback untuk siswa..."
                                rows={3}
                            />
                        </div>
                    </div>
                </div>
            );
        }

        if (answer.type === "matching") {
            let studentPairs: any[] = [];
            if (Array.isArray(answer.studentAnswer)) {
                studentPairs = answer.studentAnswer;
            } else if (typeof answer.studentAnswer === 'object' && answer.studentAnswer !== null) {
                // Convert legacy object format { "left": "right" } to array [{ left: "left", right: "right" }]
                studentPairs = Object.entries(answer.studentAnswer).map(([left, right]) => ({
                    left,
                    right
                }));
            }

            const correctPairs = (answer.correctAnswer as any)?.pairs || {};
            const leftItems = (answer.questionContent as any)?.leftItems || [];
            const rightItems = (answer.questionContent as any)?.rightItems || [];

            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        {answer.isCorrect ? (
                            <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Benar</Badge>
                        ) : (
                            <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Salah</Badge>
                        )}
                        <span className="text-sm">
                            Poin: {answer.partialPoints}/{answer.maxPoints}
                        </span>
                    </div>

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
                    <details className="text-xs text-muted-foreground cursor-pointer">
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
        }

        if (answer.type === "complex_mc") {
            const selectedOptions = Array.isArray(answer.studentAnswer) ? answer.studentAnswer : [];
            const correctOptions = (answer.correctAnswer as any)?.correctOptions || [];
            const options = (answer.questionContent as any)?.options || [];

            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        {answer.isCorrect ? (
                            <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Benar</Badge>
                        ) : (
                            <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Salah</Badge>
                        )}
                        <span className="text-sm">
                            Poin: {answer.partialPoints}/{answer.maxPoints}
                        </span>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-2 border-b grid grid-cols-[1fr,100px,100px] gap-4 text-sm font-medium">
                            <div>Opsi Jawaban</div>
                            <div className="text-center">Pilihan Siswa</div>
                            <div className="text-center">Kunci</div>
                        </div>
                        <div className="divide-y">
                            {options.map((opt: any) => {
                                const isSelected = selectedOptions.includes(opt.label);
                                const isCorrect = correctOptions.includes(opt.label);
                                let rowClass = "";

                                if (isSelected && isCorrect) rowClass = "bg-green-50";
                                else if (isSelected && !isCorrect) rowClass = "bg-red-50";
                                else if (!isSelected && isCorrect) rowClass = "bg-yellow-50";

                                return (
                                    <div key={opt.label} className={`px-4 py-3 grid grid-cols-[1fr,100px,100px] gap-4 text-sm items-center ${rowClass}`}>
                                        <div>
                                            <span className="font-semibold mr-2">{opt.label}.</span>
                                            {opt.text}
                                        </div>
                                        <div className="flex justify-center">
                                            {isSelected && (
                                                <div className="h-5 w-5 rounded bg-primary text-primary-foreground flex items-center justify-center">
                                                    <Check className="h-3 w-3" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-center">
                                            {isCorrect && <Check className="h-5 w-5 text-green-600" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        // Default fallback for MC and Short Answer
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    {answer.isCorrect ? (
                        <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Benar</Badge>
                    ) : (
                        <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Salah</Badge>
                    )}
                    <span className="text-sm">
                        Poin: {answer.partialPoints}/{answer.maxPoints}
                    </span>
                </div>
                <div>
                    <p className="text-sm font-medium mb-1">Jawaban Siswa:</p>
                    <p className="text-sm text-muted-foreground">
                        {typeof answer.studentAnswer === 'object'
                            ? JSON.stringify(answer.studentAnswer)
                            : answer.studentAnswer || "-"}
                    </p>
                </div>
                {answer.type !== "essay" && (
                    <div>
                        <p className="text-sm font-medium mb-1">Jawaban Benar:</p>
                        <p className="text-sm text-green-600">
                            {typeof answer.correctAnswer === 'object'
                                ? JSON.stringify(answer.correctAnswer)
                                : answer.correctAnswer}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="flex justify-center py-20">Memuat data...</div>;
    }

    if (!submission) {
        return <div className="text-center py-20">Data tidak ditemukan</div>;
    }

    const essayCount = answers.filter(a => a.type === "essay").length;
    const gradedEssayCount = answers.filter(a => a.type === "essay" && a.gradingStatus !== "pending_manual").length;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/grading">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold tracking-tight">{submission.sessionName}</h2>
                    <p className="text-muted-foreground">Siswa: {submission.studentName}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSave} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Menyimpan..." : "Simpan"}
                    </Button>
                    <Button onClick={handlePublish} disabled={publishing || submission.gradingStatus === "pending_manual"}>
                        <Send className="mr-2 h-4 w-4" />
                        {publishing ? "Mempublikasi..." : "Publikasikan"}
                    </Button>
                </div>
            </div>

            {/* Summary Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Poin</p>
                            <p className="text-2xl font-bold">{submission.earnedPoints}/{submission.totalPoints}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Nilai Akhir</p>
                            <p className="text-2xl font-bold">{submission.score || "-"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Essay</p>
                            <p className="text-2xl font-bold">{gradedEssayCount}/{essayCount}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pelanggaran</p>
                            <p className="text-2xl font-bold text-yellow-600">{submission.violationCount}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Questions List */}
            <div className="space-y-4">
                {answers.map((answer, idx) => (
                    <Card key={answer.answerId}>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span>Soal {idx + 1}</span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                        {answer.type === "mc" ? "Pilihan Ganda" :
                                            answer.type === "complex_mc" ? "PG Kompleks" :
                                                answer.type === "matching" ? "Menjodohkan" :
                                                    answer.type === "short" ? "Jawaban Singkat" :
                                                        "Essay"}
                                    </Badge>
                                    {answer.isFlagged && (
                                        <Badge variant="destructive">Ditandai</Badge>
                                    )}
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-medium mb-4">{answer.questionText}</p>
                            {renderAnswer(answer)}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
