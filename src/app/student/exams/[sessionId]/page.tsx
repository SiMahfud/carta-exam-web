"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useExamSecurity } from "@/hooks/use-exam-security";
import { getDeviceId } from "@/lib/device";
import { useWatermark } from "@/lib/lockdown";

// Components
import { ExamHeader } from "@/components/exam/take-exam/ExamHeader";
import { ExamSidebar } from "@/components/exam/take-exam/ExamSidebar";
import { SubmitDialog } from "@/components/exam/take-exam/SubmitDialog";
import { PreExamDialog } from "@/components/exam/take-exam/PreExamDialog";
import { SecurityWarningBanner } from "@/components/exam/take-exam/SecurityWarningBanner";
import { TerminatedExamView } from "@/components/exam/take-exam/TerminatedExamView";
import { QuestionCard } from "@/components/exam/take-exam/QuestionCard";
import { FloatingExamTools } from "@/components/exam/take-exam/FloatingExamTools";

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
    const [studentName, setStudentName] = useState<string>("");
    const [studentUsername, setStudentUsername] = useState<string>("");
    const [studentClass, setStudentClass] = useState<string>("");
    const [showPreExamDialog, setShowPreExamDialog] = useState(true);
    const [examStarted, setExamStarted] = useState(false);
    const [violationCount, setViolationCount] = useState(0);
    const [showViolationBanner, setShowViolationBanner] = useState(false);
    const [lastViolationType, setLastViolationType] = useState<string>("");
    const [isTerminated, setIsTerminated] = useState(false);
    const [examName, setExamName] = useState<string>("");
    const [minSubmitMinutes, setMinSubmitMinutes] = useState(0);
    const [durationMinutes, setDurationMinutes] = useState<number | undefined>(undefined);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [violationSettings, setViolationSettings] = useState<any>(null);

    // UI/UX Customization States
    const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
    const [isZenMode, setIsZenMode] = useState(false);
    const [eliminatedOptions, setEliminatedOptions] = useState<Map<string, string[]>>(new Map());

    // Token states
    const [tokenRequired, setTokenRequired] = useState(false);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [verifyingToken, setVerifyingToken] = useState(false);

    const sessionId = params.sessionId as string;

    // Load saved font size preference
    useEffect(() => {
        try {
            const savedFont = localStorage.getItem("carta_exam_fontsize") as "sm" | "base" | "lg" | "xl";
            if (savedFont && ["sm", "base", "lg", "xl"].includes(savedFont)) {
                setFontSize(savedFont);
            }
        } catch {
            // Ignore localStorage errors
        }
    }, []);

    const handleChangeFontSize = (size: "sm" | "base" | "lg" | "xl") => {
        setFontSize(size);
        try {
            localStorage.setItem("carta_exam_fontsize", size);
        } catch {
            // Ignore
        }
    };

    // Toggle option elimination for MC & Complex MC
    const handleToggleEliminate = (questionId: string, label: string) => {
        setEliminatedOptions((prev) => {
            const next = new Map(prev);
            const currentList = next.get(questionId) || [];
            if (currentList.includes(label)) {
                next.set(questionId, currentList.filter(l => l !== label));
            } else {
                next.set(questionId, [...currentList, label]);
            }
            return next;
        });
    };

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

                if (data.violationCount !== undefined) {
                    setViolationCount(data.violationCount);
                }

                if (data.shouldTerminate) {
                    setIsTerminated(true);
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

    const fetchStudentProfile = useCallback(async () => {
        try {
            const response = await fetch("/api/student/profile");
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setStudentId(data.data.id);
                    setStudentName(data.data.name || "");
                    setStudentUsername(data.data.username || "");
                    setStudentClass(data.data.primaryClass?.name || (data.data.classes?.[0]?.name) || "Siswa");
                }
            } else {
                router.push("/login");
            }
        } catch (error) {
            console.error("Error fetching student profile:", error);
            router.push("/login");
        }
    }, [router]);

    const fetchQuestions = useCallback(async (token?: string) => {
        if (!studentId) return;

        try {
            const deviceId = getDeviceId();
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "X-Device-Id": deviceId,
            };
            if (token) {
                headers["X-Exam-Token"] = token;
            }

            const response = await fetch(`/api/student/exams/${sessionId}/questions?studentId=${studentId}&deviceId=${encodeURIComponent(deviceId)}`, {
                headers
            });

            if (response.ok) {
                const data = await response.json();
                setQuestions(data.questions);
                setEndTime(new Date(data.endTime));
                setExamName(data.examName || "");
                setMinSubmitMinutes(data.minDurationMinutes || 0);
                if (data.durationMinutes) {
                    setDurationMinutes(data.durationMinutes);
                }
                if (data.startTime) {
                    setStartTime(new Date(data.startTime));
                }

                if (data.violationCount !== undefined) {
                    setViolationCount(data.violationCount);
                }

                if (data.violationSettings) {
                    setViolationSettings(data.violationSettings);
                }

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

                setTokenRequired(false);
                setTokenError(null);
                return true;
            } else if (response.status === 403) {
                const data = await response.json();

                if (data.browserBlocked) {
                    toast({
                        title: "Browser Ditolak",
                        description: data.error || "Aplikasi browser tidak memenuhi syarat ujian.",
                        variant: "destructive",
                    });
                    router.push("/student/exams");
                    return false;
                }

                if (data.deviceBlocked) {
                    toast({
                        title: "Perangkat Ditolak",
                        description: data.error || "Ujian sedang aktif di perangkat lain.",
                        variant: "destructive",
                    });
                    router.push("/student/exams");
                    return false;
                }

                if (data.requireToken) {
                    setTokenRequired(true);
                    if (token) {
                        setTokenError("Token tidak valid");
                    }
                    return false;
                }

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
                return false;
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
            return false;
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

                window.location.href = "/student/exams";
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

    // Security hook
    useExamSecurity({
        enabled: examStarted,
        cooldownMs: (violationSettings?.cooldownSeconds || 5) * 1000,
        disableCopyPaste: violationSettings?.detectCopyPaste ?? true,
        disableRightClick: violationSettings?.detectRightClick ?? true,
        detectTabSwitch: violationSettings?.detectTabSwitch ?? true,
        detectScreenshot: violationSettings?.detectScreenshot ?? true,
        detectWindowBlur: false,
        onViolation: (violation) => {
            setViolationCount(prev => prev + 1);
            setLastViolationType(violation.type);
            setShowViolationBanner(true);
            setTimeout(() => setShowViolationBanner(false), 5000);
            logSecurityViolation(violation.type, violation.details);
        }
    });

    // Anti-tamper watermark
    useWatermark(
        studentName || "Siswa",
        (violation) => {
            setViolationCount(prev => prev + 1);
            setLastViolationType(violation.type);
            setShowViolationBanner(true);
            setTimeout(() => setShowViolationBanner(false), 5000);
            logSecurityViolation(violation.type, violation.details);
        },
        examStarted && (violationSettings?.watermarkAntiTamper ?? true)
    );

    // Heartbeat sync
    useEffect(() => {
        if (!examStarted || submitting || isTerminated || !studentId) return;

        const deviceId = getDeviceId();

        const sendHeartbeat = async () => {
            try {
                const response = await fetch(`/api/student/exams/${sessionId}/heartbeat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        studentId,
                        deviceId,
                        clientTime: new Date().toISOString(),
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === "terminated") {
                        setIsTerminated(true);
                    } else if (data.remainingSeconds !== undefined) {
                        setTimeRemaining(data.remainingSeconds);
                    }
                } else if (response.status === 403) {
                    const data = await response.json();
                    if (data.status === "blocked" || data.error === "DEVICE_MISMATCH") {
                        toast({
                            title: "Sesi Tidak Valid",
                            description: data.message || "Ujian dibuka di perangkat lain.",
                            variant: "destructive",
                        });
                        setIsTerminated(true);
                    }
                }
            } catch (e) {
                console.error("Heartbeat sync error:", e);
            }
        };

        sendHeartbeat();
        const interval = setInterval(sendHeartbeat, 20000);
        return () => clearInterval(interval);
    }, [examStarted, submitting, isTerminated, sessionId, studentId, toast]);

    // Fullscreen enforcement
    useEffect(() => {
        if (!examStarted) return;

        const pushDummyState = () => {
            window.history.pushState({ examInProgress: true }, '', window.location.href);
        };

        pushDummyState();

        const handleFullscreenChange = () => {
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
                setTimeout(() => {
                    enterFullscreen();
                }, 100);

                logSecurityViolation("FULLSCREEN_EXIT", "User attempted to exit fullscreen");
                setViolationCount(prev => prev + 1);
                setLastViolationType("FULLSCREEN_EXIT");
                setShowViolationBanner(true);
                setTimeout(() => setShowViolationBanner(false), 5000);
            }
        };

        const handlePopState = (e: PopStateEvent) => {
            if (examStarted && !submitting) {
                e.preventDefault();
                pushDummyState();

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

                    logSecurityViolation("BACK_BUTTON", "User pressed back button on Android");
                    setViolationCount(prev => prev + 1);
                    setLastViolationType("BACK_BUTTON");
                    setShowViolationBanner(true);
                    setTimeout(() => setShowViolationBanner(false), 5000);
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && examStarted && !submitting) {
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

    // Handle Start from PreExamDialog
    const handleStartExam = async (token?: string) => {
        if (tokenRequired && !token) {
            setTokenError("Token harus diisi");
            return;
        }

        setVerifyingToken(true);
        setTokenError(null);

        try {
            if (token) {
                const success = await fetchQuestions(token);
                if (!success) {
                    setVerifyingToken(false);
                    return;
                }
            }

            if (fullscreenSupported) {
                await enterFullscreen();
            }

            setShowPreExamDialog(false);
            setExamStarted(true);
        } catch (err) {
            console.error("Start exam error:", err);
            setTokenError("Gagal memulai ujian. Silakan coba lagi.");
        } finally {
            setVerifyingToken(false);
        }
    };

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

    // Periodic fullscreen check
    useEffect(() => {
        if (!examStarted || submitting) return;

        const interval = setInterval(() => {
            ensureFullscreen();
        }, 3000);

        return () => clearInterval(interval);
    }, [examStarted, submitting, ensureFullscreen]);

    // Navigation handler
    const navigateToQuestion = useCallback((index: number) => {
        setCurrentQuestionIndex(index);
        setTimeout(() => {
            ensureFullscreen();
        }, 100);
    }, [ensureFullscreen]);

    useEffect(() => {
        fetchStudentProfile();
    }, [fetchStudentProfile]);

    useEffect(() => {
        if (studentId) {
            let storedToken: string | undefined;
            try {
                storedToken = sessionStorage.getItem(`exam_token_${sessionId}`) || undefined;
            } catch (e) {
                console.error("Failed to read token from session storage", e);
            }
            fetchQuestions(storedToken);
        }
    }, [studentId, fetchQuestions, sessionId]);

    // Timer countdown
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

    // Save answer API call
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
    const handleAnswerChange = useCallback((questionId: string, answer: any) => {
        const newAnswers = new Map(answers);
        const existing = newAnswers.get(questionId);
        newAnswers.set(questionId, {
            questionId,
            answer,
            isFlagged: existing?.isFlagged || false
        });
        setAnswers(newAnswers);
        saveAnswer(questionId, answer, existing?.isFlagged || false);
    }, [answers, saveAnswer]);

    const toggleFlag = useCallback(() => {
        const question = questions[currentQuestionIndex];
        if (!question) return;
        const newAnswers = new Map(answers);
        const existing = newAnswers.get(question.id) || { questionId: question.id, answer: null, isFlagged: false };
        existing.isFlagged = !existing.isFlagged;
        newAnswers.set(question.id, existing);
        setAnswers(newAnswers);
        saveAnswer(question.id, existing.answer, existing.isFlagged);
    }, [questions, currentQuestionIndex, answers, saveAnswer]);

    // KEYBOARD SHORTCUTS INTEGRATION (ala UTBK/UNBK)
    useEffect(() => {
        if (!examStarted || submitting || isTerminated) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

            // If student is actively typing in an input field, do not trigger shortcuts
            if (isTyping) return;

            const key = e.key.toUpperCase();
            const currentQ = questions[currentQuestionIndex];
            if (!currentQ) return;

            // Shortcut: Previous question (ArrowLeft)
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                if (currentQuestionIndex > 0) {
                    navigateToQuestion(currentQuestionIndex - 1);
                }
                return;
            }

            // Shortcut: Next question (ArrowRight)
            if (e.key === "ArrowRight") {
                e.preventDefault();
                if (currentQuestionIndex < questions.length - 1) {
                    navigateToQuestion(currentQuestionIndex + 1);
                }
                return;
            }

            // Shortcut: Flag / Ragu-ragu (F)
            if (key === "F") {
                e.preventDefault();
                toggleFlag();
                return;
            }

            // Shortcut: Select Option A-E (for MC)
            if (["A", "B", "C", "D", "E"].includes(key)) {
                if (currentQ.type === "mc") {
                    const opt = currentQ.options?.find(o => o.label === key);
                    if (opt) {
                        e.preventDefault();
                        handleAnswerChange(currentQ.id, key);
                    }
                } else if (currentQ.type === "complex_mc") {
                    const opt = currentQ.options?.find(o => o.label === key);
                    if (opt) {
                        e.preventDefault();
                        const currentAns: string[] = answers.get(currentQ.id)?.answer || [];
                        const nextAns = currentAns.includes(key)
                            ? currentAns.filter(k => k !== key)
                            : [...currentAns, key];
                        handleAnswerChange(currentQ.id, nextAns);
                    }
                }
                return;
            }

            // Shortcut: True/False (1 for Benar, 2 for Salah)
            if (currentQ.type === "true_false") {
                if (e.key === "1") {
                    e.preventDefault();
                    handleAnswerChange(currentQ.id, "true");
                } else if (e.key === "2") {
                    e.preventDefault();
                    handleAnswerChange(currentQ.id, "false");
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [examStarted, submitting, isTerminated, questions, currentQuestionIndex, answers, navigateToQuestion, handleAnswerChange, toggleFlag]);

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

    if (isTerminated) {
        return (
            <TerminatedExamView
                violationCount={violationCount}
                onReturn={() => router.push("/student/exams")}
            />
        );
    }

    if (!currentQuestion && !loading && !tokenRequired) {
        return <div className="flex items-center justify-center min-h-screen">Tidak ada soal</div>;
    }

    return (
        <>
            {/* Pre-Exam Preparation & Student Identity Verification Dialog */}
            <PreExamDialog
                open={showPreExamDialog && !loading}
                examName={examName}
                studentName={studentName}
                studentUsername={studentUsername}
                className={studentClass}
                durationMinutes={durationMinutes}
                totalQuestions={questions.length}
                requireToken={tokenRequired}
                tokenError={tokenError}
                onStartExam={handleStartExam}
                loading={verifyingToken}
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
                <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                    {tokenRequired ? (
                        <div className="text-muted-foreground animate-pulse">Menunggu verifikasi token...</div>
                    ) : (
                        <div className="text-muted-foreground">Memuat...</div>
                    )}
                </div>
            ) : (
                <div className={`min-h-screen bg-muted/30 flex flex-col ${showViolationBanner ? 'pt-10' : ''}`}>
                    {/* Header */}
                    <ExamHeader
                        currentQuestionIndex={currentQuestionIndex}
                        totalQuestions={questions.length}
                        timeRemaining={timeRemaining}
                        autoSaving={autoSaving}
                        onShowSubmit={() => setShowSubmitDialog(true)}
                        isSidebarOpen={isSidebarOpen}
                        setIsSidebarOpen={setIsSidebarOpen}
                        studentName={studentName}
                        studentUsername={studentUsername}
                        className={studentClass}
                        fontSize={fontSize}
                        onChangeFontSize={handleChangeFontSize}
                        isZenMode={isZenMode}
                        onToggleZenMode={() => setIsZenMode(!isZenMode)}
                    />

                    {/* Main Body */}
                    <div className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex gap-6 relative">
                        {/* Sidebar (can be hidden in Zen Mode) */}
                        {!isZenMode && (
                            <ExamSidebar
                                questions={questions}
                                answers={answers}
                                currentQuestionIndex={currentQuestionIndex}
                                setCurrentQuestionIndex={navigateToQuestion}
                                isSidebarOpen={isSidebarOpen}
                                setIsSidebarOpen={setIsSidebarOpen}
                            />
                        )}

                        {/* Main Question Area */}
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
                                fontSize={fontSize}
                                eliminatedOptions={eliminatedOptions}
                                onToggleEliminate={handleToggleEliminate}
                            />
                        </main>
                    </div>

                    {/* Floating Tools: Mini Calculator, Digital Scratchpad, Keyboard Shortcuts Help */}
                    <FloatingExamTools />

                    {/* Violation count indicator */}
                    {violationCount > 0 && (
                        <div className="fixed bottom-4 left-4 bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg border border-red-200 flex items-center gap-2 z-30">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            {violationCount} pelanggaran terdeteksi
                        </div>
                    )}

                    {/* Submit Dialog */}
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
