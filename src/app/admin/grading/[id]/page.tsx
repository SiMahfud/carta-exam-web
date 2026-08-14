"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Send, ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import Link from "next/link";
import { GradingItemCard } from "@/components/grading/GradingItemCard";

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
    const [pendingSubmissions, setPendingSubmissions] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);







    const fetchPendingSubmissions = useCallback(async () => {
        try {
            // Fetch all pending submissions to enable navigation
            const response = await fetch("/api/grading/submissions?status=pending_manual&limit=1000");
            if (response.ok) {
                const data = await response.json();
                const ids = data.data.map((s: any) => s.id);
                setPendingSubmissions(ids);

                const index = ids.indexOf(params.id);
                setCurrentIndex(index);
            }
        } catch (error) {
            console.error("Error fetching pending submissions:", error);
        }
    }, [params.id]);

    const navigateToNext = useCallback(() => {
        if (currentIndex >= 0 && currentIndex < pendingSubmissions.length - 1) {
            const nextId = pendingSubmissions[currentIndex + 1];
            router.push(`/admin/grading/${nextId}`);
        }
    }, [currentIndex, pendingSubmissions, router]);

    const navigateToPrevious = useCallback(() => {
        if (currentIndex > 0) {
            const prevId = pendingSubmissions[currentIndex - 1];
            router.push(`/admin/grading/${prevId}`);
        }
    }, [currentIndex, pendingSubmissions, router]);

    const skipToNext = () => {
        navigateToNext();
    };

    const fetchSubmissionDetails = useCallback(async () => {
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
    }, [params.id, toast]);

    useEffect(() => {
        fetchSubmissionDetails();
        fetchPendingSubmissions();
    }, [fetchSubmissionDetails, fetchPendingSubmissions]);

    const handleGradeChange = (answerId: string, score: number, comment: string) => {
        const newGrades = new Map(grades);
        newGrades.set(answerId, { score, comment });
        setGrades(newGrades);
    };

    const handleSave = useCallback(async () => {
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
        } catch {
            toast({
                title: "Error",
                description: "Gagal menyimpan penilaian",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }, [grades, params.id, toast, fetchSubmissionDetails]);

    const handlePublish = useCallback(async () => {
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
    }, [params.id, router, toast]);

    useEffect(() => {
        // Handle keyboard navigation
        const handleKeyPress = (e: KeyboardEvent) => {
            // ALT + S for Save
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                handleSave();
            }

            // ALT + P for Publish
            if (e.altKey && e.key === 'p') {
                e.preventDefault();
                handlePublish();
            }

            // n for next
            if (e.key === 'n' && currentIndex < pendingSubmissions.length - 1) {
                e.preventDefault();
                navigateToNext();
            }

            // p for previous
            if (e.key === 'p' && currentIndex > 0) {
                e.preventDefault();
                navigateToPrevious();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [
        submission,
        currentIndex,
        pendingSubmissions,
        navigateToNext,
        navigateToPrevious,
        handleSave,
        handlePublish
    ]);

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
                    {currentIndex >= 0 && pendingSubmissions.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                            {currentIndex + 1} dari {pendingSubmissions.length} submission
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    {currentIndex > 0 && (
                        <Button variant="outline" size="icon" onClick={navigateToPrevious} title="Previous (P)">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    )}
                    {currentIndex >= 0 && currentIndex < pendingSubmissions.length - 1 && (
                        <>
                            <Button variant="outline" onClick={skipToNext}>
                                <SkipForward className="mr-2 h-4 w-4" />
                                Skip
                            </Button>
                            <Button variant="outline" size="icon" onClick={navigateToNext} title="Next (N)">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    <Button variant="outline" onClick={handleSave} disabled={saving} title="Ctrl+S">
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Menyimpan..." : "Simpan"}
                    </Button>
                    <Button onClick={handlePublish} disabled={publishing || submission.gradingStatus === "pending_manual"} title="Ctrl+Enter">
                        <Send className="mr-2 h-4 w-4" />
                        {publishing ? "Mempublikasi..." : "Publikasikan"}
                    </Button>
                </div>
            </div>

            {/* Keyboard Shortcuts Help */}
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
                <span className="font-medium">Shortcut:</span> Ctrl+S (Simpan) • Ctrl+Enter (Publikasi) • N (Next) • P (Previous)
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
                {answers.map((answer, idx) => {
                    const grade = grades.get(answer.answerId) || { score: answer.partialPoints, comment: "" };
                    return (
                        <GradingItemCard
                            key={answer.answerId}
                            answer={answer}
                            index={idx}
                            grade={grade}
                            onGradeChange={handleGradeChange}
                        />
                    );
                })}
            </div>
        </div>
    );
}

