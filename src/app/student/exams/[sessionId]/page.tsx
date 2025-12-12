"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useExamSecurity } from "@/hooks/use-exam-security";
import { Flag, ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";

// Components
import { ExamHeader } from "@/components/exam/take-exam/ExamHeader";
import { ExamSidebar } from "@/components/exam/take-exam/ExamSidebar";
import { QuestionRenderer } from "@/components/exam/take-exam/QuestionRenderer";
import { SubmitDialog } from "@/components/exam/take-exam/SubmitDialog";
import { FullscreenPrompt } from "@/components/exam/take-exam/FullscreenPrompt";
import { SecurityWarningBanner } from "@/components/exam/take-exam/SecurityWarningBanner";
import { TokenInputDialog } from "@/components/exam/take-exam/TokenInputDialog";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";

// Types
import { Question, Answer } from "@/components/exam/take-exam/types";

export default function TakeExamPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { isFullscreen, enterFullscreen, exitFullscreen, isSupported: fullscreenSupported } = useFullscreen();

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
    const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
    const [examStarted, setExamStarted] = useState(false);
    const [violationCount, setViolationCount] = useState(0);
    const [showViolationBanner, setShowViolationBanner] = useState(false);
    const [lastViolationType, setLastViolationType] = useState<string>("");
    const [examName, setExamName] = useState<string>("");
    const [minSubmitMinutes, setMinSubmitMinutes] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);

    // Token states
    const [showTokenDialog, setShowTokenDialog] = useState(false);
    const [tokenRequired, setTokenRequired] = useState(false);
    void tokenRequired; // Used to track token state
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [verifyingToken, setVerifyingToken] = useState(false);

    const sessionId = params.sessionId as string;

    // Security hook - only enabled after exam starts
    useExamSecurity({
        enabled: examStarted,
        onViolation: (violation) => {
            setViolationCount(prev => prev + 1);
            setLastViolationType(violation.type);
            setShowViolationBanner(true);
            // Auto-hide banner after 5 seconds
            setTimeout(() => setShowViolationBanner(false), 5000);

            // Log violation to backend
            logSecurityViolation(violation.type, violation.details);
        }
    });

    // Prevent escape from fullscreen during exam (including Android back button)
    useEffect(() => {
        if (!examStarted) return;

        // Push a dummy state to history so back button stays on this page
        const pushDummyState = () => {
            window.history.pushState({ examInProgress: true }, '', window.location.href);
        };

        // Initial push
        pushDummyState();

        const handleFullscreenChange = () => {
            // If user tries to exit fullscreen during exam, re-enter
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
                (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement
            );

            if (!isCurrentlyFullscreen && examStarted && !submitting) {
                toast({
                    title: "Mode Layar Penuh Diperlukan",
                    description: "Anda tidak dapat keluar dari layar penuh selama ujian berlangsung.",
                    variant: "destructive",
                });
                // Re-enter fullscreen after a short delay
                setTimeout(() => {
                    enterFullscreen();
                }, 100);

                // Log this as a violation and show banner
                logSecurityViolation("FULLSCREEN_EXIT", "User attempted to exit fullscreen");
                setViolationCount(prev => prev + 1);
                setLastViolationType("FULLSCREEN_EXIT");
                setShowViolationBanner(true);
                setTimeout(() => setShowViolationBanner(false), 5000);
            }
        };

        // Handle Android back button
        const handlePopState = (e: PopStateEvent) => {
            if (examStarted && !submitting) {
                // Prevent going back
                e.preventDefault();

                // Push state again to keep user on this page
                pushDummyState();

                // Re-enter fullscreen if not in fullscreen
                const isCurrentlyFullscreen = !!(
                    document.fullscreenElement ||
                    (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
                );

                if (!isCurrentlyFullscreen) {
                    toast({
                        title: "Mode Layar Penuh Diperlukan",
                        description: "Tekan tombol 'Kumpulkan' untuk mengakhiri ujian.",
                        variant: "destructive",
                    });

                    setTimeout(() => {
                        enterFullscreen();
                    }, 100);

                    // Log this as a violation and show banner
                    logSecurityViolation("BACK_BUTTON", "User pressed back button on Android");
                    setViolationCount(prev => prev + 1);
                    setLastViolationType("BACK_BUTTON");
                    setShowViolationBanner(true);
                    setTimeout(() => setShowViolationBanner(false), 5000);
                }
            }
        };

        // Handle visibility change (for when back button minimizes app briefly)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && examStarted && !submitting) {
                // When page becomes visible again, check fullscreen
                setTimeout(() => {
                    const isCurrentlyFullscreen = !!(
                        document.fullscreenElement ||
                        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
                    );

                    if (!isCurrentlyFullscreen) {
                        enterFullscreen();
                    }
                }, 200);
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("mozfullscreenchange", handleFullscreenChange);
        window.addEventListener("popstate", handlePopState);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
            window.removeEventListener("popstate", handlePopState);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [examStarted, submitting, enterFullscreen, toast]);

    // Log security violations to backend
    const logSecurityViolation = async (type: string, details?: string) => {
        try {
            await fetch(`/api/student/exams/${sessionId}/violation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, type, details, timestamp: new Date().toISOString() }),
            });
        } catch (error) {
            console.error("Failed to log violation:", error);
        }
    };

    // Check if session requires token
    const checkTokenRequired = async () => {
        try {
            const response = await fetch(`/api/exam-sessions/${sessionId}/token`);
            if (response.ok) {
                const data = await response.json();
                setTokenRequired(data.requireToken && !!data.accessToken);
                return data.requireToken && !!data.accessToken;
            }
        } catch (error) {
            console.error("Error checking token:", error);
        }
        return false;
    };

    // Handle fullscreen start - may show token dialog first
    const handleStartFullscreen = async () => {
        // Check if token is required
        const needsToken = await checkTokenRequired();

        if (needsToken) {
            // Show token dialog instead of starting
            setShowTokenDialog(true);
        } else {
            // No token needed, proceed directly
            await proceedWithExamStart();
        }
    };

    // Start exam with token verification
    const handleStartWithToken = async (token: string) => {
        setVerifyingToken(true);
        setTokenError(null);

        try {
            // Call start API with token
            const response = await fetch(`/api/student/exams/${sessionId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, token })
            });

            if (response.ok) {
                setShowTokenDialog(false);
                await proceedWithExamStart();
            } else {
                const data = await response.json();
                setTokenError(data.error || "Token tidak valid");
            }
        } catch (error) {
            void error;
            setTokenError("Gagal memverifikasi token. Silakan coba lagi.");
        } finally {
            setVerifyingToken(false);
        }
    };

    // Actually start the exam (enter fullscreen, etc)
    const proceedWithExamStart = async () => {
        if (fullscreenSupported) {
            await enterFullscreen();
        }
        setShowFullscreenPrompt(false);
        setExamStarted(true);
    };

    // Helper function to ensure fullscreen is active
    const ensureFullscreen = useCallback(() => {
        if (!examStarted || submitting || !fullscreenSupported) return;

        const isCurrentlyFullscreen = !!(
            document.fullscreenElement ||
            (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
            (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement
        );

        if (!isCurrentlyFullscreen) {
            enterFullscreen();
        }
    }, [examStarted, submitting, fullscreenSupported, enterFullscreen]);

    // Periodic fullscreen check - every 3 seconds during exam
    useEffect(() => {
        if (!examStarted || submitting) return;

        const interval = setInterval(() => {
            ensureFullscreen();
        }, 3000); // Check every 3 seconds

        return () => clearInterval(interval);
    }, [examStarted, submitting, ensureFullscreen]);

    // Navigation handler that also ensures fullscreen
    const navigateToQuestion = useCallback((index: number) => {
        setCurrentQuestionIndex(index);
        // Re-enter fullscreen on navigation
        setTimeout(() => {
            ensureFullscreen();
        }, 100);
    }, [ensureFullscreen]);

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
                setExamName(data.examName || "");
                setMinSubmitMinutes(data.minDurationMinutes || 0);
                if (data.startTime) {
                    setStartTime(new Date(data.startTime));
                }

                // Restore violation count from server
                if (data.violationCount !== undefined) {
                    setViolationCount(data.violationCount);
                }

                // Restore answers if available
                if (data.answers) {
                    const restoredAnswers = new Map<string, Answer>();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            void error;
            toast({
                title: "Error",
                description: "Gagal memuat soal ujian",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                body: JSON.stringify({ studentId, violationCount }),
            });

            if (response.ok) {
                // Exit fullscreen before navigating
                if (isFullscreen) {
                    await exitFullscreen();
                }
                toast({
                    title: "Berhasil",
                    description: "Ujian berhasil dikumpulkan",
                });
                router.push("/student/exams");
            } else {
                throw new Error("Failed to submit");
            }
        } catch (error) {
            void error;
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
        <>
            {/* Fullscreen Prompt */}
            <FullscreenPrompt
                open={showFullscreenPrompt && !loading && !showTokenDialog}
                onConfirm={handleStartFullscreen}
                examName={examName}
            />

            {/* Token Input Dialog */}
            <TokenInputDialog
                open={showTokenDialog}
                onSubmit={handleStartWithToken}
                onCancel={() => {
                    setShowTokenDialog(false);
                    router.push("/student/exams");
                }}
                loading={verifyingToken}
                error={tokenError}
                examName={examName}
            />

            {/* Security Warning Banner */}
            {showViolationBanner && (
                <SecurityWarningBanner
                    violationCount={violationCount}
                    violationType={lastViolationType}
                    onDismiss={() => setShowViolationBanner(false)}
                />
            )}

            <div className={`min-h-screen bg-muted/30 flex flex-col ${showViolationBanner ? 'pt-10' : ''}`}>
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
                        setCurrentQuestionIndex={navigateToQuestion}
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
                                                        currentQuestion.type === "true_false" ? "Benar/Salah" :
                                                            "Essay"}
                                    </Badge>
                                    <div className="text-sm text-muted-foreground">
                                        Bobot: <span className="font-medium text-foreground">{currentQuestion.points} poin</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Fullscreen toggle button */}
                                    {fullscreenSupported && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => isFullscreen ? exitFullscreen() : enterFullscreen()}
                                            className="hidden"
                                            disabled={examStarted} // Disabled during exam
                                        >
                                            {isFullscreen ? (
                                                <Minimize className="h-4 w-4" />
                                            ) : (
                                                <Maximize className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}
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
                                    onClick={() => navigateToQuestion(Math.max(0, currentQuestionIndex - 1))}
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
                                    onClick={() => navigateToQuestion(Math.min(questions.length - 1, currentQuestionIndex + 1))}
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

                {/* Violation count indicator */}
                {violationCount > 0 && (
                    <div className="fixed bottom-4 left-4 bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium shadow-lg border border-red-200 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        {violationCount} pelanggaran
                    </div>
                )}

                <SubmitDialog
                    open={showSubmitDialog}
                    onOpenChange={setShowSubmitDialog}
                    answeredCount={answeredCount}
                    totalQuestions={questions.length}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    minSubmitMinutes={minSubmitMinutes}
                    elapsedMinutes={startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000) : 0}
                />
            </div>
        </>
    );
}
