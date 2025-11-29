"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Play, CheckCircle, XCircle } from "lucide-react";
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
    subject Name: string;
durationMinutes: number;
totalScore: number;
examStatus: "upcoming" | "active" | "in_progress" | "completed" | "expired";
hasSubmission: boolean;
submissionId ?: string;
score ?: number;
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
                return <Badge className="bg-green-500">Sedang Berlangsung</Badge>;
            case "in_progress":
                return <Badge className="bg-blue-500">Sedang Dikerjakan</Badge>;
            case "completed":
                return <Badge variant="secondary">Selesai</Badge>;
            case "upcoming":
                return <Badge variant="outline">Akan Datang</Badge>;
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
        <div className="container max-w-5xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Ujian Saya</h1>
                <p className="text-muted-foreground">Daftar ujian yang ditugaskan kepada Anda</p>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {["all", "active", "upcoming", "completed"].map((status) => (
                    <Button
                        key={status}
                        variant={filter === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter(status)}
                    >
                        {status === "all" ? "Semua" : status === "active" ? "Aktif" : status === "upcoming" ? "Akan Datang" : "Selesai"}
                    </Button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Memuat ujian...</p>
                </div>
            ) : exams.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-20">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Tidak ada ujian untuk ditampilkan</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {exams.map((exam) => (
                        <Card key={exam.id}>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-lg">{exam.sessionName}</h3>
                                                <p className="text-sm text-muted-foreground">{exam.templateName} • {exam.subjectName}</p>
                                            </div>
                                            {getStatusBadge(exam.examStatus)}
                                        </div>

                                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                {format(new Date(exam.startTime), "d MMM yyyy", { locale: idLocale })}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {format(new Date(exam.startTime), "HH:mm")} - {format(new Date(exam.endTime), "HH:mm")}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <FileText className="h-4 w-4" />
                                                {exam.durationMinutes} menit • {exam.totalScore} poin
                                            </div>
                                        </div>

                                        {exam.score !== undefined && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">Nilai:</span>
                                                <Badge variant={exam.score >= 75 ? "default" : "destructive"}>
                                                    {exam.score}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center">
                                        {exam.examStatus === "active" && !exam.hasSubmission && (
                                            <Button onClick={() => handleStartExam(exam.id)}>
                                                <Play className="mr-2 h-4 w-4" />
                                                Mulai Ujian
                                            </Button>
                                        )}
                                        {exam.examStatus === "in_progress" && (
                                            <Button onClick={() => handleContinueExam(exam.id)} variant="outline">
                                                Lanjutkan
                                            </Button>
                                        )}
                                        {exam.examStatus === "completed" && (
                                            <Button variant="ghost" disabled>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Selesai
                                            </Button>
                                        )}
                                        {exam.examStatus === "expired" && (
                                            <Button variant="ghost" disabled>
                                                <XCircle className="mr-2 h-4 w-4" />
                                                Terlewat
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
