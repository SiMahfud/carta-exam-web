"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Edit, Calendar, User, FileText, LayoutGrid, Table2, Send, Search, Download } from "lucide-react";
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
import { GradingStatsCard } from "@/components/grading/GradingStatsCard";
import { GradingTableView } from "@/components/grading/GradingTableView";
import { SavedFiltersManager } from "@/components/filters/SavedFiltersManager";
import { AdvancedFilterPanel, FilterSection } from "@/components/filters/AdvancedFilterPanel";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface Class {
    id: string;
    name: string;
}

export default function GradingPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState("pending_manual");
    const [searchQuery, setSearchQuery] = useState("");
    const [classFilter, setClassFilter] = useState("all");
    const [sortBy, setSortBy] = useState("date");
    const [sortOrder, setSortOrder] = useState("desc");
    const [viewMode, setViewMode] = useState<"card" | "table">("card");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBatchPublishDialog, setShowBatchPublishDialog] = useState(false);
    const [batchPublishing, setBatchPublishing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Derived state for active filters count
    const activeFiltersCount = [
        statusFilter !== "all",
        classFilter !== "all",
        searchQuery !== "",
        dateRange?.from !== undefined
    ].filter(Boolean).length;

    // Get unique session IDs from submissions
    const getSessionIds = () => {
        const sessionIds = new Set(submissions.map(s => s.sessionId));
        return Array.from(sessionIds);
    };

    const handleExport = async () => {
        const sessionIds = getSessionIds();
        if (sessionIds.length === 0) {
            toast({
                title: "Tidak ada data",
                description: "Tidak ada submission untuk diekspor",
                variant: "destructive",
            });
            return;
        }

        setExporting(true);
        try {
            // Export the first session if multiple exist
            const sessionId = sessionIds[0];
            const response = await fetch(`/api/exam-sessions/${sessionId}/export`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `hasil-ujian-${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                toast({
                    title: "Berhasil",
                    description: "File Excel berhasil diunduh",
                    variant: "success",
                });
            } else {
                throw new Error("Export failed");
            }
        } catch {
            toast({
                title: "Error",
                description: "Gagal mengekspor data",
                variant: "destructive",
            });
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        // Load view preference from localStorage
        const savedView = localStorage.getItem("gradingViewMode");
        if (savedView === "table" || savedView === "card") {
            setViewMode(savedView);
        }
    }, []);

    useEffect(() => {
        fetchSubmissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, statusFilter, searchQuery, classFilter, sortBy, sortOrder, dateRange]);

    useEffect(() => {
        fetchClasses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchClasses = async () => {
        try {
            const response = await fetch("/api/classes");
            if (response.ok) {
                const result = await response.json();
                setClasses(result.data || []);
            }
        } catch (error) {
            console.error("Error fetching classes:", error);
        }
    };

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "10",
                status: statusFilter,
                orderBy: sortBy,
                order: sortOrder,
            });

            if (searchQuery) {
                params.append("search", searchQuery);
            }

            if (classFilter && classFilter !== "all") {
                params.append("classId", classFilter);
            }

            if (dateRange?.from) {
                params.append("startDate", dateRange.from.toISOString());
            }
            if (dateRange?.to) {
                params.append("endDate", dateRange.to.toISOString());
            }

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

    const handleViewModeChange = (mode: "card" | "table") => {
        setViewMode(mode);
        localStorage.setItem("gradingViewMode", mode);
    };

    const handleSelectChange = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            // Only select completed submissions
            const completedIds = submissions
                .filter(s => s.gradingStatus === "completed")
                .map(s => s.id);
            setSelectedIds(new Set(completedIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBatchPublish = async () => {
        setBatchPublishing(true);
        try {
            const response = await fetch("/api/grading/batch-publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ submissionIds: Array.from(selectedIds) }),
            });

            if (response.ok) {
                const data = await response.json();
                toast({
                    title: "Berhasil",
                    description: `${data.success} submission berhasil dipublikasi${data.failed > 0 ? `, ${data.failed} gagal` : ""}`,
                });
                setSelectedIds(new Set());
                fetchSubmissions();
            } else {
                throw new Error("Failed to batch publish");
            }
        } catch {
            toast({
                title: "Error",
                description: "Gagal mempublikasi submission",
                variant: "destructive",
            });
        } finally {
            setBatchPublishing(false);
            setShowBatchPublishDialog(false);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleApplySavedFilters = (filters: Record<string, any>) => {
        if (filters.status) setStatusFilter(filters.status);
        if (filters.classId) setClassFilter(filters.classId);
        if (filters.search) setSearchQuery(filters.search);
        if (filters.sortBy) setSortBy(filters.sortBy);
        if (filters.sortOrder) setSortOrder(filters.sortOrder);
        // Handle date range if stored (needs parsing back to Date objects)
        if (filters.dateFrom) {
            setDateRange({
                from: new Date(filters.dateFrom),
                to: filters.dateTo ? new Date(filters.dateTo) : undefined
            });
        } else {
            setDateRange(undefined);
        }
    };

    const handleResetFilters = () => {
        setStatusFilter("all");
        setClassFilter("all");
        setSearchQuery("");
        setDateRange(undefined);
        setPage(1);
    };

    const getCurrentFilters = () => ({
        status: statusFilter,
        classId: classFilter,
        search: searchQuery,
        sortBy,
        sortOrder,
        dateFrom: dateRange?.from?.toISOString(),
        dateTo: dateRange?.to?.toISOString()
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Penilaian Ujian</h2>
                    <p className="text-muted-foreground">
                        Tinjau dan nilai hasil ujian siswa
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={exporting || submissions.length === 0}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        {exporting ? "Mengekspor..." : "Export Excel"}
                    </Button>
                    <Button
                        variant={viewMode === "card" ? "default" : "outline"}
                        size="icon"
                        onClick={() => handleViewModeChange("card")}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === "table" ? "default" : "outline"}
                        size="icon"
                        onClick={() => handleViewModeChange("table")}
                    >
                        <Table2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Statistics Dashboard */}
            <GradingStatsCard />

            {/* Filters */}
            <div className="space-y-4 bg-muted/30 p-4 rounded-lg border">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama siswa..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <AdvancedFilterPanel
                            activeFiltersCount={activeFiltersCount}
                            onReset={handleResetFilters}
                            onApply={() => setPage(1)}
                        >
                            <FilterSection title="Rentang Waktu">
                                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                            </FilterSection>

                            <FilterSection title="Kelas">
                                <Select value={classFilter} onValueChange={setClassFilter}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Pilih Kelas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Kelas</SelectItem>
                                        {classes.map((cls) => (
                                            <SelectItem key={cls.id} value={cls.id}>
                                                {cls.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FilterSection>

                            <FilterSection title="Status Penilaian">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Filter Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua</SelectItem>
                                        <SelectItem value="pending_manual">Perlu Dinilai</SelectItem>
                                        <SelectItem value="completed">Selesai</SelectItem>
                                        <SelectItem value="published">Dipublikasi</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FilterSection>
                        </AdvancedFilterPanel>

                        <SavedFiltersManager
                            page="grading"
                            currentFilters={getCurrentFilters()}
                            onApply={handleApplySavedFilters}
                        />
                    </div>

                    <div className="flex items-center gap-2 border-l pl-4 ml-auto">
                        <span className="text-sm font-medium">Urutkan:</span>
                        <Select value={`${sortBy}-${sortOrder}`} onValueChange={(val) => {
                            const [newSortBy, newSortOrder] = val.split("-");
                            setSortBy(newSortBy);
                            setSortOrder(newSortOrder);
                            setPage(1);
                        }}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Urutkan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="date-desc">Terbaru</SelectItem>
                                <SelectItem value="date-asc">Terlama</SelectItem>
                                <SelectItem value="studentName-asc">Nama A-Z</SelectItem>
                                <SelectItem value="studentName-desc">Nama Z-A</SelectItem>
                                <SelectItem value="sessionName-asc">Sesi A-Z</SelectItem>
                                <SelectItem value="sessionName-desc">Sesi Z-A</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                        <span className="text-sm font-medium">
                            {selectedIds.size} item dipilih
                        </span>
                        <Button onClick={() => setShowBatchPublishDialog(true)}>
                            <Send className="mr-2 h-4 w-4" />
                            Publikasi Massal
                        </Button>
                    </div>
                )}
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
            ) : viewMode === "table" ? (
                <GradingTableView
                    submissions={submissions}
                    selectedIds={selectedIds}
                    onSelectChange={handleSelectChange}
                    onSelectAll={handleSelectAll}
                    onGrade={handleGrade}
                />
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

            {viewMode === "table" && submissions.length > 0 && (
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            )}

            {/* Batch Publish Dialog */}
            <AlertDialog open={showBatchPublishDialog} onOpenChange={setShowBatchPublishDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Publikasi Massal</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin mempublikasi {selectedIds.size} submission sekaligus?
                            Siswa akan dapat melihat nilai mereka setelah dipublikasi.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBatchPublish} disabled={batchPublishing}>
                            {batchPublishing ? "Mempublikasi..." : "Publikasi"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
