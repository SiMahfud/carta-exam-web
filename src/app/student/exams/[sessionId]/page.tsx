"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Flag, ChevronLeft, ChevronRight } from "lucide-react";

// Components
import { ExamHeader } from "@/components/exam/take-exam/ExamHeader";
import { ExamSidebar } from "@/components/exam/take-exam/ExamSidebar";
import { QuestionRenderer } from "@/components/exam/take-exam/QuestionRenderer";
import { SubmitDialog } from "@/components/exam/take-exam/SubmitDialog";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";

// Types
import { Question, Answer } from "@/components/exam/take-exam/types";

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
    const [studentId, setStudentId] = useState<string | null>(null);

    const sessionId = params.sessionId as string;

    useEffect(() => {
        fetchStudentId();
    }, []);

    useEffect(() => {
        if (studentId) {
            fetchQuestions();
        }
    }, [studentId]);

    const fetchStudentId = async () => {
        try {
            const response = await fetch("/api/auth/session");
            if (response.ok) {
                const data = await response.json();
                setStudentId(data.user.id);
            } else {
                router.push("/login");
            }
        } catch (error) {
            console.error("Error fetching session:", error);
            router.push("/login");
        }
    };

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
        if (!studentId) return;

        try {
            const response = await fetch(`/api/student/exams/${sessionId}/questions?studentId=${studentId}`);
            if (response.ok) {
                const data = await response.json();
                setQuestions(data.questions);
                setEndTime(new Date(data.endTime));

                // Restore answers if available
                if (data.answers) {
                    const restoredAnswers = new Map<string, Answer>();
                    Object.entries(data.answers).forEach(([qId, ans]: [string, any]) => {
                        restoredAnswers.set(qId, {
                            questionId: qId,
                            answer: ans.answer,
                            isFlagged: ans.isFlagged
                        });
                    });
                    setAnswers(restoredAnswers);
                }
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

    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : null;
    const answeredCount = answers.size;

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
            <ExamHeader
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={questions.length}
                timeRemaining={timeRemaining}
                autoSaving={autoSaving}
                onShowSubmit={() => setShowSubmitDialog(true)}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
            />

            <div className="flex-1 container mx-auto px-4 py-6 flex gap-6 relative">
                <ExamSidebar
                    questions={questions}
                    answers={answers}
                    currentQuestionIndex={currentQuestionIndex}
                    setCurrentQuestionIndex={setCurrentQuestionIndex}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                />

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
                                <div className="text-lg md:text-xl leading-relaxed text-foreground font-medium">
                                    <MathHtmlRenderer html={currentQuestion.questionText} />
                                </div>
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

            <SubmitDialog
                open={showSubmitDialog}
                onOpenChange={setShowSubmitDialog}
                answeredCount={answeredCount}
                totalQuestions={questions.length}
                onSubmit={handleSubmit}
                submitting={submitting}
            />
        </div>
    );
}
