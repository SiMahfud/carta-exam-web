"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useExamSecurity } from "@/hooks/use-exam-security";

// Components
import { ExamHeader } from "@/components/exam/take-exam/ExamHeader";
import { ExamSidebar } from "@/components/exam/take-exam/ExamSidebar";
import { SubmitDialog } from "@/components/exam/take-exam/SubmitDialog";
import { FullscreenPrompt } from "@/components/exam/take-exam/FullscreenPrompt";
import { SecurityWarningBanner } from "@/components/exam/take-exam/SecurityWarningBanner";
import { TokenInputDialog } from "@/components/exam/take-exam/TokenInputDialog";
import { TerminatedExamView } from "@/components/exam/take-exam/TerminatedExamView";
import { QuestionCard } from "@/components/exam/take-exam/QuestionCard";

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
    const [isTerminated, setIsTerminated] = useState(false);
    const [examName, setExamName] = useState<string>("");
    const [minSubmitMinutes, setMinSubmitMinutes] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [violationSettings, setViolationSettings] = useState<any>(null); // To store config

    // Token states
    const [showTokenDialog, setShowTokenDialog] = useState(false);
    const [tokenRequired, setTokenRequired] = useState(false);
    void tokenRequired; // Used to track token state
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [verifyingToken, setVerifyingToken] = useState(false);

    const sessionId = params.sessionId as string;

    // Log security violations to backend and check for termination
    const logSecurityViolation = useCallback(async (type: string, details?: string) => {
        try {
            const response = await fetch(`/api/student/exams/${sessionId}/violation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, type, details, timestamp: new Date().toISOString() }),
            });

            if (response.ok) {
                const data = await response.json();

                // Update violation count from server
                if (data.violationCount !== undefined) {
                    setViolationCount(data.violationCount);
                }

                // Check if should terminate - immediately show terminated page
                if (data.shouldTerminate) {
                    setIsTerminated(true);
                    // Exit fullscreen
                    if (isFullscreen) {
                        await exitFullscreen();
                    }
                    toast({
                        title: "Ujian Dihentikan",
                        description: data.message || "Batas pelanggaran tercapai. Ujian dihentikan.",
                        variant: "destructive",
                    });
                }
            }
        } catch (error) {
            console.error("Failed to log violation:", error);
        }
    }, [sessionId, studentId, isFullscreen, exitFullscreen, toast]);

    const fetchStudentId = useCallback(async () => {
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
    }, [router]);

    const fetchQuestions = useCallback(async (token?: string) => {
        if (!studentId) return;

        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) {
                headers["X-Exam-Token"] = token;
            }

            const response = await fetch(`/api/student/exams/${sessionId}/questions?studentId=${studentId}`, {
                headers
            });

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

                if (data.violationSettings) {
                    setViolationSettings(data.violationSettings);
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

                // Clear token error if successful
                setTokenRequired(false);
                setTokenError(null);
                return true;
            } else if (response.status === 403) {
                const data = await response.json();

                // Check if token is required (resume flow)
                if (data.requireToken) {
                    setTokenRequired(true);
                    if (token) {
                        setTokenError("Token tidak valid");
                    }
                    // Don't throw error, let the UI handle it via FullscreenPrompt
                    return;
                }

                // Check if terminated or completed
                if (data.terminated) {
                    setIsTerminated(true);
                    setViolationCount(data.violationCount || 0);
                } else if (data.completed) {
                    toast({
                        title: "Ujian Selesai",
                        description: "Anda sudah menyelesaikan ujian ini.",
                    });
                    router.push("/student/exams");
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
    }, [sessionId, studentId, toast, router]);

    const handleSubmit = useCallback(async () => {
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
                    try {
                        await exitFullscreen();
                    } catch (e) {
                        console.error("Error exiting fullscreen:", e);
                    }
                }

                toast({
                    title: "Berhasil",
                    description: "Ujian berhasil dikumpulkan",
                });

                // Force navigation using window.location to ensure we exit the exam context completely
                window.location.href = "/student/exams";

                // Don't setSubmitting(false) here, keep it true while navigating to prevent violations
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
            setSubmitting(false);
        }
    }, [sessionId, studentId, violationCount, isFullscreen, exitFullscreen, toast]);

    const handleAutoSubmit = useCallback(() => {
        toast({
            title: "Waktu Habis",
            description: "Ujian otomatis dikumpulkan",
        });
        handleSubmit();
    }, [handleSubmit, toast]);

    // Security hook - only enabled after exam starts
    useExamSecurity({
        enabled: examStarted,
        cooldownMs: (violationSettings?.cooldownSeconds || 5) * 1000,
        disableCopyPaste: violationSettings?.detectCopyPaste ?? true,
        disableRightClick: violationSettings?.detectRightClick ?? true,
        detectTabSwitch: violationSettings?.detectTabSwitch ?? true,
        detectScreenshot: violationSettings?.detectScreenshot ?? true,
        detectWindowBlur: false, // Maintain default
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
    }, [examStarted, submitting, enterFullscreen, toast, logSecurityViolation]);




    // Handle fullscreen start (and optional token verification)
    const handleStartFullscreen = async (token?: string) => {
        if (tokenRequired) {
            if (!token) {
                setTokenError("Token harus diisi");
                return;
            }
            // Re-fetch questions with token
            const success = await fetchQuestions(token);
            if (success) {
                // If verification succeeded, proceed directly
                await proceedWithExamStart();
            }
        } else {
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
    }, [fetchStudentId]);

    useEffect(() => {
        if (studentId) {
            // Check for token in session storage (passed from list page)
            let storedToken: string | undefined;
            try {
                storedToken = sessionStorage.getItem(`exam_token_${sessionId}`) || undefined;
            } catch (e) {
                console.error("Failed to read token from session storage", e);
            }
            fetchQuestions(storedToken);
        }
    }, [studentId, fetchQuestions, sessionId]);



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
    }, [endTime, handleAutoSubmit]);



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

    // Show terminated page if exam was stopped due to violations
    if (isTerminated) {
        return (
            <TerminatedExamView
                violationCount={violationCount}
                onReturn={() => router.push("/student/exams")}
            />
        );
    }

    // If no questions and not loading/verifying, showing specific messages
    if (!currentQuestion && !loading && !tokenRequired) {
        return <div className="flex items-center justify-center min-h-screen">Tidak ada soal</div>;
    }

    return (
        <>
            {/* Fullscreen Prompt */}
            <FullscreenPrompt
                open={showFullscreenPrompt && !loading && !showTokenDialog}
                onConfirm={handleStartFullscreen}
                examName={examName}
                requireToken={tokenRequired}
                tokenError={tokenError}
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

            {!currentQuestion ? (
                // Just a placeholder while waiting for token input or loading
                <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                    {tokenRequired ? (
                        <div className="text-muted-foreground animate-pulse">Menunggu verifikasi token...</div>
                    ) : (
                        <div className="text-muted-foreground">Memuat...</div>
                    )}
                </div>
            ) : (
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
                            <QuestionCard
                                currentQuestion={currentQuestion}
                                currentAnswer={currentAnswer}
                                currentQuestionIndex={currentQuestionIndex}
                                totalQuestions={questions.length}
                                examStarted={examStarted}
                                isFullscreen={isFullscreen}
                                fullscreenSupported={fullscreenSupported}
                                enterFullscreen={enterFullscreen}
                                exitFullscreen={exitFullscreen}
                                onToggleFlag={toggleFlag}
                                onAnswerChange={handleAnswerChange}
                                onNavigate={navigateToQuestion}
                            />
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
            )}
        </>
    );
}
