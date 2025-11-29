"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Edit, Calendar, User, FileText } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface Submission {
    id: string;
    sessionId: string;
    userId: string;
    studentName: string;
    sessionName: string;
    templateName: string;
    status: string;
    gradingStatus: "auto" | "pending_manual" | "manual" | "completed" | "published";
    score: number | null;
    earnedPoints: number | null;
    totalPoints: number | null;
    endTime: string;
    createdAt: string;
}

export default function GradingPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState("pending_manual");

    useEffect(() => {
        fetchSubmissions();
    }, [page, statusFilter]);

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "10",
                status: statusFilter,
            });

            const response = await fetch(`/api/grading/submissions?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setSubmissions(data.data);
                setTotalPages(data.metadata.totalPages);
            }
        } catch (error) {
            console.error("Error fetching submissions:", error);
            toast({
                title: "Error",
                description: "Gagal memuat data pengumpulan",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const getGradingStatusBadge = (status: string) => {
        switch (status) {
            case "pending_manual":
                return <Badge variant="destructive">Perlu Dinilai</Badge>;
            case "completed":
                return <Badge className="bg-green-500">Selesai Dinilai</Badge>;
            case "published":
                return <Badge variant="secondary">Dipublikasi</Badge>;
            case "auto":
                return <Badge variant="outline">Auto</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const handleGrade = (submissionId: string) => {
        router.push(`/admin/grading/${submissionId}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Penilaian Ujian</h2>
                    <p className="text-muted-foreground">
                        Tinjau dan nilai hasil ujian siswa
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <Select value={statusFilter} onValueChange={(val) => {
                        setStatusFilter(val);
                        setPage(1);
                    }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua</SelectItem>
                            <SelectItem value="pending_manual">Perlu Dinilai</SelectItem>
                            <SelectItem value="completed">Selesai</SelectItem>
                            <SelectItem value="published">Dipublikasi</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Memuat data...</p>
                </div>
            ) : submissions.length === 0 ? (
                <div className="text-center py-20 border rounded-lg bg-muted/20">
                    <p className="text-muted-foreground">Tidak ada pengumpulan untuk dinilai</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {submissions.map((submission) => (
                        <Card key={submission.id}>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-lg">{submission.sessionName}</h3>
                                            {getGradingStatusBadge(submission.gradingStatus)}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{submission.templateName}</p>

                                        <div className="flex flex-wrap gap-4 text-sm">
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <User className="h-4 w-4" />
                                                {submission.studentName}
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                {format(new Date(submission.endTime), "d MMM yyyy, HH:mm", { locale: idLocale })}
                                            </div>
                                            {submission.score !== null && (
                                                <div className="flex items-center gap-1">
                                                    <FileText className="h-4 w-4" />
                                                    <span className="font-semibold">
                                                        Nilai: {submission.score}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        ({submission.earnedPoints}/{submission.totalPoints} poin)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <Button onClick={() => handleGrade(submission.id)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            {submission.gradingStatus === "pending_manual" ? "Nilai Sekarang" : "Lihat Detail"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </div>
            )}
        </div>
    );
}
