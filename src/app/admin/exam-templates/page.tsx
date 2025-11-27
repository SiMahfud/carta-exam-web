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
import { Plus, Pencil, Trash2, Clock, FileText, Search, Eye } from "lucide-react";
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

export default function ExamTemplatesPage() {
    const [templates, setTemplates] = useState<ExamTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    // Delete Confirmation State
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<ExamTemplate | null>(null);

    // Preview State
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const response = await fetch("/api/exam-templates");
            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
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

    const filteredTemplates = templates.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari template..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10">Memuat data...</div>
            ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-10 border rounded-lg bg-muted/20">
                    <p className="text-muted-foreground">Belum ada template ujian</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTemplates.map((template) => (
                        <Card key={template.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl mb-1">{template.name}</CardTitle>
                                        <Badge variant="secondary">{template.subjectName}</Badge>
                                    </div>
                                </div>
                                <CardDescription className="line-clamp-2 mt-2">
                                    {template.description || "Tidak ada deskripsi"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
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
                                <div className="flex justify-end gap-2">
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
                            Anda akan menghapus template "{templateToDelete?.name}". Tindakan ini tidak dapat dibatalkan.
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
