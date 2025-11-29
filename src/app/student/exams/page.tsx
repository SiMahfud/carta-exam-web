"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Play, CheckCircle, XCircle, Timer, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

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
}

export default function StudentExamsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    // TODO: Get from auth/session
    const studentId = "student-1";

    useEffect(() => {
        fetchExams();
    }, [filter]);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                studentId,
                status: filter
            });

            const response = await fetch(`/api/student/exams?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setExams(data.data);
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
    };

    const getStatusBadge = (examStatus: string) => {
        switch (examStatus) {
            case "active":
                return <Badge className="bg-green-500 hover:bg-green-600">Sedang Berlangsung</Badge>;
            case "in_progress":
                return <Badge className="bg-blue-500 hover:bg-blue-600">Sedang Dikerjakan</Badge>;
            case "completed":
                return <Badge variant="secondary" className="bg-muted text-muted-foreground">Selesai</Badge>;
            case "upcoming":
                return <Badge variant="outline" className="border-primary text-primary">Akan Datang</Badge>;
            case "expired":
                return <Badge variant="destructive">Terlewat</Badge>;
            default:
                return <Badge>{examStatus}</Badge>;
        }
    };

    const handleStartExam = async (sessionId: string) => {
        try {
            const response = await fetch(`/api/student/exams/${sessionId}/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId }),
            });

            if (response.ok) {
                const data = await response.json();
                router.push(`/student/exams/${sessionId}`);
            } else {
                const error = await response.json();
                throw new Error(error.error || "Failed to start exam");
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleContinueExam = (sessionId: string) => {
        router.push(`/student/exams/${sessionId}`);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ujian Saya</h1>
                    <p className="text-muted-foreground mt-1">Kelola dan kerjakan ujian yang ditugaskan.</p>
                </div>

                {/* Filters */}
                <div className="flex p-1 bg-muted/50 rounded-lg border">
                    {["all", "active", "upcoming", "completed"].map((status) => (
                        <Button
                            key={status}
                            variant={filter === status ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setFilter(status)}
                            className={`rounded-md px-4 ${filter === status ? "bg-background shadow-sm text-primary font-medium" : "text-muted-foreground"}`}
                        >
                            {status === "all" ? "Semua" : status === "active" ? "Aktif" : status === "upcoming" ? "Akan Datang" : "Selesai"}
                        </Button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="h-[250px] animate-pulse bg-muted/20" />
                    ))}
                </div>
            ) : exams.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/10">
                    <CardContent className="text-center py-20 flex flex-col items-center">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">Tidak ada ujian ditemukan</h3>
                        <p className="text-muted-foreground max-w-sm mt-2">
                            Belum ada ujian yang sesuai dengan filter yang Anda pilih.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.map((exam) => (
                        <Card key={exam.id} className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-muted/60">
                            <div className={`h-2 w-full ${exam.examStatus === 'active' ? 'bg-green-500' :
                                    exam.examStatus === 'in_progress' ? 'bg-blue-500' :
                                        exam.examStatus === 'upcoming' ? 'bg-primary' :
                                            exam.examStatus === 'expired' ? 'bg-destructive' : 'bg-muted'
                                }`} />
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start mb-2">
                                    {getStatusBadge(exam.examStatus)}
                                    {exam.score !== undefined && (
                                        <Badge variant={exam.score >= 75 ? "default" : "destructive"} className="ml-2">
                                            Nilai: {exam.score}
                                        </Badge>
                                    )}
                                </div>
                                <CardTitle className="line-clamp-2 text-lg">{exam.sessionName}</CardTitle>
                                <CardDescription className="line-clamp-1">{exam.subjectName}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4 text-sm">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded-md">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-medium">{format(new Date(exam.startTime), "d MMM", { locale: idLocale })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded-md">
                                        <Clock className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-medium">{format(new Date(exam.startTime), "HH:mm")}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded-md">
                                        <Timer className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-medium">{exam.durationMinutes} mnt</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground bg-muted/30 p-2 rounded-md">
                                        <FileText className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-medium">{exam.totalScore} pts</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0 pb-6">
                                {exam.examStatus === "active" && !exam.hasSubmission && (
                                    <Button onClick={() => handleStartExam(exam.id)} className="w-full shadow-md shadow-green-500/20 hover:shadow-green-500/30 bg-green-600 hover:bg-green-700">
                                        <Play className="mr-2 h-4 w-4" />
                                        Mulai Ujian
                                    </Button>
                                )}
                                {exam.examStatus === "in_progress" && (
                                    <Button onClick={() => handleContinueExam(exam.id)} className="w-full shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 bg-blue-600 hover:bg-blue-700">
                                        <Play className="mr-2 h-4 w-4" />
                                        Lanjutkan
                                    </Button>
                                )}
                                {exam.examStatus === "completed" && (
                                    <Button variant="secondary" className="w-full" disabled>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Selesai
                                    </Button>
                                )}
                                {exam.examStatus === "upcoming" && (
                                    <Button variant="outline" className="w-full" disabled>
                                        <Clock className="mr-2 h-4 w-4" />
                                        Belum Dimulai
                                    </Button>
                                )}
                                {exam.examStatus === "expired" && (
                                    <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" disabled>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Terlewat
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
