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
import { Plus, Database, ArrowRight, Pencil, Trash2 } from "lucide-react";
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
}

export default function QuestionBanksPage() {
    const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string>("all");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [bankToDelete, setBankToDelete] = useState<string | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        subjectId: "",
    });

    useEffect(() => {
        fetchSubjects();
        fetchQuestionBanks();
    }, []);

    useEffect(() => {
        fetchQuestionBanks();
    }, [selectedSubject]);

    const fetchSubjects = async () => {
        try {
            const response = await fetch("/api/subjects");
            if (response.ok) {
                const data = await response.json();
                setSubjects(data);
            }
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    const fetchQuestionBanks = async () => {
        try {
            const url =
                selectedSubject === "all"
                    ? "/api/question-banks"
                    : `/api/question-banks?subjectId=${selectedSubject}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setQuestionBanks(data);
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
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch("/api/question-banks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData), // createdBy is now optional
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

            {/* Filter by Subject */}
            <div className="mb-6">
                <Label>Filter by Mata Pelajaran</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-64">
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
            </div>

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : questionBanks.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                            {selectedSubject === "all"
                                ? "Belum ada bank soal. Buat yang pertama!"
                                : "Tidak ada bank soal untuk mata pelajaran ini."}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {questionBanks.map((bank) => (
                        <Card key={bank.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">{bank.name}</CardTitle>
                                        <CardDescription className="mt-1">
                                            {bank.subjectName}
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteClick(bank.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {bank.description && (
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {bank.description}
                                    </p>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">
                                        By: {bank.creatorName || "System"}
                                    </span>
                                    <Link href={`/admin/question-banks/${bank.id}`}>
                                        <Button variant="outline" size="sm">
                                            Kelola Soal
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
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
