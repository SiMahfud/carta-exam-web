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
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Subject {
    id: string;
    name: string;
    code: string;
    description: string | null;
    createdAt: Date;
}

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: "",
    });

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const response = await fetch("/api/subjects");
            if (response.ok) {
                const data = await response.json();
                setSubjects(data);
            }
        } catch (error) {
            console.error("Error fetching subjects:", error);
            toast({
                title: "Error",
                description: "Failed to fetch subjects",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingSubject
                ? `/api/subjects/${editingSubject.id}`
                : "/api/subjects";
            const method = editingSubject ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: `Subject ${editingSubject ? "updated" : "created"} successfully`,
                });
                setDialogOpen(false);
                resetForm();
                fetchSubjects();
            } else {
                const error = await response.json();
                toast({
                    title: "Error",
                    description: error.error || "Failed to save subject",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error saving subject:", error);
            toast({
                title: "Error",
                description: "Failed to save subject",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this subject?")) return;

        try {
            const response = await fetch(`/api/subjects/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Subject deleted successfully",
                });
                fetchSubjects();
            } else {
                toast({
                    title: "Error",
                    description: "Failed to delete subject",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error deleting subject:", error);
            toast({
                title: "Error",
                description: "Failed to delete subject",
                variant: "destructive",
            });
        }
    };

    const openEditDialog = (subject: Subject) => {
        setEditingSubject(subject);
        setFormData({
            name: subject.name,
            code: subject.code,
            description: subject.description || "",
        });
        setDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({ name: "", code: "", description: "" });
        setEditingSubject(null);
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Mata Pelajaran</h1>
                    <p className="text-muted-foreground mt-2">
                        Kelola mata pelajaran untuk bank soal dan ujian
                    </p>
                </div>
                <Button
                    onClick={() => {
                        resetForm();
                        setDialogOpen(true);
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Mata Pelajaran
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : subjects.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                            Belum ada mata pelajaran. Tambahkan yang pertama!
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.map((subject) => (
                        <Card key={subject.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{subject.name}</CardTitle>
                                        <CardDescription className="mt-1">
                                            Kode: {subject.code}
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditDialog(subject)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(subject.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            {subject.description && (
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        {subject.description}
                                    </p>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingSubject ? "Edit" : "Tambah"} Mata Pelajaran
                        </DialogTitle>
                        <DialogDescription>
                            {editingSubject
                                ? "Ubah informasi mata pelajaran"
                                : "Tambah mata pelajaran baru"}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name">Nama Mata Pelajaran</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    required
                                    placeholder="e.g., Matematika"
                                />
                            </div>
                            <div>
                                <Label htmlFor="code">Kode</Label>
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            code: e.target.value.toUpperCase(),
                                        })
                                    }
                                    required
                                    placeholder="e.g., MAT"
                                    maxLength={10}
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder="Deskripsi mata pelajaran"
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit">
                                {editingSubject ? "Simpan" : "Tambah"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
