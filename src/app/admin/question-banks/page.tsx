"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Database, ArrowRight, Trash2, Search, Copy, User, Loader2, Globe, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SavedFiltersManager } from "@/components/filters/SavedFiltersManager";
import { AdvancedFilterPanel, FilterSection } from "@/components/filters/AdvancedFilterPanel";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

interface Subject {
    id: string;
    name: string;
    code: string;
}

interface QuestionBank {
    id: string;
    name: string;
    description: string | null;
    subjectId: string;
    subjectName: string;
    createdBy: string | null;
    creatorName: string | null;
    createdAt: Date;
    updatedAt: Date;
    canEdit?: boolean;
    isOwner?: boolean;
}

export default function QuestionBanksPage() {
    const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Filter State
    const [scopeTab, setScopeTab] = useState<"mine" | "all">("mine");
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Derived state for active filters count
    const activeFiltersCount = [
        selectedSubject !== "all",
        searchQuery !== "",
        dateRange?.from !== undefined
    ].filter(Boolean).length;

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [bankToDelete, setBankToDelete] = useState<string | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        subjectId: "",
    });

    const fetchSubjects = useCallback(async () => {
        try {
            const response = await fetch("/api/subjects");
            if (response.ok) {
                const result = await response.json();
                setSubjects(result.data || []);
            }
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    }, []);

    const fetchQuestionBanks = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append("scope", scopeTab);
            if (selectedSubject !== "all") params.append("subjectId", selectedSubject);
            if (searchQuery) params.append("search", searchQuery);
            if (dateRange?.from) params.append("startDate", dateRange.from.toISOString());
            if (dateRange?.to) params.append("endDate", dateRange.to.toISOString());

            const response = await fetch(`/api/question-banks?${params.toString()}`);
            if (response.ok) {
                const result = await response.json();
                setQuestionBanks(result.data || []);
            }
        } catch (error) {
            console.error("Error fetching question banks:", error);
            toast({
                title: "Error",
                description: "Failed to fetch question banks",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [scopeTab, selectedSubject, searchQuery, dateRange, toast]);

    const handleDuplicate = async (bankId: string) => {
        try {
            setDuplicatingId(bankId);
            const response = await fetch(`/api/question-banks/${bankId}/duplicate`, {
                method: "POST",
            });
            if (response.ok) {
                toast({
                    title: "Berhasil Duplikasi",
                    description: "Bank soal telah disalin ke daftar Bank Soal Saya",
                });
                setScopeTab("mine");
                fetchQuestionBanks();
            } else {
                const err = await response.json();
                toast({
                    title: "Gagal Duplikasi",
                    description: err.error || "Gagal menyalin bank soal",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Terjadi kesalahan saat menyalin bank soal",
                variant: "destructive",
            });
        } finally {
            setDuplicatingId(null);
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);

    useEffect(() => {
        fetchQuestionBanks();
    }, [fetchQuestionBanks]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch("/api/question-banks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Question bank created successfully",
                });
                setDialogOpen(false);
                resetForm();
                fetchQuestionBanks();
            } else {
                const error = await response.json();
                toast({
                    title: "Error",
                    description: error.error || "Failed to create question bank",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error creating question bank:", error);
            toast({
                title: "Error",
                description: "Failed to create question bank",
                variant: "destructive",
            });
        }
    };

    const handleDeleteClick = (id: string) => {
        setBankToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!bankToDelete) return;

        try {
            const response = await fetch(`/api/question-banks/${bankToDelete}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Bank soal berhasil dihapus",
                });
                fetchQuestionBanks();
            } else {
                toast({
                    title: "Error",
                    description: "Gagal menghapus bank soal",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error deleting question bank:", error);
            toast({
                title: "Error",
                description: "Gagal menghapus bank soal",
                variant: "destructive",
            });
        } finally {
            setDeleteDialogOpen(false);
            setBankToDelete(null);
        }
    };

    const resetForm = () => {
        setFormData({ name: "", description: "", subjectId: "" });
    };

    const handleApplySavedFilters = (filters: Record<string, any>) => {
        if (filters.subjectId) setSelectedSubject(filters.subjectId);
        if (filters.search) setSearchQuery(filters.search);
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
        setSelectedSubject("all");
        setSearchQuery("");
        setDateRange(undefined);
    };

    const getCurrentFilters = () => ({
        subjectId: selectedSubject,
        search: searchQuery,
        dateFrom: dateRange?.from?.toISOString(),
        dateTo: dateRange?.to?.toISOString()
    });

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Bank Soal</h1>
                    <p className="text-muted-foreground mt-2">
                        Kelola bank soal dengan sistem tagging dan tingkat kesulitan
                    </p>
                </div>
                <Button
                    onClick={() => {
                        resetForm();
                        setDialogOpen(true);
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Buat Bank Soal
                </Button>
            </div>

            {/* Scope Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b pb-3">
                <Button
                    variant={scopeTab === "mine" ? "default" : "ghost"}
                    size="sm"
                    className="font-medium rounded-full px-4"
                    onClick={() => setScopeTab("mine")}
                >
                    <User className="mr-2 h-4 w-4" />
                    Bank Soal Saya
                </Button>
                <Button
                    variant={scopeTab === "all" ? "default" : "ghost"}
                    size="sm"
                    className="font-medium rounded-full px-4"
                    onClick={() => setScopeTab("all")}
                >
                    <Globe className="mr-2 h-4 w-4" />
                    Semua Bank Soal (Sekolah)
                </Button>
            </div>

            {/* Filters */}
            <div className="mb-6 space-y-4 bg-muted/30 p-4 rounded-lg border">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari bank soal..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1"
                        />
                    </div>

                    <AdvancedFilterPanel
                        activeFiltersCount={activeFiltersCount}
                        onReset={handleResetFilters}
                        onApply={() => { }}
                    >
                        <FilterSection title="Rentang Waktu">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                        </FilterSection>

                        <FilterSection title="Mata Pelajaran">
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih mata pelajaran" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Mata Pelajaran</SelectItem>
                                    {subjects.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id}>
                                            {subject.name} ({subject.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FilterSection>
                    </AdvancedFilterPanel>

                    <SavedFiltersManager
                        page="question-banks"
                        currentFilters={getCurrentFilters()}
                        onApply={handleApplySavedFilters}
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="border-none shadow-md">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full mb-4" />
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-3 w-1/4" />
                                    <Skeleton className="h-8 w-24" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : questionBanks.length === 0 ? (
                <EmptyState
                    icon={Database}
                    title={scopeTab === "mine" ? "Belum ada bank soal milik Anda" : "Belum ada bank soal sekolah"}
                    description={
                        scopeTab === "mine"
                            ? "Mulai dengan membuat bank soal baru untuk ulangan harian Anda, atau salin dari bank soal sekolah."
                            : "Belum ada bank soal yang tersedia di sekolah."
                    }
                    action={{
                        label: "Buat Bank Soal",
                        onClick: () => {
                            resetForm();
                            setDialogOpen(true);
                        }
                    }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {questionBanks.map((bank) => (
                        <Card key={bank.id} className="hover:shadow-lg transition-shadow flex flex-col justify-between">
                            <CardHeader>
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg line-clamp-1 mb-1.5" title={bank.name}>{bank.name}</CardTitle>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <Badge variant="secondary" className="text-xs font-normal">
                                                {bank.subjectName}
                                            </Badge>
                                            {bank.isOwner ? (
                                                <Badge variant="outline" className="text-[10px] text-green-700 bg-green-50 border-green-200">
                                                    Milik Saya
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 border-blue-200">
                                                    {bank.creatorName || "Guru"}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    {bank.canEdit && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive shrink-0"
                                            onClick={() => handleDeleteClick(bank.id)}
                                            title="Hapus Bank Soal"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {bank.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {bank.description}
                                    </p>
                                )}
                                
                                <div className="pt-2 border-t flex items-center justify-between gap-2">
                                    {bank.canEdit ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={duplicatingId === bank.id}
                                                onClick={() => handleDuplicate(bank.id)}
                                                title="Duplikat Bank Soal"
                                            >
                                                {duplicatingId === bank.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                            <Link href={`/admin/question-banks/${bank.id}`} className="flex-1">
                                                <Button variant="default" size="sm" className="w-full">
                                                    Kelola Soal
                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-xs"
                                                disabled={duplicatingId === bank.id}
                                                onClick={() => handleDuplicate(bank.id)}
                                            >
                                                {duplicatingId === bank.id ? (
                                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                                                )}
                                                Duplikat ke Soal Saya
                                            </Button>
                                            <Link href={`/admin/question-banks/${bank.id}`}>
                                                <Button variant="ghost" size="sm" className="text-xs">
                                                    Lihat Soal
                                                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                                </Button>
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Buat Bank Soal Baru</DialogTitle>
                        <DialogDescription>
                            Buat bank soal untuk menyimpan koleksi soal per mata pelajaran
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name">Nama Bank Soal</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    required
                                    placeholder="e.g., Bank Soal UTS Semester 1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="subject">Mata Pelajaran</Label>
                                <Select
                                    value={formData.subjectId}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, subjectId: value })
                                    }
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih mata pelajaran" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((subject) => (
                                            <SelectItem key={subject.id} value={subject.id}>
                                                {subject.name} ({subject.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="description">Deskripsi (Optional)</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    placeholder="Deskripsi bank soal..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    resetForm();
                                    setDialogOpen(false);
                                }}
                            >
                                Batal
                            </Button>
                            <Button type="submit">Buat Bank Soal</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Bank Soal?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus bank soal ini?
                            <strong className="text-destructive"> Semua soal di dalam bank ini akan ikut terhapus.</strong> Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
