"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Play, XCircle, Timer, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { TokenInputDialog } from "@/components/exam/take-exam/TokenInputDialog";
import { StudentProfileCard, StudentProfile } from "@/components/student/StudentProfileCard";
import { getDeviceId } from "@/lib/device";

interface Exam {
    id: string;
    sessionName: string;
    status: string;
    startTime: string;
    endTime: string;
    templateName: string;
    subjectName: string;
    durationMinutes: number;
    totalScore: number;
    examStatus: "upcoming" | "active" | "in_progress" | "completed" | "expired";
    hasSubmission: boolean;
    submissionId?: string;
    score?: number;
    showScore?: boolean;
}

export default function StudentExamsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [filter, setFilter] = useState("all");
    const [studentId, setStudentId] = useState<string | null>(null);

    // Token Dialog State
    const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [verifyingToken, setVerifyingToken] = useState(false);

    const fetchStudentProfile = useCallback(async () => {
        setProfileLoading(true);
        try {
            const response = await fetch("/api/student/profile");
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setProfile(data.data);
                    setStudentId(data.data.id);
                }
            } else {
                router.push("/login");
            }
        } catch (error) {
            console.error("Error fetching session/profile:", error);
            router.push("/login");
        } finally {
            setProfileLoading(false);
        }
    }, [router]);

    const fetchExams = useCallback(async () => {
        if (!studentId) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                studentId,
                status: filter
            });

            const response = await fetch(`/api/student/exams?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setExams(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching exams:", error);
            toast({
                title: "Error",
                description: "Gagal memuat daftar ujian",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [studentId, filter, toast]);

    useEffect(() => {
        fetchStudentProfile();
    }, [fetchStudentProfile]);

    useEffect(() => {
        if (studentId) {
            fetchExams();
        }
    }, [fetchExams, studentId]);

    const getStatusBadge = (examStatus: string) => {
        switch (examStatus) {
            case "active":
                return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Sedang Berlangsung</Badge>;
            case "in_progress":
                return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">Sedang Dikerjakan</Badge>;
            case "completed":
                return <Badge variant="secondary" className="bg-muted text-muted-foreground font-medium">Selesai</Badge>;
            case "upcoming":
                return <Badge variant="outline" className="border-primary/60 text-primary font-medium">Akan Datang</Badge>;
            case "expired":
                return <Badge variant="destructive">Terlewat</Badge>;
            default:
                return <Badge>{examStatus}</Badge>;
        }
    };

    const handleStartExam = async (sessionId: string, token?: string) => {
        if (!studentId) return;

        if (token) {
            setVerifyingToken(true);
            setTokenError(null);
        }

        try {
            const deviceId = getDeviceId();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const body: any = { studentId, deviceId };
            if (token) {
                body.token = token;
            }

            const response = await fetch(`/api/student/exams/${sessionId}/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Device-Id": deviceId },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const data = await response.json();
                void data;

                if (tokenDialogOpen) {
                    setTokenDialogOpen(false);
                    setSelectedExamId(null);
                    setTokenError(null);
                }

                if (token) {
                    try {
                        sessionStorage.setItem(`exam_token_${sessionId}`, token);
                    } catch (e) {
                        console.error("Failed to save token to session storage", e);
                    }
                }

                router.push(`/student/exams/${sessionId}`);
            } else {
                const error = await response.json();

                if (response.status === 403 && error.requireToken) {
                    if (token) {
                        setTokenError("Token tidak valid. Silakan coba lagi.");
                        if (!tokenDialogOpen) {
                            setSelectedExamId(sessionId);
                            setTokenDialogOpen(true);
                        }
                    } else {
                        setSelectedExamId(sessionId);
                        setTokenDialogOpen(true);
                    }
                    return;
                }

                throw new Error(error.error || "Gagal memulai ujian");
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan";
            toast({
                title: "Gagal Masuk Ujian",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            if (token) {
                setVerifyingToken(false);
            }
        }
    };

    const handleTokenSubmit = (token: string) => {
        if (selectedExamId) {
            handleStartExam(selectedExamId, token);
        }
    };

    const handleContinueExam = (sessionId: string) => {
        router.push(`/student/exams/${sessionId}`);
    };

    const activeCount = exams.filter(e => e.examStatus === "active" || e.examStatus === "in_progress").length;
    const upcomingCount = exams.filter(e => e.examStatus === "upcoming").length;
    const completedCount = exams.filter(e => e.examStatus === "completed").length;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Student Profile Card (Identity Verification) */}
            <StudentProfileCard
                profile={profile}
                loading={profileLoading}
                activeExamsCount={activeCount}
            />

            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Daftar Ujian Siswa
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Pilih dan kerjakan jadwal ujian sesuai mata pelajaran Anda.
                    </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap p-1 bg-muted/60 rounded-xl border border-border/80 text-xs sm:text-sm">
                    {[
                        { id: "all", label: `Semua (${exams.length})` },
                        { id: "active", label: `Aktif (${activeCount})` },
                        { id: "upcoming", label: `Akan Datang (${upcomingCount})` },
                        { id: "completed", label: `Selesai (${completedCount})` },
                    ].map((tab) => (
                        <Button
                            key={tab.id}
                            variant={filter === tab.id ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setFilter(tab.id)}
                            className={`rounded-lg px-3 sm:px-4 text-xs font-semibold cursor-pointer ${filter === tab.id ? "bg-background shadow-xs text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Exams Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="h-64 animate-pulse bg-muted/30 border rounded-2xl" />
                    ))}
                </div>
            ) : exams.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/10 rounded-2xl">
                    <CardContent className="text-center py-16 flex flex-col items-center">
                        <div className="h-16 w-16 bg-muted/60 rounded-2xl flex items-center justify-center mb-4">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Tidak ada ujian pada kategori ini</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-1">
                            Belum ada jadwal ujian yang ditugaskan untuk kelas Anda pada filter yang dipilih.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {exams.map((exam) => (
                        <Card
                            key={exam.id}
                            className="flex flex-col overflow-hidden border border-border/80 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 rounded-2xl bg-card"
                        >
                            {/* Color Accent Indicator Top Bar */}
                            <div
                                className={`h-1.5 w-full ${
                                    exam.examStatus === "active"
                                        ? "bg-emerald-500"
                                        : exam.examStatus === "in_progress"
                                            ? "bg-blue-500"
                                            : exam.examStatus === "upcoming"
                                                ? "bg-primary"
                                                : exam.examStatus === "expired"
                                                    ? "bg-destructive"
                                                    : "bg-muted"
                                }`}
                            />

                            <CardHeader className="pb-3 pt-5 px-5">
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    {getStatusBadge(exam.examStatus)}
                                    {exam.score !== undefined && exam.showScore && (
                                        <Badge
                                            variant="outline"
                                            className={`font-bold px-2.5 py-0.5 ${
                                                exam.score >= 75
                                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-300"
                                                    : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-300"
                                            }`}
                                        >
                                            Nilai: {exam.score}
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="line-clamp-2 text-base sm:text-lg font-bold text-foreground leading-snug">
                                    {exam.sessionName}
                                </CardTitle>
                                <CardDescription className="line-clamp-1 font-medium text-xs text-primary">
                                    {exam.subjectName}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1 space-y-3 px-5 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border border-border/50">
                                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                                        <span className="font-medium text-foreground truncate">
                                            {format(new Date(exam.startTime), "d MMM yyyy", { locale: idLocale })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border border-border/50">
                                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                                        <span className="font-medium text-foreground">
                                            {format(new Date(exam.startTime), "HH:mm")} WIB
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border border-border/50">
                                        <Timer className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                        <span className="font-medium text-foreground">{exam.durationMinutes} Menit</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border border-border/50">
                                        <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        <span className="font-medium text-foreground">{exam.totalScore} Poin Max</span>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="pt-2 pb-5 px-5">
                                {exam.examStatus === "active" && !exam.hasSubmission && (
                                    <Button
                                        onClick={() => handleStartExam(exam.id)}
                                        className="w-full shadow-md shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl cursor-pointer"
                                    >
                                        <Play className="mr-2 h-4 w-4 fill-current" />
                                        Mulai Kerjakan
                                    </Button>
                                )}
                                {exam.examStatus === "in_progress" && (
                                    <Button
                                        onClick={() => handleContinueExam(exam.id)}
                                        className="w-full shadow-md shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 rounded-xl cursor-pointer"
                                    >
                                        <Play className="mr-2 h-4 w-4 fill-current" />
                                        Lanjutkan Ujian
                                    </Button>
                                )}
                                {exam.examStatus === "completed" && (
                                    <Button
                                        variant="outline"
                                        className="w-full text-foreground hover:text-primary hover:bg-primary/5 border-border font-semibold h-10 rounded-xl"
                                        onClick={() => router.push(`/student/exams/${exam.id}/review`)}
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        Lihat Lembar Jawaban
                                    </Button>
                                )}
                                {exam.examStatus === "upcoming" && (
                                    <Button variant="outline" className="w-full h-10 rounded-xl text-muted-foreground" disabled>
                                        <Clock className="mr-2 h-4 w-4" />
                                        Ujian Belum Dimulai
                                    </Button>
                                )}
                                {exam.examStatus === "expired" && (
                                    <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 h-10 rounded-xl" disabled>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Waktu Ujian Terlewat
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Token Prompt Dialog if Required */}
            <TokenInputDialog
                open={tokenDialogOpen}
                onCancel={() => {
                    setTokenDialogOpen(false);
                    setSelectedExamId(null);
                    setTokenError(null);
                }}
                onSubmit={handleTokenSubmit}
                loading={verifyingToken}
                error={tokenError}
                examName={exams.find(e => e.id === selectedExamId)?.sessionName}
            />
        </div>
    );
}
