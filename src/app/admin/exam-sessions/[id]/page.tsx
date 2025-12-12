"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, Users, PlayCircle, CheckCircle, AlertTriangle, Clock, Eye, Key, Copy } from "lucide-react";
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

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [classFilter, setClassFilter] = useState("all");

    // Bulk Actions
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string>("");
    const [selectedMinutes, setSelectedMinutes] = useState<number>(10);
    const [processingAction, setProcessingAction] = useState(false);

    // Violations dialog state
    const [violationsDialogOpen, setViolationsDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);
    const [violations, setViolations] = useState<Violation[]>([]);
    const [loadingViolations, setLoadingViolations] = useState(false);

    // Token state
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [requireToken, setRequireToken] = useState(false);
    const [generatingToken, setGeneratingToken] = useState(false);

    useEffect(() => {
        fetchData();
        fetchToken();
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

    const fetchToken = async () => {
        try {
            const response = await fetch(`/api/exam-sessions/${params.id}/token`);
            if (response.ok) {
                const data = await response.json();
                setAccessToken(data.accessToken);
                setRequireToken(data.requireToken);
            }
        } catch (error) {
            console.error("Error fetching token:", error);
        }
    };

    const generateToken = async () => {
        setGeneratingToken(true);
        try {
            const response = await fetch(`/api/exam-sessions/${params.id}/token`, {
                method: 'POST',
            });
            if (response.ok) {
                const data = await response.json();
                setAccessToken(data.accessToken);
                toast({
                    title: "Token Generated",
                    description: `Token baru: ${data.accessToken}`,
                });
            }
        } catch (error) {
            console.error("Error generating token:", error);
            toast({
                title: "Error",
                description: "Gagal generate token",
                variant: "destructive",
            });
        } finally {
            setGeneratingToken(false);
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

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudentIds(filteredStudents.map(s => s.id));
        } else {
            setSelectedStudentIds([]);
        }
    };

    const handleSelectStudent = (studentId: string, checked: boolean) => {
        if (checked) {
            setSelectedStudentIds(prev => [...prev, studentId]);
        } else {
            setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
        }
    };

    const handleBulkAction = async () => {
        if (!selectedAction || selectedStudentIds.length === 0) return;

        setProcessingAction(true);
        try {
            const response = await fetch(`/api/exam-sessions/${params.id}/participant-actions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentIds: selectedStudentIds,
                    action: selectedAction,
                    ...(selectedAction === 'add_time' && { minutes: selectedMinutes })
                }),
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Aksi berhasil diterapkan",
                });
                setActionDialogOpen(false);
                setSelectedStudentIds([]);
                setSelectedAction("");
                fetchData();
            } else {
                throw new Error("Failed to perform action");
            }
        } catch (error) {
            console.error("Error performing action:", error);
            toast({
                title: "Error",
                description: "Gagal menerapkan aksi",
                variant: "destructive",
            });
        } finally {
            setProcessingAction(false);
        }
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
            // From use-exam-security.ts
            TAB_SWITCH: "Pindah Tab",
            WINDOW_BLUR: "Keluar Jendela",
            RIGHT_CLICK: "Klik Kanan",
            KEYBOARD_SHORTCUT: "Shortcut Keyboard",
            PRINT_ATTEMPT: "Cetak Halaman",
            DEVTOOLS: "Developer Tools",
            SCREENSHOT: "Screenshot",
            // From lockdown.ts
            tab_switch: "Pindah Tab",
            window_blur: "Keluar Jendela",
            context_menu: "Klik Kanan",
            copy: "Copy",
            paste: "Paste",
            cut: "Cut",
            screenshot_attempt: "Screenshot",
            // Legacy/Other
            copy_paste: "Copy/Paste",
            right_click: "Klik Kanan",
            screenshot: "Screenshot",
            fullscreen_exit: "Keluar Fullscreen",
            FULLSCREEN_EXIT: "Keluar Fullscreen",
            BACK_BUTTON: "Tombol Kembali",
        };
        return labels[type] || type;
    };

    // Filter logic
    const uniqueClasses = Array.from(new Set(students.map(s => s.className))).sort();

    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = classFilter === "all" || student.className === classFilter;
        return matchesSearch && matchesClass;
    });

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
                <div className="flex gap-2">
                    <Link href={`/admin/exam-sessions/${params.id}/results`}>
                        <Button variant="default">
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat Hasil
                        </Button>
                    </Link>
                    <Button variant="outline" onClick={fetchData} disabled={refreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
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

            {/* Token Card - only show if requireToken is enabled */}
            {requireToken && (
                <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-orange-600" />
                            <CardTitle className="text-base font-medium">Token Ujian</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-orange-600 border-orange-300">Diperlukan</Badge>
                    </CardHeader>
                    <CardContent>
                        {accessToken ? (
                            <div className="flex items-center gap-3">
                                <div className="text-3xl font-mono font-bold tracking-widest text-orange-700">
                                    {accessToken}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(accessToken);
                                        toast({ title: "Token disalin ke clipboard" });
                                    }}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={generateToken}
                                    disabled={generatingToken}
                                >
                                    {generatingToken ? "..." : "Generate Baru"}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">Belum ada token</span>
                                <Button
                                    size="sm"
                                    onClick={generateToken}
                                    disabled={generatingToken}
                                >
                                    {generatingToken ? "Generating..." : "Generate Token"}
                                </Button>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            Siswa memerlukan token ini untuk memulai ujian.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Filters and Actions */}
            <Card className="p-4">
                <div className="flex flex-col lg:flex-row gap-4 justify-between">
                    {/* Search and Filter */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <input
                            type="text"
                            placeholder="Cari nama siswa..."
                            className="flex h-9 w-full sm:w-52 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <select
                            className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-36"
                            value={classFilter}
                            onChange={(e) => setClassFilter(e.target.value)}
                        >
                            <option value="all">Semua Kelas</option>
                            {uniqueClasses.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {selectedStudentIds.length} dipilih
                        </span>
                        <div className="flex flex-wrap gap-2 items-center">
                            <select
                                className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-44"
                                value={selectedAction}
                                onChange={(e) => setSelectedAction(e.target.value)}
                                disabled={selectedStudentIds.length === 0}
                            >
                                <option value="">Pilih Aksi...</option>
                                <option value="add_time">Tambah Waktu</option>
                                <option value="reset_time">Reset Waktu</option>
                                <option value="reset_violations">Reset Pelanggaran</option>
                                <option value="reset_permission">Izinkan Lanjut Ujian</option>
                                <option value="force_finish">Paksa Selesai</option>
                                <option value="retake">Ulang Ujian</option>
                            </select>
                            {selectedAction === 'add_time' && (
                                <select
                                    className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring w-28"
                                    value={selectedMinutes}
                                    onChange={(e) => setSelectedMinutes(parseInt(e.target.value))}
                                >
                                    <option value={5}>+5 menit</option>
                                    <option value={10}>+10 menit</option>
                                    <option value={15}>+15 menit</option>
                                    <option value={30}>+30 menit</option>
                                    <option value={60}>+60 menit</option>
                                </select>
                            )}
                            <Button
                                size="sm"
                                onClick={() => setActionDialogOpen(true)}
                                disabled={!selectedAction || selectedStudentIds.length === 0}
                            >
                                Terapkan
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

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
                                    <th className="p-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </th>
                                    <th className="p-4 text-left font-medium">Nama Siswa</th>
                                    <th className="p-4 text-left font-medium">Kelas</th>
                                    <th className="p-4 text-left font-medium">Status</th>
                                    <th className="p-4 text-left font-medium">Waktu Mulai</th>
                                    <th className="p-4 text-left font-medium">Pelanggaran</th>
                                    <th className="p-4 text-left font-medium">Nilai</th>
                                    <th className="p-4 text-left font-medium">Detail</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.includes(student.id)}
                                                onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                        </td>
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
                                                    Lihat
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="p-4 text-center text-muted-foreground">
                                            Tidak ada peserta yang sesuai filter
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Action Confirmation Dialog */}
            <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Aksi</DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin melakukan aksi <strong>
                                {selectedAction === 'add_time' ? `Tambah Waktu (+${selectedMinutes} menit)` :
                                    selectedAction === 'reset_time' ? 'Reset Waktu' :
                                        selectedAction === 'reset_violations' ? 'Reset Pelanggaran' :
                                            selectedAction === 'reset_permission' ? 'Izinkan Lanjut Ujian' :
                                                selectedAction === 'force_finish' ? 'Paksa Selesai' :
                                                    selectedAction === 'retake' ? 'Ulang Ujian' : selectedAction}
                            </strong> pada {selectedStudentIds.length} peserta yang dipilih?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-4 mt-4">
                        <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleBulkAction} disabled={processingAction}>
                            {processingAction ? "Memproses..." : "Ya, Lanjutkan"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

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
