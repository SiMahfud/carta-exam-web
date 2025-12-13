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
import { Plus, Pencil, Trash2, Clock, FileText, Search, Eye, Filter, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import ExamPreviewDialog from "@/components/exam-templates/ExamPreviewDialog";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";

interface ExamTemplate {
    id: string;
    name: string;
    description: string;
    subjectName: string;
    durationMinutes: number;
    totalScore: number;
    createdAt: string;
    creatorName: string;
}

interface Subject {
    id: string;
    name: string;
}

export default function ExamTemplatesPage() {
    const [templates, setTemplates] = useState<ExamTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    // Pagination & Filtering State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [subjectFilter, setSubjectFilter] = useState("all");
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [sort, setSort] = useState("createdAt");
    const [order, setOrder] = useState("desc");

    // Delete Confirmation State
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<ExamTemplate | null>(null);

    // Preview State
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTemplates();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, page, subjectFilter, sort, order]);

    const fetchSubjects = async () => {
        try {
            const response = await fetch("/api/subjects");
            if (response.ok) {
                const result = await response.json();
                setSubjects(result.data || []);
            }
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "9", // 3x3 grid
                search: searchQuery,
                subjectId: subjectFilter,
                sort: sort,
                order: order
            });

            const response = await fetch(`/api/exam-templates?${params.toString()}`, { cache: "no-store" });
            if (response.ok) {
                const data = await response.json();
                setTemplates(data.data);
                setTotalPages(data.metadata.totalPages);
            }
        } catch (error) {
            console.error("Error fetching templates:", error);
            toast({
                title: "Error",
                description: "Gagal memuat template ujian",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!templateToDelete) return;

        try {
            const response = await fetch(`/api/exam-templates/${templateToDelete.id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Template berhasil dihapus",
                });
                fetchTemplates();
            } else {
                throw new Error("Failed to delete template");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal menghapus template",
                variant: "destructive",
            });
        } finally {
            setDeleteAlertOpen(false);
            setTemplateToDelete(null);
        }
    };

    const handleSortChange = (value: string) => {
        if (value === sort) {
            setOrder(order === "asc" ? "desc" : "asc");
        } else {
            setSort(value);
            setOrder("asc"); // Default to asc for new sort field
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Template Ujian</h2>
                    <p className="text-muted-foreground">
                        Kelola konfigurasi ujian yang dapat digunakan kembali
                    </p>
                </div>
                <Link href="/admin/exam-templates/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Buat Template Baru
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-lg border">
                <div className="relative flex-1 w-full md:max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari template..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1); // Reset to first page on search
                        }}
                        className="pl-8"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    <Select value={subjectFilter} onValueChange={(val) => {
                        setSubjectFilter(val);
                        setPage(1);
                    }}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Filter Mapel" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Mapel</SelectItem>
                            {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={sort} onValueChange={handleSortChange}>
                        <SelectTrigger className="w-[180px]">
                            <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Urutkan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="createdAt">Tanggal Dibuat</SelectItem>
                            <SelectItem value="name">Nama Template</SelectItem>
                            <SelectItem value="totalScore">Total Skor</SelectItem>
                            <SelectItem value="durationMinutes">Durasi</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
                        title={order === "asc" ? "Urutan Naik" : "Urutan Turun"}
                    >
                        <ArrowUpDown className={`h-4 w-4 transition-transform ${order === "desc" ? "rotate-180" : ""}`} />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Memuat data...</p>
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-20 border rounded-lg bg-muted/20">
                    <p className="text-muted-foreground">Belum ada template ujian yang sesuai</p>
                    {(searchQuery || subjectFilter !== "all") && (
                        <Button
                            variant="link"
                            onClick={() => {
                                setSearchQuery("");
                                setSubjectFilter("all");
                            }}
                        >
                            Reset Filter
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {templates.map((template) => (
                            <Card key={template.id} className="flex flex-col">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl mb-1 line-clamp-1" title={template.name}>{template.name}</CardTitle>
                                            <Badge variant="secondary">{template.subjectName}</Badge>
                                        </div>
                                    </div>
                                    <CardDescription className="line-clamp-2 mt-2 h-10">
                                        {template.description || "Tidak ada deskripsi"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col justify-end">
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {template.durationMinutes} menit
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <FileText className="h-4 w-4" />
                                            Total Skor: {template.totalScore}
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 border-t pt-4">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setPreviewTemplateId(template.id);
                                                setPreviewOpen(true);
                                            }}
                                            title="Preview Ujian"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Link href={`/admin/exam-templates/${template.id}/edit`}>
                                            <Button variant="ghost" size="icon" title="Edit Template">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setTemplateToDelete(template);
                                                setDeleteAlertOpen(true);
                                            }}
                                            title="Hapus Template"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </>
            )}

            {/* Preview Dialog */}
            {previewTemplateId && (
                <ExamPreviewDialog
                    templateId={previewTemplateId}
                    open={previewOpen}
                    onOpenChange={(open) => {
                        setPreviewOpen(open);
                        if (!open) {
                            setPreviewTemplateId(null);
                        }
                    }}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Anda akan menghapus template &quot;{templateToDelete?.name}&quot;. Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
