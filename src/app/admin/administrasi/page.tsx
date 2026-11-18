"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Lock,
    Unlock,
    Key,
    ShieldCheck,
    Users,
    Search,
    Copy,
    Check,
    Trash2,
    Plus,
    RefreshCw,
    AlertCircle,
    FileText,
    Clock,
    Sparkles,
    Calendar,
    ChevronRight,
    FileSpreadsheet,
    Download,
    Printer,
    Upload
} from "lucide-react";
import { ImportClearanceDialog } from "@/components/admin/administrasi/ImportClearanceDialog";
import { PrintDispensasiModal } from "@/components/admin/administrasi/PrintDispensasiModal";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface StudentItem {
    id: string;
    name: string;
    username: string; // NIS
    class: {
        id: string;
        name: string;
        grade: number;
    } | null;
    clearance: {
        id?: string;
        status: "locked" | "cleared" | "dispensation";
        notes?: string | null;
        validUntil?: string | null;
        updatedAt?: string | null;
    };
}

interface TokenItem {
    id: string;
    token: string;
    scope?: "session" | "daily" | "weekly" | "permanent";
    studentId?: string | null;
    studentName?: string | null;
    studentUsername?: string | null;
    expiresAt: string;
    isUsed: boolean;
    usedAt?: string | null;
    notes?: string | null;
    createdAt: string;
}

interface ClassOption {
    id: string;
    name: string;
    grade: number;
}

