"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Play, XCircle, Timer, Eye, Download, Smartphone, ShieldCheck, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { TokenInputDialog } from "@/components/exam/take-exam/TokenInputDialog";
import { AdminClearanceDialog } from "@/components/exam/take-exam/AdminClearanceDialog";
import { StudentProfileCard, StudentProfile } from "@/components/student/StudentProfileCard";
import { SebAccessPanel } from "@/components/seb/SebAccessPanel";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getDeviceId } from "@/lib/device";
import { detectClientEnvironment } from "@/lib/browser-detection";
import { SebQuitButton } from "@/components/seb/SebQuitButton";

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

    // Administrative Clearance Dialog State
    const [adminClearanceDialogOpen, setAdminClearanceDialogOpen] = useState(false);
    const [selectedAdminExamId, setSelectedAdminExamId] = useState<string | null>(null);
    const [adminClearanceError, setAdminClearanceError] = useState<string | null>(null);
    const [adminClearanceNotes, setAdminClearanceNotes] = useState<string | null>(null);
    const [verifyingAdminToken, setVerifyingAdminToken] = useState(false);
    const [pendingAdminToken, setPendingAdminToken] = useState<string | null>(null);

    // Browser / SEB Required Dialog State
    const [browserBlockDialog, setBrowserBlockDialog] = useState<{
        open: boolean;
        message: string;
        supportsSeb: boolean;
    }>({ open: false, message: "", supportsSeb: false });

    const [clientEnv, setClientEnv] = useState({
        isSeb: false,
        isExambro: false,
        isIos: false,
        isAndroid: false,
    });
    const [sebLaunchUrl, setSebLaunchUrl] = useState("#");

    useEffect(() => {
        setClientEnv(detectClientEnvironment());
        if (typeof window !== "undefined") {
            const { protocol, host } = window.location;
            const scheme = protocol === "https:" ? "sebs" : "seb";
            setSebLaunchUrl(`${scheme}://${host}/api/seb/config`);
        }
    }, []);

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

    const handleStartExam = async (sessionId: string, token?: string, adminToken?: string) => {
        if (!studentId) return;

        if (token) {
            setVerifyingToken(true);
            setTokenError(null);
        }
        if (adminToken) {
            setVerifyingAdminToken(true);
            setAdminClearanceError(null);
        }

        try {
            const deviceId = getDeviceId();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const body: any = { studentId, deviceId };
            if (token) {
                body.token = token;
            }
            if (adminToken) {
                body.adminToken = adminToken;
            }

            const response = await fetch(`/api/student/exams/${sessionId}/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Device-Id": deviceId },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const data = await response.json();
                void data;

                if (adminClearanceDialogOpen) {
                    setAdminClearanceDialogOpen(false);
                    setSelectedAdminExamId(null);
                    setAdminClearanceError(null);
                }

                setPendingAdminToken(null);

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

                fetchStudentProfile();
                router.push(`/student/exams/${sessionId}`);
            } else {
                const error = await response.json();

                // 0. Check if blocked by browser requirement (SEB / Exambro)
                if (response.status === 403 && error.browserBlocked) {
                    const msg = error.error || "Ujian ini memerlukan aplikasi khusus (SEB / Exambro).";
                    const supportsSeb = msg.includes("SEB") || msg.includes("Safe Exam Browser");
                    setBrowserBlockDialog({
                        open: true,
                        message: msg,
                        supportsSeb,
                    });
                    return;
                }

                // 1. Check if blocked by Administrative Clearance
                if (response.status === 403 && error.requireAdminToken) {
                    setSelectedAdminExamId(sessionId);
                    setAdminClearanceNotes(error.adminNotes || null);
                    if (adminToken) {
                        setPendingAdminToken(null);
                        setAdminClearanceError(error.error || "Token administrasi salah atau kadaluarsa.");
                    } else {
                        setAdminClearanceError(null);
                    }
                    setAdminClearanceDialogOpen(true);
                    return;
                }

                // 2. Check if regular proctor/exam token is required
                if (response.status === 403 && error.requireToken) {
                    if (adminToken) {
                        setPendingAdminToken(adminToken);
                    }
                    if (adminClearanceDialogOpen) {
                        setAdminClearanceDialogOpen(false);
                        setSelectedAdminExamId(null);
                        setAdminClearanceError(null);
                    }
                    if (token) {
                        setTokenError(error.error || "Token ujian tidak valid. Silakan coba lagi.");
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

                // 3. Check if locked due to late entry or proctor lock
                if (response.status === 403 && (error.terminated || error.lateBlocked)) {
                    toast({
                        title: "Akses Ujian Terkunci",
                        description: error.message || "Batas waktu toleransi keterlambatan masuk telah berakhir. Hubungi pengawas di ruangan.",
                        variant: "destructive",
                    });
                    router.push(`/student/exams/${sessionId}`);
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
            if (adminToken) {
                setVerifyingAdminToken(false);
            }
        }
    };

    const handleTokenSubmit = (token: string) => {
        if (selectedExamId) {
            handleStartExam(selectedExamId, token, pendingAdminToken || undefined);
        }
    };

    const handleAdminTokenSubmit = (adminToken: string) => {
        if (selectedAdminExamId) {
            handleStartExam(selectedAdminExamId, undefined, adminToken);
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

            {/* Panduan & Unduhan Aplikasi Ujian (Android CartaExambro / iOS SEB) */}
            {!clientEnv.isExambro && !clientEnv.isSeb && (
                <>
                    {clientEnv.isIos ? (
                        <Card className="border-indigo-500/30 bg-indigo-500/5 rounded-2xl">
                            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
                                        <Smartphone className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm sm:text-base font-bold text-foreground">
                                                Safe Exam Browser (iPhone / iPad)
                                            </h2>
                                            <Badge variant="secondary" className="text-[11px] font-medium">
                                                iOS / iPadOS
                                            </Badge>
                                        </div>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Pasang aplikasi <strong>SafeExamBrowser</strong> dari App Store, lalu ketuk <strong>Buka di SEB</strong> atau unduh file konfigurasi <code>cartaexam.seb</code>.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0">
                                    <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm">
                                        <a href={sebLaunchUrl}>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Buka di SEB
                                        </a>
                                    </Button>
                                    <Button asChild variant="outline" className="font-semibold">
                                        <a href="/api/seb/config" download="cartaexam.seb">
                                            <Download className="mr-2 h-4 w-4" />
                                            Unduh File .seb
                                        </a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-indigo-500/30 bg-indigo-500/5 rounded-2xl">
                            <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
                                        <Smartphone className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm sm:text-base font-bold text-foreground">
                                                Aplikasi Ujian Resmi (CartaExambro / SEB)
                                            </h2>
                                            <Badge variant="secondary" className="text-[11px] font-medium">
                                                APK v1.1.0 • &lt; 2 MB
                                            </Badge>
                                        </div>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Gunakan <strong>CartaExambro</strong> untuk perangkat Android, atau file konfigurasi <code>.seb</code> untuk Safe Exam Browser (iOS/PC/Mac).
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 shrink-0">
                                    <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm">
                                        <a href="/api/exambro/download" download="CartaExambro-v1.1.0.apk">
                                            <Download className="mr-2 h-4 w-4" />
                                            Download APK Release
                                        </a>
                                    </Button>
                                    {!clientEnv.isAndroid && (
                                        <Button asChild variant="outline" className="font-semibold">
                                            <a href="/api/seb/config" download="cartaexam.seb">
                                                <Download className="mr-2 h-4 w-4" />
                                                Unduh File .seb (iOS/PC)
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {(clientEnv.isExambro || clientEnv.isSeb) && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>
                            Anda terhubung melalui aplikasi resmi{" "}
                            <strong>{clientEnv.isSeb ? "Safe Exam Browser (SEB)" : "CartaExambro"}</strong>.
                        </span>
                    </div>
                    {clientEnv.isSeb && (
                        <SebQuitButton
                            variant="outline"
                            size="sm"
                            className="border-emerald-500/40 bg-background/80 text-emerald-800 hover:bg-destructive hover:text-destructive-foreground dark:text-emerald-200"
                        />
                    )}
                </div>
            )}

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

            {/* Regular Proctor Token Prompt Dialog */}
            <TokenInputDialog
                open={tokenDialogOpen}
                onCancel={() => {
                    setTokenDialogOpen(false);
                    setSelectedExamId(null);
                    setTokenError(null);
                    setPendingAdminToken(null);
                }}
                onSubmit={handleTokenSubmit}
                loading={verifyingToken}
                error={tokenError}
                examName={exams.find(e => e.id === selectedExamId)?.sessionName}
            />

            {/* Administrative Clearance Token Dialog */}
            <AdminClearanceDialog
                open={adminClearanceDialogOpen}
                onCancel={() => {
                    setAdminClearanceDialogOpen(false);
                    setSelectedAdminExamId(null);
                    setAdminClearanceError(null);
                }}
                onSubmit={handleAdminTokenSubmit}
                loading={verifyingAdminToken}
                error={adminClearanceError}
                adminNotes={adminClearanceNotes}
                examName={exams.find(e => e.id === selectedAdminExamId)?.sessionName}
            />

            {/* Browser Lockdown Requirement Dialog (SEB / Exambro) */}
            <Dialog
                open={browserBlockDialog.open}
                onOpenChange={(open) => setBrowserBlockDialog((prev) => ({ ...prev, open }))}
            >
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Aplikasi Ujian Khusus Diperlukan</DialogTitle>
                        <DialogDescription>
                            Ujian ini mengaktifkan mode keamanan browser terkunci.
                        </DialogDescription>
                    </DialogHeader>
                    {browserBlockDialog.supportsSeb ? (
                        <div className="space-y-3">
                            <SebAccessPanel variant="dialog" message={browserBlockDialog.message} />
                            {browserBlockDialog.message.includes("Exambro") && (
                                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-900 dark:text-indigo-200 space-y-2.5">
                                    <p>
                                        <strong>Pengguna Android:</strong> Unduh &amp; buka ujian ini menggunakan aplikasi resmi <strong>CartaExambro</strong>.
                                    </p>
                                    <Button asChild size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                                        <a href="/api/exambro/download" download="CartaExambro-v1.1.0.apk">
                                            <Download className="mr-1.5 h-3.5 w-3.5" />
                                            Download APK CartaExambro (v1.1.0)
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                                {browserBlockDialog.message}
                            </div>
                            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5">
                                <p className="font-semibold text-foreground">Petunjuk Pengguna Android:</p>
                                <p>1. Unduh dan instal aplikasi <strong>CartaExambro</strong> di HP Android Anda.</p>
                                <p>2. Buka CartaExambro, ketuk <strong>Masuk Ujian CartaExam</strong> atau pindai QR server sekolah, lalu login menggunakan akun Anda.</p>
                            </div>
                            <Button asChild size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                                <a href="/api/exambro/download" download="CartaExambro-v1.1.0.apk">
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                    Download APK CartaExambro (v1.1.0)
                                </a>
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
