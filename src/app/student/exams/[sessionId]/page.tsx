"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, Flag, Send, AlertCircle, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Question {
    id: string;
    type: "mc" | "complex_mc" | "matching" | "short" | "essay";
    questionText: string;
    options?: { label: string; text: string }[];
    pairs?: { left: string; right: string }[];
    points: number;
}

interface Answer {
    questionId: string;
    answer: any;
    isFlagged: boolean;
}

export default function TakeExamPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [autoSaving, setAutoSaving] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const studentId = "student-1"; // TODO: Get from auth
    const sessionId = params.sessionId as string;

    useEffect(() => {
        fetchQuestions();
    }, []);

    useEffect(() => {
        if (!endTime) return;

        const interval = setInterval(() => {
            const now = new Date();
            const remaining = Math.max(0, endTime.getTime() - now.getTime());
            setTimeRemaining(Math.floor(remaining / 1000));

            if (remaining <= 0) {
                handleAutoSubmit();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    const fetchQuestions = async () => {
        try {
            const response = await fetch(`/api/student/exams/${sessionId}/questions?studentId=${studentId}`);
            if (response.ok) {
                const data = await response.json();
                setQuestions(data.questions);
                setEndTime(new Date(data.endTime));
            } else {
                throw new Error("Failed to load questions");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal memuat soal ujian",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const saveAnswer = useCallback(async (questionId: string, answer: any, isFlagged: boolean = false) => {
        setAutoSaving(true);
        try {
            await fetch(`/api/student/exams/${sessionId}/answer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, questionId, answer, isFlagged }),
            });
        } catch (error) {
            console.error("Error saving answer:", error);
        } finally {
            setAutoSaving(false);
        }
    }, [sessionId, studentId]);

    const handleAnswerChange = (questionId: string, answer: any) => {
        const newAnswers = new Map(answers);
        const existing = newAnswers.get(questionId);
        newAnswers.set(questionId, {
            questionId,
            answer,
            isFlagged: existing?.isFlagged || false
        });
        setAnswers(newAnswers);
        saveAnswer(questionId, answer, existing?.isFlagged || false);
    };

    const toggleFlag = () => {
        const question = questions[currentQuestionIndex];
        const newAnswers = new Map(answers);
        const existing = newAnswers.get(question.id) || { questionId: question.id, answer: null, isFlagged: false };
        existing.isFlagged = !existing.isFlagged;
        newAnswers.set(question.id, existing);
        setAnswers(newAnswers);
        saveAnswer(question.id, existing.answer, existing.isFlagged);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const response = await fetch(`/api/student/exams/${sessionId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId }),
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Ujian berhasil dikumpulkan",
                });
                router.push("/student/exams");
            } else {
                throw new Error("Failed to submit");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal mengumpulkan ujian",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleAutoSubmit = () => {
        toast({
            title: "Waktu Habis",
            description: "Ujian otomatis dikumpulkan",
        });
        handleSubmit();
    };

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : null;
    const answeredCount = answers.size;
    const flaggedCount = Array.from(answers.values()).filter(a => a.isFlagged).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground animate-pulse">Memuat soal ujian...</p>
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        return <div className="flex items-center justify-center min-h-screen">Tidak ada soal</div>;
    }

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col">
            {/* Header */}
            <header className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-20">
                <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <Menu className="h-6 w-6" />
                        </Button>
                        <div>
                            <h1 className="font-bold text-lg hidden sm:block">Ujian Berlangsung</h1>
                            <p className="text-sm text-muted-foreground">
                                Soal {currentQuestionIndex + 1} <span className="text-muted-foreground/60">/ {questions.length}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-6">
                        {autoSaving && <span className="text-xs text-muted-foreground animate-pulse hidden sm:inline-block">Menyimpan...</span>}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 ${timeRemaining < 300 ? "text-destructive bg-destructive/10" : "text-primary"}`}>
                            <Clock className="h-4 w-4" />
                            <span className="font-mono font-bold text-lg">{formatTime(timeRemaining)}</span>
                        </div>
                        <Button onClick={() => setShowSubmitDialog(true)} size="sm" className="shadow-lg shadow-primary/20">
                            <Send className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Kumpulkan</span>
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex-1 container mx-auto px-4 py-6 flex gap-6 relative">
                {/* Navigation Sidebar (Desktop) */}
                <aside className={`
                    fixed inset-y-0 left-0 z-30 w-72 bg-background border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block lg:w-80 lg:bg-transparent lg:border-none
                    ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
                `}>
                    <div className="h-full flex flex-col p-4 lg:p-0">
                        <div className="flex justify-between items-center mb-6 lg:hidden">
                            <h3 className="font-bold text-lg">Navigasi Soal</h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-none lg:border lg:shadow-sm bg-background/50 backdrop-blur-sm">
                            <div className="p-4 border-b bg-muted/20">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-background p-2 rounded-md border text-center">
                                        <div className="text-muted-foreground text-xs mb-1">Dijawab</div>
                                        <div className="font-bold text-green-600 text-lg">{answeredCount}</div>
                                    </div>
                                    <div className="bg-background p-2 rounded-md border text-center">
                                        <div className="text-muted-foreground text-xs mb-1">Ditandai</div>
                                        <div className="font-bold text-yellow-600 text-lg">{flaggedCount}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="grid grid-cols-5 gap-2">
                                    {questions.map((q, idx) => {
                                        const answer = answers.get(q.id);
                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => {
                                                    setCurrentQuestionIndex(idx);
                                                    setIsSidebarOpen(false);
                                                }}
                                                className={`
                                                    aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-200
                                                    ${idx === currentQuestionIndex
                                                        ? "bg-primary text-primary-foreground shadow-md scale-105 ring-2 ring-primary ring-offset-2"
                                                        : "bg-background hover:bg-muted border hover:border-primary/50"}
                                                    ${answer?.answer && idx !== currentQuestionIndex ? "bg-green-50 text-green-700 border-green-200" : ""}
                                                    ${answer?.isFlagged ? "ring-2 ring-yellow-400 ring-offset-1" : ""}
                                                `}
                                            >
                                                {idx + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>
                    </div>
                </aside>

                {/* Overlay for mobile sidebar */}
                {isSidebarOpen && (
                    <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
                )}

                {/* Main Content */}
                <main className="flex-1 min-w-0">
                    <Card className="h-full flex flex-col shadow-sm border-none lg:border">
                        <div className="p-6 border-b flex justify-between items-start gap-4 bg-muted/10">
                            <div className="space-y-1">
                                <Badge variant="outline" className="bg-background">
                                    {currentQuestion.type === "mc" ? "Pilihan Ganda" :
                                        currentQuestion.type === "complex_mc" ? "Pilihan Ganda Kompleks" :
                                            currentQuestion.type === "matching" ? "Menjodohkan" :
                                                currentQuestion.type === "short" ? "Jawaban Singkat" :
                                                    "Essay"}
                                </Badge>
                                <div className="text-sm text-muted-foreground">
                                    Bobot: <span className="font-medium text-foreground">{currentQuestion.points} poin</span>
                                </div>
                            </div>
                            <Button
                                variant={currentAnswer?.isFlagged ? "default" : "outline"}
                                size="sm"
                                onClick={toggleFlag}
                                className={currentAnswer?.isFlagged ? "bg-yellow-500 hover:bg-yellow-600 text-white border-none" : "hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200"}
                            >
                                <Flag className={`mr-2 h-4 w-4 ${currentAnswer?.isFlagged ? "fill-current" : ""}`} />
                                {currentAnswer?.isFlagged ? "Ditandai" : "Tandai"}
                            </Button>
                        </div>

                        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                            <div className="prose max-w-none mb-8">
                                <p className="text-lg md:text-xl leading-relaxed text-foreground font-medium">
                                    {currentQuestion.questionText}
                                </p>
                            </div>

                            <QuestionRenderer
                                question={currentQuestion}
                                answer={currentAnswer?.answer}
                                onChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                            />
                        </div>

                        <div className="p-4 border-t bg-muted/10 flex justify-between items-center gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="w-32"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Sebelumnya
                            </Button>

                            {/* Progress Dots (Mobile) */}
                            <div className="flex gap-1 lg:hidden">
                                {questions.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 w-1.5 rounded-full ${i === currentQuestionIndex ? "bg-primary" : "bg-muted"}`}
                                    />
                                )).slice(Math.max(0, currentQuestionIndex - 2), Math.min(questions.length, currentQuestionIndex + 3))}
                            </div>

                            <Button
                                onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                                disabled={currentQuestionIndex === questions.length - 1}
                                className="w-32 shadow-lg shadow-primary/10"
                            >
                                Selanjutnya
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                </main>
            </div>

            {/* Submit Confirmation Dialog */}
            <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kumpulkan Ujian?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Anda telah menjawab {answeredCount} dari {questions.length} soal.
                            {answeredCount < questions.length && (
                                <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-md flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <span>
                                        Masih ada <strong>{questions.length - answeredCount}</strong> soal yang belum dijawab. Yakin ingin mengumpulkan?
                                    </span>
                                </div>
                            )}
                            <p className="mt-4 text-sm text-muted-foreground">
                                Pastikan Anda telah memeriksa kembali jawaban Anda. Setelah dikumpulkan, Anda tidak dapat mengubah jawaban.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Periksa Kembali</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmit} disabled={submitting} className="bg-primary hover:bg-primary/90">
                            {submitting ? "Mengumpulkan..." : "Ya, Kumpulkan"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Question Renderer Component
function QuestionRenderer({ question, answer, onChange }: { question: Question; answer: any; onChange: (answer: any) => void }) {
    if (question.type === "mc") {
        return (
            <div className="space-y-3 max-w-3xl">
                {question.options?.map((option) => (
                    <label
                        key={option.label}
                        className={`
                            flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group
                            ${answer === option.label
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-muted bg-background hover:border-primary/30 hover:bg-muted/30"}
                        `}
                    >
                        <div className={`
                            flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 transition-colors
                            ${answer === option.label
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 text-muted-foreground group-hover:border-primary/50"}
                        `}>
                            {answer === option.label && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                            {answer !== option.label && <span className="text-sm font-semibold">{option.label}</span>}
                        </div>

                        {/* Hidden radio for accessibility */}
                        <input
                            type="radio"
                            name="answer"
                            value={option.label}
                            checked={answer === option.label}
                            onChange={(e) => onChange(e.target.value)}
                            className="sr-only"
                        />

                        <div className="flex-1 pt-1">
                            <span className={`text-base ${answer === option.label ? "font-medium text-foreground" : "text-foreground/80"}`}>
                                {option.text}
                            </span>
                        </div>
                    </label>
                ))}
            </div>
        );
    }

    if (question.type === "complex_mc") {
        const selectedAnswers = answer || [];
        return (
            <div className="space-y-4 max-w-3xl">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 p-2 rounded-md w-fit">
                    <AlertCircle className="h-4 w-4" />
                    Pilih semua jawaban yang benar
                </div>
                {question.options?.map((option) => {
                    const isSelected = selectedAnswers.includes(option.label);
                    return (
                        <label
                            key={option.label}
                            className={`
                                flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                                ${isSelected
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-muted bg-background hover:border-primary/30 hover:bg-muted/30"}
                            `}
                        >
                            <div className={`
                                flex items-center justify-center w-6 h-6 rounded border-2 shrink-0 transition-colors mt-0.5
                                ${isSelected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/30 bg-background"}
                            `}>
                                {isSelected && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>

                            <input
                                type="checkbox"
                                value={option.label}
                                checked={isSelected}
                                onChange={(e) => {
                                    const newAnswers = e.target.checked
                                        ? [...selectedAnswers, option.label]
                                        : selectedAnswers.filter((a: string) => a !== option.label);
                                    onChange(newAnswers);
                                }}
                                className="sr-only"
                            />

                            <div className="flex-1">
                                <span className={`text-base ${isSelected ? "font-medium text-foreground" : "text-foreground/80"}`}>
                                    {option.text}
                                </span>
                            </div>
                        </label>
                    );
                })}
            </div>
        );
    }

    if (question.type === "short") {
        return (
            <div className="max-w-xl">
                <input
                    type="text"
                    value={answer || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full p-4 text-lg border-2 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all bg-background"
                    placeholder="Ketik jawaban singkat Anda di sini..."
                />
            </div>
        );
    }

    if (question.type === "essay") {
        return (
            <div className="max-w-3xl">
                <textarea
                    value={answer || ""}
                    onChange={(e) => onChange(e.target.value)}
                    rows={12}
                    className="w-full p-4 text-lg border-2 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none resize-none transition-all bg-background leading-relaxed"
                    placeholder="Ketik jawaban uraian Anda secara lengkap di sini..."
                />
                <div className="flex justify-end mt-2">
                    <span className="text-sm text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                        {answer ? answer.length : 0} karakter
                    </span>
                </div>
            </div>
        );
    }

    if (question.type === "matching") {
        const pairs = answer || {};
        return (
            <div className="space-y-4 max-w-3xl">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 p-2 rounded-md w-fit mb-4">
                    <AlertCircle className="h-4 w-4" />
                    Pasangkan pernyataan kiri dengan jawaban kanan
                </div>
                {question.pairs?.map((pair, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/10 rounded-xl border border-muted/50">
                        <div className="flex-1 font-medium text-foreground/90">{pair.left}</div>
                        <div className="hidden sm:block text-muted-foreground">→</div>
                        <div className="w-full sm:w-1/3">
                            <select
                                value={pairs[pair.left] || ""}
                                onChange={(e) => onChange({ ...pairs, [pair.left]: e.target.value })}
                                className="w-full p-2.5 border rounded-lg bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            >
                                <option value="">Pilih pasangan...</option>
                                {question.pairs?.map((p, i) => (
                                    <option key={i} value={p.right}>{p.right}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return <div>Tipe soal tidak dikenali</div>;
}
