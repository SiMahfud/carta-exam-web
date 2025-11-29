"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, Users, PlayCircle, CheckCircle, AlertTriangle, Clock, Eye } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface StudentProgress {
    id: string;
    name: string;
    className: string;
    status: "not_started" | "in_progress" | "completed";
    score: number | null;
    startTime: string | null;
    endTime: string | null;
    violationCount: number;
}

interface SessionStats {
    total: number;
    notStarted: number;
    inProgress: number;
    completed: number;
    violations: number;
}

interface SessionData {
    id: string;
    name: string;
    status: string;
    startTime: string;
    endTime: string;
}

interface Violation {
    type: string;
    details?: string;
    timestamp: string;
}

export default function SessionMonitorPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [session, setSession] = useState<SessionData | null>(null);
    const [stats, setStats] = useState<SessionStats | null>(null);
    const [students, setStudents] = useState<StudentProgress[]>([]);

    // Violations dialog state
    const [violationsDialogOpen, setViolationsDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);
    const [violations, setViolations] = useState<Violation[]>([]);
    const [loadingViolations, setLoadingViolations] = useState(false);

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30s
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        setRefreshing(true);
        try {
            const response = await fetch(`/api/exam-sessions/${params.id}/monitor`);
            if (response.ok) {
                const data = await response.json();
                setSession(data.session);
                setStats(data.stats);
                setStudents(data.students);
            } else {
                throw new Error("Failed to load session data");
            }
        } catch (error) {
            console.error("Error fetching monitor data:", error);
            toast({
                title: "Error",
                description: "Gagal memuat data monitoring",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchViolations = async (studentId: string) => {
        setLoadingViolations(true);
        try {
            const response = await fetch(`/api/exam-sessions/${params.id}/violations/${studentId}`);
            if (response.ok) {
                const data = await response.json();
                setViolations(data.violations);
            }
        } catch (error) {
            console.error("Error fetching violations:", error);
            toast({
                title: "Error",
                description: "Gagal memuat data pelanggaran",
                variant: "destructive",
            });
        } finally {
            setLoadingViolations(false);
        }
    };

    const handleViewViolations = (student: StudentProgress) => {
        setSelectedStudent(student);
        setViolationsDialogOpen(true);
        fetchViolations(student.id);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "in_progress":
                return <Badge className="bg-blue-500">Mengerjakan</Badge>;
            case "completed":
                return <Badge className="bg-green-500">Selesai</Badge>;
            case "not_started":
            default:
                return <Badge variant="outline">Belum Mulai</Badge>;
        }
    };

    const getViolationTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            tab_switch: "Pindah Tab",
            copy_paste: "Copy/Paste",
            right_click: "Klik Kanan",
            screenshot: "Screenshot",
            fullscreen_exit: "Keluar Fullscreen",
        };
        return labels[type] || type;
    };

    if (loading) {
        return <div className="flex justify-center py-20">Memuat data monitoring...</div>;
    }

    if (!session || !stats) {
        return <div className="text-center py-20">Data tidak ditemukan</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div className="flex items-center gap-4">
                    <Link href="/admin/exam-sessions">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold tracking-tight">{session.name}</h2>
                            <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                                {session.status === 'active' ? 'Sedang Berlangsung' : session.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2 text-sm mt-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(session.startTime), "d MMM HH:mm", { locale: idLocale })} - {format(new Date(session.endTime), "HH:mm")}
                        </p>
                    </div>
                </div>
                <Button variant="outline" onClick={fetchData} disabled={refreshing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Peserta</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sedang Mengerjakan</CardTitle>
                        <PlayCircle className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inProgress}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Selesai</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.completed}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pelanggaran</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.violations}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Student List */}
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Peserta</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="p-4 text-left font-medium">Nama Siswa</th>
                                    <th className="p-4 text-left font-medium">Kelas</th>
                                    <th className="p-4 text-left font-medium">Status</th>
                                    <th className="p-4 text-left font-medium">Waktu Mulai</th>
                                    <th className="p-4 text-left font-medium">Pelanggaran</th>
                                    <th className="p-4 text-left font-medium">Nilai</th>
                                    <th className="p-4 text-left font-medium">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr key={student.id} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="p-4 font-medium">{student.name}</td>
                                        <td className="p-4 text-muted-foreground">{student.className}</td>
                                        <td className="p-4">{getStatusBadge(student.status)}</td>
                                        <td className="p-4 text-muted-foreground">
                                            {student.startTime ? format(new Date(student.startTime), "HH:mm") : "-"}
                                        </td>
                                        <td className="p-4">
                                            {student.violationCount > 0 ? (
                                                <Badge variant="destructive">{student.violationCount}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 font-medium">
                                            {student.score !== null ? student.score : "-"}
                                        </td>
                                        <td className="p-4">
                                            {student.violationCount > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleViewViolations(student)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Detail
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-4 text-center text-muted-foreground">
                                            Tidak ada peserta
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Violations Dialog */}
            <Dialog open={violationsDialogOpen} onOpenChange={setViolationsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detail Pelanggaran</DialogTitle>
                        <DialogDescription>
                            {selectedStudent?.name} - {selectedStudent?.className}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {loadingViolations ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                <p className="mt-2 text-sm text-muted-foreground">Memuat data...</p>
                            </div>
                        ) : violations.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Tidak ada pelanggaran
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {violations.map((violation, idx) => (
                                    <div key={idx} className="flex gap-4 p-4 bg-muted/30 rounded-lg border">
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-semibold text-sm">
                                                        {getViolationTypeLabel(violation.type)}
                                                    </h4>
                                                    {violation.details && (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {violation.details}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {format(new Date(violation.timestamp), "HH:mm:ss")}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
