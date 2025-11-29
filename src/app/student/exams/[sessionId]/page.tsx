"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, Flag, Send, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
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
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Memuat soal ujian...</p>
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        return <div className="flex items-center justify-center min-h-screen">Tidak ada soal</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div>
                        <h1 className="font-bold text-lg">Ujian Berlangsung</h1>
                        <p className="text-sm text-muted-foreground">
                            Soal {currentQuestionIndex + 1} dari {questions.length}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {autoSaving && <span className="text-sm text-muted-foreground">Menyimpan...</span>}
                        <div className={`flex items-center gap-2 ${timeRemaining < 300 ? "text-red-600" : ""}`}>
                            <Clock className="h-5 w-5" />
                            <span className="font-mono font-bold text-lg">{formatTime(timeRemaining)}</span>
                        </div>
                        <Button onClick={() => setShowSubmitDialog(true)} variant="default">
                            <Send className="mr-2 h-4 w-4" />
                            Kumpulkan
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="p-4 sticky top-24">
                        <h3 className="font-semibold mb-3">Navigasi Soal</h3>
                        <div className="grid grid-cols-5 gap-2 mb-4">
                            {questions.map((q, idx) => {
                                const answer = answers.get(q.id);
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentQuestionIndex(idx)}
                                        className={`
                                            aspect-square rounded flex items-center justify-center text-sm font-medium
                                            ${idx === currentQuestionIndex ? "bg-primary text-white" : ""}
                                            ${answer?.answer ? "bg-green-100 text-green-700" : "bg-gray-100"}
                                            ${answer?.isFlagged ? "ring-2 ring-yellow-500" : ""}
                                            hover:opacity-80 transition-all
                                        `}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Dijawab:</span>
                                <span className="font-semibold">{answeredCount}/{questions.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Ditandai:</span>
                                <span className="font-semibold text-yellow-600">{flaggedCount}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Question Content */}
                <div className="lg:col-span-3">
                    <Card className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <Badge variant="outline" className="mb-2">
                                    {currentQuestion.type === "mc" ? "Pilihan Ganda" :
                                        currentQuestion.type === "complex_mc" ? "Pilihan Ganda Kompleks" :
                                            currentQuestion.type === "matching" ? "Menjodohkan" :
                                                currentQuestion.type === "short" ? "Jawaban Singkat" :
                                                    "Essay"}
                                </Badge>
                                <h2 className="text-xl font-semibold mb-2">
                                    Soal {currentQuestionIndex + 1}
                                </h2>
                            </div>
                            <Button
                                variant={currentAnswer?.isFlagged ? "default" : "outline"}
                                size="sm"
                                onClick={toggleFlag}
                            >
                                <Flag className="mr-2 h-4 w-4" />
                                {currentAnswer?.isFlagged ? "Ditandai" : "Tandai"}
                            </Button>
                        </div>

                        <div className="mb-6">
                            <p className="text-lg whitespace-pre-wrap">{currentQuestion.questionText}</p>
                            <p className="text-sm text-muted-foreground mt-2">Bobot: {currentQuestion.points} poin</p>
                        </div>

                        {/* Question Renderer */}
                        <QuestionRenderer
                            question={currentQuestion}
                            answer={currentAnswer?.answer}
                            onChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                        />

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-8 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                disabled={currentQuestionIndex === 0}
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Sebelumnya
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                                disabled={currentQuestionIndex === questions.length - 1}
                            >
                                Selanjutnya
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Submit Confirmation Dialog */}
            <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kumpulkan Ujian?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Anda telah menjawab {answeredCount} dari {questions.length} soal.
                            {answeredCount < questions.length && (
                                <span className="text-yellow-600 font-semibold block mt-2">
                                    <AlertCircle className="inline h-4 w-4 mr-1" />
                                    Masih ada {questions.length - answeredCount} soal yang belum dijawab!
                                </span>
                            )}
                            <p className="mt-2">Setelah dikumpulkan, Anda tidak dapat mengubah jawaban.</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
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
            <div className="space-y-3">
                {question.options?.map((option) => (
                    <label
                        key={option.label}
                        className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${answer === option.label ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                            }`}
                    >
                        <input
                            type="radio"
                            name="answer"
                            value={option.label}
                            checked={answer === option.label}
                            onChange={(e) => onChange(e.target.value)}
                            className="mt-1"
                        />
                        <div className="flex-1">
                            <span className="font-semibold mr-2">{option.label}.</span>
                            <span>{option.text}</span>
                        </div>
                    </label>
                ))}
            </div>
        );
    }

    if (question.type === "complex_mc") {
        const selectedAnswers = answer || [];
        return (
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-2">Pilih semua jawaban yang benar</p>
                {question.options?.map((option) => (
                    <label
                        key={option.label}
                        className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedAnswers.includes(option.label) ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                            }`}
                    >
                        <input
                            type="checkbox"
                            value={option.label}
                            checked={selectedAnswers.includes(option.label)}
                            onChange={(e) => {
                                const newAnswers = e.target.checked
                                    ? [...selectedAnswers, option.label]
                                    : selectedAnswers.filter((a: string) => a !== option.label);
                                onChange(newAnswers);
                            }}
                            className="mt-1"
                        />
                        <div className="flex-1">
                            <span className="font-semibold mr-2">{option.label}.</span>
                            <span>{option.text}</span>
                        </div>
                    </label>
                ))}
            </div>
        );
    }

    if (question.type === "short") {
        return (
            <div>
                <input
                    type="text"
                    value={answer || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full p-3 border-2 rounded-lg focus:border-primary focus:outline-none"
                    placeholder="Ketik jawaban Anda di sini..."
                />
            </div>
        );
    }

    if (question.type === "essay") {
        return (
            <div>
                <textarea
                    value={answer || ""}
                    onChange={(e) => onChange(e.target.value)}
                    rows={10}
                    className="w-full p-3 border-2 rounded-lg focus:border-primary focus:outline-none resize-none"
                    placeholder="Ketik jawaban essay Anda di sini..."
                />
                <p className="text-sm text-muted-foreground mt-2">
                    {answer ? `${answer.length} karakter` : "0 karakter"}
                </p>
            </div>
        );
    }

    if (question.type === "matching") {
        const pairs = answer || {};
        return (
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-2">Jodohkan pernyataan di sebelah kiri dengan pilihan yang sesuai</p>
                {question.pairs?.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1 font-medium">{pair.left}</div>
                        <div className="text-muted-foreground">→</div>
                        <select
                            value={pairs[pair.left] || ""}
                            onChange={(e) => onChange({ ...pairs, [pair.left]: e.target.value })}
                            className="flex-1 p-2 border rounded"
                        >
                            <option value="">Pilih jawaban...</option>
                            {question.pairs?.map((p, i) => (
                                <option key={i} value={p.right}>{p.right}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
        );
    }

    return <div>Tipe soal tidak dikenali</div>;
}
