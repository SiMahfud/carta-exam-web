"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, Users, Monitor, MoreVertical, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/ui/pagination";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { SavedFiltersManager } from "@/components/filters/SavedFiltersManager";
import { AdvancedFilterPanel, FilterSection } from "@/components/filters/AdvancedFilterPanel";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

interface ExamSession {
    id: string;
    sessionName: string;
    status: "scheduled" | "active" | "completed" | "cancelled";
    startTime: string;
    endTime: string;
    targetType: "class" | "individual";
    targetIds: string[];
    templateName: string;
    durationMinutes: number;
    createdAt: string;
}

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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function ExamSessionsPage() {
    const [sessions, setSessions] = useState<ExamSession[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Pagination & Filtering
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Derived state for active filters count
    const activeFiltersCount = [
        statusFilter !== "all",
        dateRange?.from !== undefined
    ].filter(Boolean).length;

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        fetchSessions();
    }, [page, statusFilter, dateRange]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "10",
                status: statusFilter
            });

            if (dateRange?.from) {
                params.append("startDate", dateRange.from.toISOString());
            }
            if (dateRange?.to) {
                params.append("endDate", dateRange.to.toISOString());
            }

            const response = await fetch(`/api/exam-sessions?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setSessions(data.data);
                setTotalPages(data.metadata.totalPages);
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
            toast({
                title: "Error",
                description: "Gagal memuat sesi ujian",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        try {
            const response = await fetch(`/api/exam-sessions/${deleteId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Sesi ujian berhasil dihapus",
                });
                fetchSessions();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || "Gagal menghapus sesi");
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Gagal menghapus sesi ujian",
                variant: "destructive",
            });
        } finally {
            setDeleteId(null);
            setIsDeleteDialogOpen(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setIsDeleteDialogOpen(true);
    };

    const handleApplySavedFilters = (filters: Record<string, any>) => {
        if (filters.status) setStatusFilter(filters.status);
        // Handle date range if stored
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
        setDateRange(undefined);
        setPage(1);
    };

    const getCurrentFilters = () => ({
        status: statusFilter,
        dateFrom: dateRange?.from?.toISOString(),
        dateTo: dateRange?.to?.toISOString()
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <Badge className="bg-green-500">Sedang Berlangsung</Badge>;
            case "scheduled":
                return <Badge variant="outline" className="text-blue-600 border-blue-600">Terjadwal</Badge>;
            case "completed":
                return <Badge variant="secondary">Selesai</Badge>;
            case "cancelled":
                return <Badge variant="destructive">Dibatalkan</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDateTime = (dateString: string) => {
        return format(new Date(dateString), "d MMM yyyy, HH:mm", { locale: idLocale });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Sesi Ujian</h2>
                    <p className="text-muted-foreground">
                        Jadwalkan dan pantau pelaksanaan ujian
                    </p>
                </div>
                <Link href="/admin/exam-sessions/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Buat Sesi Baru
                    </Button>
                </Link>
            </div>

            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border">
                <AdvancedFilterPanel
                    activeFiltersCount={activeFiltersCount}
                    onReset={handleResetFilters}
                    onApply={() => setPage(1)}
                >
                    <FilterSection title="Rentang Waktu">
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </FilterSection>

                    <FilterSection title="Status">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Filter Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="scheduled">Terjadwal</SelectItem>
                                <SelectItem value="active">Sedang Berlangsung</SelectItem>
                                <SelectItem value="completed">Selesai</SelectItem>
                            </SelectContent>
                        </Select>
                    </FilterSection>
                </AdvancedFilterPanel>

                <SavedFiltersManager
                    page="exam-sessions"
                    currentFilters={getCurrentFilters()}
                    onApply={handleApplySavedFilters}
                />
            </div>

            {loading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-6 w-48" />
                                            <Skeleton className="h-5 w-24 rounded-full" />
                                        </div>
                                        <Skeleton className="h-4 w-64" />
                                        <div className="flex gap-4 mt-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-9 w-24" />
                                        <Skeleton className="h-9 w-9" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : sessions.length === 0 ? (
                <EmptyState
                    icon={Calendar}
                    title="Belum ada sesi ujian"
                    description="Jadwal ujian akan muncul di sini. Buat sesi baru untuk memulai."
                    action={{
                        label: "Buat Sesi Baru",
                        onClick: () => window.location.href = "/admin/exam-sessions/create"
                    }}
                />
            ) : (
                <div className="space-y-4">
                    {sessions.map((session) => (
                        <Card key={session.id}>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-lg">{session.sessionName}</h3>
                                            {getStatusBadge(session.status)}
                                        </div>
                                        <p className="text-sm text-muted-foreground">Template: {session.templateName}</p>

                                        <div className="flex flex-wrap gap-4 mt-2 text-sm">
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                {formatDateTime(session.startTime)} - {format(new Date(session.endTime), "HH:mm")}
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                {session.durationMinutes} menit
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Users className="h-4 w-4" />
                                                {session.targetType === 'class' ? `${session.targetIds.length} Kelas` : `${session.targetIds.length} Siswa`}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start md:self-center">
                                        <Link href={`/admin/exam-sessions/${session.id}`}>
                                            <Button variant="outline" size="sm">
                                                <Monitor className="mr-2 h-4 w-4" />
                                                Monitor
                                            </Button>
                                        </Link>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <Link href={`/admin/exam-sessions/${session.id}/edit`}>
                                                    <DropdownMenuItem>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                </Link>
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(session.id);
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Sesi ujian akan dihapus secara permanen beserta data terkait.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