export default function AdministrasiSiswaPage() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<"students" | "tokens">("students");

    // Students state
    const [students, setStudents] = useState<StudentItem[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClass, setSelectedClass] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [stats, setStats] = useState({ total: 0, locked: 0, dispensation: 0, cleared: 0 });
    const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({});

    // Tokens state
    const [tokens, setTokens] = useState<TokenItem[]>([]);
    const [loadingTokens, setLoadingTokens] = useState(false);
    const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

    // Dialog state for updating single student status
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState<StudentItem | null>(null);
    const [targetStatus, setTargetStatus] = useState<"locked" | "cleared" | "dispensation">("locked");
    const [dispensationDuration, setDispensationDuration] = useState<"session" | "daily" | "weekly" | "permanent">("daily");
    const [targetNotes, setTargetNotes] = useState("");
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Dialog state for generating token
    const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
    const [tokenTargetStudent, setTokenTargetStudent] = useState<StudentItem | null>(null);
    const [tokenScope, setTokenScope] = useState<"session" | "daily" | "weekly" | "permanent">("daily");
    const [customTokenValue, setCustomTokenValue] = useState("");
    const [tokenNotes, setTokenNotes] = useState("");
    const [generatingToken, setGeneratingToken] = useState(false);
    const [createdTokenResult, setCreatedTokenResult] = useState<string | null>(null);

    // Import Excel & Print Slip Dialog states
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [tokenToPrint, setTokenToPrint] = useState<{
        token: string;
        scope?: "session" | "daily" | "weekly" | "permanent" | string | null;
        studentName?: string | null;
        studentUsername?: string | null;
        className?: string | null;
        expiresAt: string | Date;
        notes?: string | null;
    } | null>(null);

    // Fetch classes
    useEffect(() => {
        fetch("/api/classes")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setClasses(data);
                } else if (data?.data && Array.isArray(data.data)) {
                    setClasses(data.data);
                }
            })
            .catch(err => console.error("Error fetching classes:", err));
    }, []);

    // Fetch students list
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.set("search", searchQuery);
            if (selectedClass !== "all") params.set("classId", selectedClass);
            if (selectedStatus !== "all") params.set("status", selectedStatus);

            const res = await fetch(`/api/admin/clearance?${params.toString()}`);
            if (res.ok) {
                const json = await res.json();
                const data = json.data || json;
                setStudents(data.students || []);
                if (data.stats) {
                    setStats(data.stats);
                }
            } else {
                toast({
                    title: "Error",
                    description: "Gagal memuat daftar administrasi siswa",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedClass, selectedStatus, toast]);

    // Fetch tokens list
    const fetchTokens = useCallback(async () => {
        setLoadingTokens(true);
        try {
            const res = await fetch("/api/admin/clearance/tokens");
            if (res.ok) {
                const json = await res.json();
                setTokens(json.data || json || []);
            }
        } catch (error) {
            console.error("Error fetching tokens:", error);
        } finally {
            setLoadingTokens(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === "students") {
            fetchStudents();
        } else {
            fetchTokens();
        }
    }, [activeTab, fetchStudents, fetchTokens]);

    // Quick single toggle with Optimistic UI & AJAX (No full reload)
    const handleQuickToggle = async (student: StudentItem, newStatus: "locked" | "cleared") => {
        const studentId = student.id;
        const oldStatus = student.clearance.status;
        if (oldStatus === newStatus) return;

        const oldNotes = student.clearance.notes;
        const newNotes = newStatus === "cleared"
            ? "Bebas administrasi"
            : (oldNotes && oldNotes !== "Bebas administrasi" ? oldNotes : "Belum menyelesaikan administrasi");

        // 1. Mark this specific row as toggling
        setTogglingIds(prev => ({ ...prev, [studentId]: true }));

        // 2. Optimistic UI update for student
        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                return {
                    ...s,
                    clearance: {
                        ...s.clearance,
                        status: newStatus,
                        notes: newNotes,
                        updatedAt: new Date().toISOString()
                    }
                };
            }
            return s;
        }));

        // 3. Optimistic UI update for stats counters
        setStats(prev => {
            const next = { ...prev };
            if (oldStatus === "locked") next.locked = Math.max(0, next.locked - 1);
            else if (oldStatus === "dispensation") next.dispensation = Math.max(0, next.dispensation - 1);
            else if (oldStatus === "cleared") next.cleared = Math.max(0, next.cleared - 1);

            if (newStatus === "locked") next.locked += 1;
            else if (newStatus === "cleared") next.cleared += 1;

            return next;
        });

        try {
            const res = await fetch("/api/admin/clearance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentIds: [studentId],
                    status: newStatus,
                    notes: newNotes,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Gagal mengubah status di server");
            }

            toast({
                title: newStatus === "cleared" ? "Akses Dibuka" : "Akses Dikunci",
                description: `Status ${student.name} sekarang: ${newStatus === "cleared" ? "Bebas Ujian" : "Terkunci"}`,
            });
        } catch (error: any) {
            // Rollback optimistic updates on error
            setStudents(prev => prev.map(s => {
                if (s.id === studentId) {
                    return {
                        ...s,
                        clearance: {
                            ...s.clearance,
                            status: oldStatus,
                            notes: oldNotes,
                        }
                    };
                }
                return s;
            }));

            setStats(prev => {
                const next = { ...prev };
                if (newStatus === "locked") next.locked = Math.max(0, next.locked - 1);
                else if (newStatus === "cleared") next.cleared = Math.max(0, next.cleared - 1);

                if (oldStatus === "locked") next.locked += 1;
                else if (oldStatus === "dispensation") next.dispensation += 1;
                else if (oldStatus === "cleared") next.cleared += 1;

                return next;
            });

            toast({
                title: "Gagal Mengubah Status",
                description: error.message || "Gagal mengubah status administrasi",
                variant: "destructive",
            });
        } finally {
            setTogglingIds(prev => {
                const copy = { ...prev };
                delete copy[studentId];
                return copy;
            });
        }
    };

    // Bulk update with Optimistic UI & AJAX (No full reload)
    const handleBulkUpdate = async (status: "locked" | "cleared") => {
        if (selectedStudentIds.length === 0) return;
        const targetIds = [...selectedStudentIds];
        const prevStudents = [...students];
        const prevStats = { ...stats };

        // Optimistically update students
        setStudents(prev => prev.map(s => {
            if (targetIds.includes(s.id)) {
                return {
                    ...s,
                    clearance: {
                        ...s.clearance,
                        status,
                        notes: status === "cleared" ? "Bebas administrasi masal" : "Terkunci administrasi masal",
                        updatedAt: new Date().toISOString()
                    }
                };
            }
            return s;
        }));

        // Recalculate stats optimistically
        let locked = 0;
        let dispensation = 0;
        let cleared = 0;
        prevStudents.forEach(s => {
            const sStatus = targetIds.includes(s.id) ? status : s.clearance.status;
            if (sStatus === "locked") locked++;
            else if (sStatus === "dispensation") dispensation++;
            else if (sStatus === "cleared") cleared++;
        });
        setStats(prev => ({ ...prev, locked, dispensation, cleared }));

        setSelectedStudentIds([]);

        try {
            const res = await fetch("/api/admin/clearance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentIds: targetIds,
                    status,
                    notes: status === "cleared" ? "Bebas administrasi masal" : "Terkunci administrasi masal",
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Gagal pembaruan masal");
            }

            toast({
                title: "Pembaruan Masal Berhasil",
                description: `${targetIds.length} siswa berhasil diubah ke status: ${status === "cleared" ? "Bebas Ujian" : "Terkunci"}`,
            });
        } catch (error: any) {
            // Rollback on error
            setStudents(prevStudents);
            setStats(prevStats);
            setSelectedStudentIds(targetIds);
            toast({
                title: "Gagal",
                description: error.message || "Gagal memperbarui masal",
                variant: "destructive",
            });
        }
    };

    // Save student status dialog with AJAX (No full reload)
    const handleSaveStatusDialog = async () => {
        if (!studentToEdit) return;
        setUpdatingStatus(true);
        const oldStatus = studentToEdit.clearance.status;

        try {
            let validUntilDate: Date | null = null;
            if (targetStatus === "dispensation") {
                if (dispensationDuration === "session") {
                    validUntilDate = new Date(Date.now() + 4 * 60 * 60 * 1000);
                } else if (dispensationDuration === "weekly") {
                    validUntilDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    validUntilDate.setHours(23, 59, 59, 999);
                } else if (dispensationDuration === "permanent") {
                    validUntilDate = null;
                } else {
                    // daily
                    validUntilDate = new Date();
                    validUntilDate.setHours(23, 59, 59, 999);
                }
            }

            const res = await fetch("/api/admin/clearance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentIds: [studentToEdit.id],
                    status: targetStatus,
                    notes: targetNotes,
                    validUntil: validUntilDate?.toISOString(),
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Gagal menyimpan");
            }

            // Update student locally
            setStudents(prev => prev.map(s => {
                if (s.id === studentToEdit.id) {
                    return {
                        ...s,
                        clearance: {
                            ...s.clearance,
                            status: targetStatus,
                            notes: targetNotes,
                            validUntil: validUntilDate?.toISOString() || null,
                            updatedAt: new Date().toISOString()
                        }
                    };
                }
                return s;
            }));

            // Update stats
            if (oldStatus !== targetStatus) {
                setStats(prev => {
                    const next = { ...prev };
                    if (oldStatus === "locked") next.locked = Math.max(0, next.locked - 1);
                    else if (oldStatus === "dispensation") next.dispensation = Math.max(0, next.dispensation - 1);
                    else if (oldStatus === "cleared") next.cleared = Math.max(0, next.cleared - 1);

                    if (targetStatus === "locked") next.locked += 1;
                    else if (targetStatus === "dispensation") next.dispensation += 1;
                    else if (targetStatus === "cleared") next.cleared += 1;

                    return next;
                });
            }

            toast({
                title: "Berhasil",
                description: `Status ${studentToEdit.name} berhasil disimpan.`,
            });
            setStatusDialogOpen(false);
        } catch (error: any) {
            toast({
                title: "Gagal",
                description: error.message || "Gagal menyimpan perubahan",
                variant: "destructive",
            });
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Generate Token with AJAX (No full student reload)
    const handleGenerateToken = async () => {
        setGeneratingToken(true);
        try {
            const res = await fetch("/api/admin/clearance/tokens", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId: tokenTargetStudent?.id || null,
                    scope: tokenScope,
                    customToken: customTokenValue.trim() || undefined,
                    notes: tokenNotes.trim() || (tokenTargetStudent ? `Dispensasi untuk ${tokenTargetStudent.name}` : "Token Dispensasi Umum"),
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Gagal membuat token");
            }

            const json = await res.json();
            const tokenData = json.data?.data || json.data || {};
            const newToken = tokenData?.token || customTokenValue;
            setCreatedTokenResult(newToken);

            toast({
                title: "Token Berhasil Dibuat",
                description: `Token: ${newToken} (${tokenScope === 'session' ? 'Per Sesi' : tokenScope === 'weekly' ? '1 Pekan' : tokenScope === 'permanent' ? 'Permanen' : 'Harian'})`,
            });

            // Prepend new token to tokens list immediately
            if (tokenData && tokenData.id) {
                const formattedToken: TokenItem = {
                    id: tokenData.id,
                    token: tokenData.token || newToken,
                    scope: tokenData.scope || tokenScope,
                    studentId: tokenData.studentId || tokenTargetStudent?.id || null,
                    studentName: tokenTargetStudent?.name || null,
                    studentUsername: tokenTargetStudent?.username || null,
                    expiresAt: tokenData.expiresAt ? new Date(tokenData.expiresAt).toISOString() : new Date().toISOString(),
                    isUsed: false,
                    usedAt: null,
                    notes: tokenData.notes || tokenNotes,
                    createdAt: tokenData.createdAt ? new Date(tokenData.createdAt).toISOString() : new Date().toISOString(),
                };
                setTokens(prev => [formattedToken, ...prev]);
            } else {
                fetchTokens();
            }

            // NOTE: Do NOT call fetchStudents() - keeps the student list undisturbed without reloading!
        } catch (error: any) {
            toast({
                title: "Gagal",
                description: error.message || "Gagal membuat token",
                variant: "destructive",
            });
        } finally {
            setGeneratingToken(false);
        }
    };

    // Revoke Token with AJAX & Optimistic UI
    const handleRevokeToken = async (id: string) => {
        const prevTokens = [...tokens];
        // Optimistically remove from tokens list
        setTokens(prev => prev.filter(t => t.id !== id));

        try {
            const res = await fetch(`/api/admin/clearance/tokens/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast({
                    title: "Token Dicabut",
                    description: "Token telah berhasil dihapus / dicabut.",
                });
            } else {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Gagal mencabut token");
            }
        } catch (error: any) {
            // Rollback
            setTokens(prevTokens);
            toast({
                title: "Gagal",
                description: error.message || "Gagal mencabut token",
                variant: "destructive",
            });
        }
    };

    // Copy token to clipboard
    const handleCopyToken = (token: string, id: string) => {
        navigator.clipboard.writeText(token);
        setCopiedTokenId(id);
        toast({
            title: "Disalin!",
            description: `Token ${token} disalin ke papan klip`,
        });
        setTimeout(() => setCopiedTokenId(null), 2500);
    };

    // Select all / deselect all
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedStudentIds(students.map(s => s.id));
        } else {
            setSelectedStudentIds([]);
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedStudentIds(prev => [...prev, id]);
        } else {
            setSelectedStudentIds(prev => prev.filter(i => i !== id));
        }
    };

    return (
        <div className="space-y-6 pb-12 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Key className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Administrasi & Izin Ujian</h1>
                            <p className="text-sm text-muted-foreground">
                                Pengaturan akses ujian siswa terkait administrasi sekolah dan token dispensasi.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setImportDialogOpen(true)}
                        className="rounded-lg gap-1.5 border-dashed border-primary/40 text-primary hover:bg-primary/5 font-semibold"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Impor Excel
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const params = new URLSearchParams();
                            if (selectedClass !== "all") params.set("classId", selectedClass);
                            window.open(`/api/admin/clearance/export?${params.toString()}`, "_blank");
                        }}
                        className="rounded-lg gap-1.5"
                    >
                        <Download className="h-4 w-4" />
                        Ekspor Excel
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => activeTab === "students" ? fetchStudents() : fetchTokens()}
                        disabled={loading || loadingTokens}
                        className="rounded-lg gap-1.5"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading || loadingTokens ? "animate-spin" : ""}`} />
                        Segarkan
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            setTokenTargetStudent(null);
                            setCustomTokenValue("");
                            setTokenNotes("");
                            setCreatedTokenResult(null);
                            setTokenDialogOpen(true);
                        }}
                        className="rounded-lg gap-1.5 bg-primary"
                    >
                        <Plus className="h-4 w-4" />
                        Buat Token Baru
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="border border-border/70 shadow-xs">
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Total Siswa</p>
                            <h3 className="text-2xl font-bold mt-1">{stats.total}</h3>
                        </div>
                        <div className="p-3 bg-muted rounded-2xl text-muted-foreground">
                            <Users className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-amber-500/30 bg-amber-500/5 shadow-xs">
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-amber-700 dark:text-amber-400 uppercase font-semibold">Terkunci</p>
                            <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{stats.locked}</h3>
                        </div>
                        <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl">
                            <Lock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-blue-500/30 bg-blue-500/5 shadow-xs">
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-blue-700 dark:text-blue-400 uppercase font-semibold">Dispensasi Aktif</p>
                            <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.dispensation}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
                            <Key className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-semibold">Bebas Ujian</p>
                            <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{stats.cleared}</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tab Pills */}
            <div className="flex border-b border-border/80 gap-6">
                <button
                    onClick={() => setActiveTab("students")}
                    className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                        activeTab === "students"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Users className="h-4 w-4" />
                    Daftar Siswa & Status Izin ({students.length})
                </button>
                <button
                    onClick={() => setActiveTab("tokens")}
                    className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                        activeTab === "tokens"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Key className="h-4 w-4" />
                    Daftar Token Dispensasi ({tokens.length})
                </button>
            </div>

            {/* TAB 1: STUDENTS MANAGEMENT */}
            {activeTab === "students" && (
                <div className="space-y-4">
                    {/* Filter and Search Bar */}
                    <Card className="border border-border/70 shadow-xs">
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari nama siswa atau NIS..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 h-10 rounded-xl"
                                    />
                                </div>

                                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                                    {/* Class Filter */}
                                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                                        <SelectTrigger className="w-[160px] h-10 rounded-xl">
                                            <SelectValue placeholder="Pilih Kelas" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Kelas</SelectItem>
                                            {classes.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Status Filter */}
                                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                        <SelectTrigger className="w-[160px] h-10 rounded-xl">
                                            <SelectValue placeholder="Status Izin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Status</SelectItem>
                                            <SelectItem value="locked">Terkunci (Perlu TU)</SelectItem>
                                            <SelectItem value="dispensation">Dispensasi Aktif</SelectItem>
                                            <SelectItem value="cleared">Bebas Administrasi</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Bulk Action Bar */}
                            {selectedStudentIds.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-xl">
                                    <div className="text-xs font-semibold text-foreground px-1">
                                        {selectedStudentIds.length} siswa dipilih
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleBulkUpdate("cleared")}
                                            className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 h-8 gap-1.5"
                                        >
                                            <Unlock className="h-3.5 w-3.5" />
                                            Bebaskan Siswa Terpilih
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleBulkUpdate("locked")}
                                            className="text-xs text-amber-600 border-amber-300 hover:bg-amber-50 h-8 gap-1.5"
                                        >
                                            <Lock className="h-3.5 w-3.5" />
                                            Kunci Siswa Terpilih
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Students Table */}
                    <Card className="border border-border/70 shadow-xs overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-12 text-center">
                                        <Checkbox
                                            checked={students.length > 0 && selectedStudentIds.length === students.length}
                                            onCheckedChange={handleSelectAll}
                                            aria-label="Pilih semua"
                                        />
                                    </TableHead>
                                    <TableHead className="w-[200px]">NIS & Nama Siswa</TableHead>
                                    <TableHead className="w-[120px]">Kelas</TableHead>
                                    <TableHead className="w-[150px]">Status Izin</TableHead>
                                    <TableHead>Catatan Petugas TU</TableHead>
                                    <TableHead className="text-right w-[200px]">Aksi Cepat</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            Memuat data siswa...
                                        </TableCell>
                                    </TableRow>
                                ) : students.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            Tidak ada siswa yang sesuai filter.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    students.map((student) => {
                                        const isLocked = student.clearance.status === "locked";
                                        const isDispensation = student.clearance.status === "dispensation";
                                        const isCleared = student.clearance.status === "cleared";

                                        return (
                                            <TableRow key={student.id} className="hover:bg-muted/30">
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={selectedStudentIds.includes(student.id)}
                                                        onCheckedChange={(checked) => handleSelectOne(student.id, !!checked)}
                                                        aria-label={`Pilih ${student.name}`}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-foreground">{student.name}</div>
                                                    <div className="text-xs font-mono text-muted-foreground">NIS: {student.username}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-medium text-xs">
                                                        {student.class?.name || "Belum Terdaftar"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {isLocked && (
                                                        <Badge variant="destructive" className="bg-amber-600 hover:bg-amber-700 text-white gap-1 font-semibold text-xs">
                                                            <Lock className="w-3 h-3" />
                                                            Terkunci
                                                        </Badge>
                                                    )}
                                                    {isDispensation && (
                                                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 font-semibold text-xs">
                                                            <Key className="w-3 h-3" />
                                                            Dispensasi
                                                        </Badge>
                                                    )}
                                                    {isCleared && (
                                                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold text-xs">
                                                            <ShieldCheck className="w-3 h-3" />
                                                            Bebas Ujian
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs text-muted-foreground line-clamp-2 max-w-md">
                                                        {student.clearance.notes || (
                                                            <span className="italic text-muted-foreground/60">Tidak ada catatan</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {(() => {
                                                        const isToggling = !!togglingIds[student.id];
                                                        return (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {isLocked ? (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => handleQuickToggle(student, "cleared")}
                                                                            disabled={isToggling}
                                                                            className="h-8 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 gap-1 min-w-[95px]"
                                                                            title="Buka Kunci Langsung"
                                                                        >
                                                                            {isToggling ? (
                                                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                            ) : (
                                                                                <Unlock className="w-3.5 h-3.5" />
                                                                            )}
                                                                            Buka Kunci
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            disabled={isToggling}
                                                                            onClick={() => {
                                                                                setTokenTargetStudent(student);
                                                                                setCustomTokenValue("");
                                                                                setTokenNotes(`Dispensasi untuk ${student.name} (${student.username})`);
                                                                                setCreatedTokenResult(null);
                                                                                setTokenDialogOpen(true);
                                                                            }}
                                                                            className="h-8 text-xs text-blue-600 hover:bg-blue-50 gap-1"
                                                                            title="Buat Token Dispensasi Khusus"
                                                                        >
                                                                            <Key className="w-3.5 h-3.5" />
                                                                            Token
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleQuickToggle(student, "locked")}
                                                                        disabled={isToggling}
                                                                        className="h-8 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 gap-1 min-w-[75px]"
                                                                        title="Kunci Akses Ujian Siswa"
                                                                    >
                                                                        {isToggling ? (
                                                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Lock className="w-3.5 h-3.5" />
                                                                        )}
                                                                        Kunci
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    disabled={isToggling}
                                                                    onClick={() => {
                                                                        setStudentToEdit(student);
                                                                        setTargetStatus(student.clearance.status);
                                                                        setTargetNotes(student.clearance.notes || "");
                                                                        setStatusDialogOpen(true);
                                                                    }}
                                                                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                                                >
                                                                    Detail
                                                                </Button>
                                                            </div>
                                                        );
                                                    })()}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            {/* TAB 2: TOKENS MANAGEMENT */}
            {activeTab === "tokens" && (
                <div className="space-y-4">
                    <Card className="border border-border/70 shadow-xs overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-[140px]">Kode Token</TableHead>
                                    <TableHead className="w-[200px]">Peruntukan Siswa</TableHead>
                                    <TableHead className="w-[140px]">Status Token</TableHead>
                                    <TableHead className="w-[160px]">Berlaku Sampai</TableHead>
                                    <TableHead>Keterangan</TableHead>
                                    <TableHead className="text-right w-[120px]">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingTokens ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            Memuat daftar token...
                                        </TableCell>
                                    </TableRow>
                                ) : tokens.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            Belum ada token dispensasi yang dibuat.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tokens.map((tokenItem) => {
                                        const isExpired = new Date(tokenItem.expiresAt) < new Date();
                                        const isCopied = copiedTokenId === tokenItem.id;

                                        return (
                                            <TableRow key={tokenItem.id} className="hover:bg-muted/30">
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-base tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                                                            {tokenItem.token}
                                                        </span>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                            onClick={() => handleCopyToken(tokenItem.token, tokenItem.id)}
                                                            title="Salin Kode Token"
                                                        >
                                                            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                                        </Button>
                                                    </div>
                                                    <div className="mt-1">
                                                        {tokenItem.scope === "session" && (
                                                            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                                                                Per Sesi / Jam
                                                            </Badge>
                                                        )}
                                                        {tokenItem.scope === "weekly" && (
                                                            <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30">
                                                                1 Pekan (7 Hari)
                                                            </Badge>
                                                        )}
                                                        {tokenItem.scope === "permanent" && (
                                                            <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                                                                Permanen
                                                            </Badge>
                                                        )}
                                                        {(!tokenItem.scope || tokenItem.scope === "daily") && (
                                                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
                                                                Harian (1 Hari)
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {tokenItem.studentName ? (
                                                        <div>
                                                            <div className="font-medium text-foreground text-xs">{tokenItem.studentName}</div>
                                                            <div className="text-[11px] font-mono text-muted-foreground">NIS: {tokenItem.studentUsername}</div>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline" className="text-xs">
                                                            Universal / Bebas
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {tokenItem.isUsed ? (
                                                        <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                                                            Sudah Digunakan
                                                        </Badge>
                                                    ) : isExpired ? (
                                                        <Badge variant="destructive" className="text-xs">
                                                            Kadaluarsa
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-600 text-white font-semibold text-xs">
                                                            Aktif
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(tokenItem.expiresAt), "dd MMM yyyy, HH:mm", { locale: idLocale })}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground max-w-sm">
                                                    {tokenItem.notes || "-"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setTokenToPrint({
                                                                    token: tokenItem.token,
                                                                    scope: tokenItem.scope,
                                                                    studentName: tokenItem.studentName,
                                                                    studentUsername: tokenItem.studentUsername,
                                                                    expiresAt: tokenItem.expiresAt,
                                                                    notes: tokenItem.notes,
                                                                });
                                                                setPrintModalOpen(true);
                                                            }}
                                                            className="h-8 text-primary hover:bg-primary/10 text-xs gap-1"
                                                            title="Cetak Slip Dispensasi"
                                                        >
                                                            <Printer className="h-3.5 w-3.5" />
                                                            Cetak
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleRevokeToken(tokenItem.id)}
                                                            className="h-8 text-destructive hover:bg-destructive/10 text-xs gap-1"
                                                            title="Cabut Token"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Cabut
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            {/* DIALOG: Edit Student Clearance Status & Notes */}
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ubah Status Administrasi Siswa</DialogTitle>
                        <DialogDescription>
                            Atur izin ujian untuk <strong>{studentToEdit?.name}</strong> (NIS: {studentToEdit?.username}).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="clearance-status">Status Izin Ujian</Label>
                            <Select
                                value={targetStatus}
                                onValueChange={(val: any) => setTargetStatus(val)}
                            >
                                <SelectTrigger id="clearance-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cleared">Bebas Administrasi (Bisa Langsung Ujian)</SelectItem>
                                    <SelectItem value="locked">Terkunci (Harus Masukkan Token / Lapor TU)</SelectItem>
                                    <SelectItem value="dispensation">Dispensasi Aktif (Diizinkan Sementara)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {targetStatus === "dispensation" && (
                            <div className="space-y-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                <Label htmlFor="dispensation-duration">Masa Berlaku Dispensasi</Label>
                                <Select
                                    value={dispensationDuration}
                                    onValueChange={(val: any) => setDispensationDuration(val)}
                                >
                                    <SelectTrigger id="dispensation-duration" className="bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="session">Per Sesi (1 Sesi Ujian / 4 Jam)</SelectItem>
                                        <SelectItem value="daily">Harian (Berlaku Hari Ini s.d. 23:59)</SelectItem>
                                        <SelectItem value="weekly">Mingguan (1 Pekan / 7 Hari)</SelectItem>
                                        <SelectItem value="permanent">Selamanya (Sampai Diubah Petugas)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                                    {dispensationDuration === "session" && "Siswa hanya bisa membuka 1 sesi. Setelah itu status kembali terkunci."}
                                    {dispensationDuration === "daily" && "Besok pagi sistem otomatis mengunci siswa kembali."}
                                    {dispensationDuration === "weekly" && "Dispensasi aktif selama 7 hari kalender."}
                                    {dispensationDuration === "permanent" && "Aktif terus sampai diubah lagi oleh petugas TU."}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="clearance-notes">Catatan Petugas TU</Label>
                            <Textarea
                                id="clearance-notes"
                                placeholder="Contoh: Menunggak administrasi SPP bulan Oktober & November. Janji lunas tanggal 25."
                                value={targetNotes}
                                onChange={(e) => setTargetNotes(e.target.value)}
                                rows={3}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Catatan ini akan ditampilkan secara santun di layar siswa saat mereka mencoba masuk ujian.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setStatusDialogOpen(false)}
                            disabled={updatingStatus}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleSaveStatusDialog}
                            disabled={updatingStatus}
                        >
                            {updatingStatus ? "Menyimpan..." : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DIALOG: Generate New Token */}
            <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                <Key className="h-5 w-5" />
                            </div>
                            <DialogTitle>Buat Token Dispensasi</DialogTitle>
                        </div>
                        <DialogDescription>
                            {tokenTargetStudent
                                ? `Token dispensasi khusus untuk siswa ${tokenTargetStudent.name}.`
                                : "Buat token dispensasi yang dapat diberikan kepada siswa di ruang TU."}
                        </DialogDescription>
                    </DialogHeader>

                    {createdTokenResult ? (
                        <div className="py-6 text-center space-y-4">
                            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block mb-1">
                                    Token Dispensasi Berhasil Dibuat
                                </span>
                                <span className="text-3xl font-mono font-bold tracking-widest text-primary">
                                    {createdTokenResult}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Berikan kode token ini kepada siswa. Siswa dapat memasukkan kode ini pada dialog ujian mereka.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    className="flex-1 gap-2"
                                    onClick={() => {
                                        navigator.clipboard.writeText(createdTokenResult);
                                        toast({ title: "Tersalin!", description: "Kode token berhasil disalin" });
                                        setTokenDialogOpen(false);
                                    }}
                                >
                                    <Copy className="h-4 w-4" />
                                    Salin Token
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    onClick={() => {
                                        setTokenToPrint({
                                            token: createdTokenResult,
                                            scope: tokenScope,
                                            studentName: tokenTargetStudent?.name || "Siswa Terdaftar",
                                            studentUsername: tokenTargetStudent?.username || "-",
                                            className: tokenTargetStudent?.class?.name || null,
                                            expiresAt: new Date(new Date().setHours(23, 59, 59, 999)),
                                            notes: tokenNotes || "Dispensasi Ujian",
                                        });
                                        setTokenDialogOpen(false);
                                        setPrintModalOpen(true);
                                    }}
                                >
                                    <Printer className="h-4 w-4" />
                                    Cetak Slip
                                </Button>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => setTokenDialogOpen(false)}
                            >
                                Selesai / Tutup
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 py-2">
                            {tokenTargetStudent && (
                                <div className="p-3 bg-muted/60 rounded-xl text-xs space-y-1">
                                    <div className="text-muted-foreground uppercase font-semibold text-[10px]">Penerima Token:</div>
                                    <div className="font-bold text-foreground text-sm">{tokenTargetStudent.name}</div>
                                    <div className="font-mono text-muted-foreground">NIS: {tokenTargetStudent.username} - Kelas: {tokenTargetStudent.class?.name || "-"}</div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="token-scope">Masa Berlaku Dispensasi</Label>
                                <Select value={tokenScope} onValueChange={(val: any) => setTokenScope(val)}>
                                    <SelectTrigger id="token-scope">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="session">Per Sesi / Jam (Hanya 1 Sesi Ujian Saat Ini)</SelectItem>
                                        <SelectItem value="daily">Harian (Hanya Berlaku Hari Ini s.d. 23:59)</SelectItem>
                                        <SelectItem value="weekly">Mingguan (1 Pekan / 7 Hari ke Depan)</SelectItem>
                                        <SelectItem value="permanent">Selamanya (Sampai Diubah Petugas)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground">
                                    {tokenScope === "session" && "Siswa hanya bisa membuka 1 sesi ujian saat ini. Sesi berikutnya akan terkunci lagi."}
                                    {tokenScope === "daily" && "Siswa bebas mengikuti semua ujian hari ini. Besok pagi akan otomatis terkunci kembali."}
                                    {tokenScope === "weekly" && "Dispensasi aktif selama 7 hari untuk seluruh rangkaian ujian pekan ini."}
                                    {tokenScope === "permanent" && "Dispensasi aktif terus menerus sampai pihak TU mengubah statusnya secara manual."}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="custom-token">Kode Token (Opsional)</Label>
                                <Input
                                    id="custom-token"
                                    placeholder="Biarkan kosong untuk generate acak (contoh: ADM89X)"
                                    value={customTokenValue}
                                    onChange={(e) => setCustomTokenValue(e.target.value.toUpperCase())}
                                    className="uppercase font-mono"
                                    maxLength={10}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Jika dikosongkan, sistem akan membuat 6 karakter acak otomatis.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="token-notes">Keterangan / Alasan Dispensasi</Label>
                                <Input
                                    id="token-notes"
                                    placeholder="Contoh: Dispensasi lapor TU tanggal 18 Nov"
                                    value={tokenNotes}
                                    onChange={(e) => setTokenNotes(e.target.value)}
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setTokenDialogOpen(false)}
                                    disabled={generatingToken}
                                >
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleGenerateToken}
                                    disabled={generatingToken}
                                    className="gap-2"
                                >
                                    {generatingToken ? "Membuat Token..." : "Generate Token"}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* DIALOG: Import Excel Clearance */}
            <ImportClearanceDialog
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
                onSuccess={() => {
                    fetchStudents();
                    toast({
                        title: "Data Diperbarui",
                        description: "Status administrasi siswa berhasil diperbarui dari file Excel.",
                    });
                }}
            />

            {/* MODAL: Print Dispensasi Slip */}
            <PrintDispensasiModal
                open={printModalOpen}
                onOpenChange={setPrintModalOpen}
                tokenData={tokenToPrint}
            />
        </div>
    );
}
