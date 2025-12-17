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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface Class {
    id: string;
    name: string;
    grade: number;
    academicYear: string;
    teacherId: string | null;
    teacherName: string | null;
    studentCount?: number;
}

interface Student {
    id: string;
    name: string;
    username: string;
}

export default function ClassesPage() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    // Create/Edit Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        grade: "10",
        academicYear: new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
        teacherId: "",
    });

    // Student Management State
    const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [classStudents, setClassStudents] = useState<Student[]>([]);
    const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
    const [studentSearch, setStudentSearch] = useState("");

    // Delete Confirmation State
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: "class" | "student"; id: string; name?: string } | null>(null);

    useEffect(() => {
        fetchClasses();
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
            toast({
                title: "Error",
                description: "Gagal memuat data kelas",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchClassStudents = async (classId: string) => {
        try {
            const response = await fetch(`/api/classes/${classId}`);
            if (response.ok) {
                const result = await response.json();
                // API returns students directly on the object
                setClassStudents(result.students || []);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
        }
    };

    const fetchAvailableStudents = async () => {
        try {
            // Fetch only students not enrolled in any class
            const response = await fetch("/api/users?role=student&unassigned=true");
            if (response.ok) {
                const result = await response.json();
                // Users API returns array directly, not wrapped in data
                setAvailableStudents(Array.isArray(result) ? result : result.data || []);
            }
        } catch (error) {
            console.error("Error fetching available students:", error);
        }
    };

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingClass
                ? `/api/classes/${editingClass.id}`
                : "/api/classes";
            const method = editingClass ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    grade: parseInt(formData.grade),
                    academicYear: formData.academicYear,
                    teacherId: formData.teacherId || null,
                }),
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: editingClass
                        ? "Kelas berhasil diperbarui"
                        : "Kelas berhasil dibuat",
                });
                setIsDialogOpen(false);
                fetchClasses();
                resetForm();
            } else {
                throw new Error("Failed to save class");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal menyimpan kelas",
                variant: "destructive",
            });
        }
    };

    const confirmDeleteClass = (cls: Class) => {
        setItemToDelete({ type: "class", id: cls.id, name: cls.name });
        setDeleteAlertOpen(true);
    };

    const handleDeleteClass = async () => {
        if (!itemToDelete || itemToDelete.type !== "class") return;

        try {
            const response = await fetch(`/api/classes/${itemToDelete.id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Kelas berhasil dihapus",
                });
                fetchClasses();
            } else {
                throw new Error("Failed to delete class");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal menghapus kelas",
                variant: "destructive",
            });
        } finally {
            setDeleteAlertOpen(false);
            setItemToDelete(null);
        }
    };

    const handleAddStudent = async (studentId: string) => {
        if (!selectedClass) return;

        try {
            const response = await fetch(`/api/classes/${selectedClass.id}/students`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId }),
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Siswa berhasil ditambahkan",
                });
                fetchClassStudents(selectedClass.id);
            } else {
                const error = await response.json();
                toast({
                    title: "Gagal",
                    description: error.error || "Gagal menambahkan siswa",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Terjadi kesalahan saat menambahkan siswa",
                variant: "destructive",
            });
        }
    };

    const confirmRemoveStudent = (student: Student) => {
        setItemToDelete({ type: "student", id: student.id, name: student.name });
        setDeleteAlertOpen(true);
    };

    const handleRemoveStudent = async () => {
        if (!selectedClass || !itemToDelete || itemToDelete.type !== "student") return;

        try {
            const response = await fetch(
                `/api/classes/${selectedClass.id}/students/${itemToDelete.id}`,
                { method: "DELETE" }
            );

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Siswa berhasil dihapus dari kelas",
                });
                fetchClassStudents(selectedClass.id);
                fetchAvailableStudents(); // Refresh available students list
            } else {
                throw new Error("Failed to remove student");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal menghapus siswa",
                variant: "destructive",
            });
        } finally {
            setDeleteAlertOpen(false);
            setItemToDelete(null);
        }
    };

    const openEditDialog = (cls: Class) => {
        setEditingClass(cls);
        setFormData({
            name: cls.name,
            grade: cls.grade.toString(),
            academicYear: cls.academicYear,
            teacherId: cls.teacherId || "",
        });
        setIsDialogOpen(true);
    };

    const openStudentDialog = (cls: Class) => {
        setSelectedClass(cls);
        fetchClassStudents(cls.id);
        fetchAvailableStudents();
        setIsStudentDialogOpen(true);
    };

    const resetForm = () => {
        setEditingClass(null);
        setFormData({
            name: "",
            grade: "10",
            academicYear: new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
            teacherId: "",
        });
    };

    const filteredClasses = classes.filter((cls) =>
        cls.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAvailableStudents = availableStudents.filter(
        (student) =>
            !classStudents.some((s) => s.id === student.id) &&
            (student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                student.username.toLowerCase().includes(studentSearch.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Manajemen Kelas</h2>
                    <p className="text-muted-foreground">
                        Kelola data kelas dan siswa
                    </p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Kelas
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari kelas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-40 mb-4" />
                                <div className="flex justify-end gap-2">
                                    <Skeleton className="h-8 w-20" />
                                    <Skeleton className="h-8 w-8" />
                                    <Skeleton className="h-8 w-8" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filteredClasses.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="Belum ada kelas"
                    description={searchQuery ? "Tidak ada kelas yang cocok dengan pencarian." : "Belum ada kelas yang dibuat. Mulai dengan membuat kelas baru."}
                    action={!searchQuery ? {
                        label: "Tambah Kelas",
                        onClick: () => setIsDialogOpen(true)
                    } : undefined}
                />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredClasses.map((cls) => (
                        <Card key={cls.id}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div>
                                    <CardTitle className="text-xl">{cls.name}</CardTitle>
                                    <CardDescription>
                                        Kelas {cls.grade} • {cls.academicYear}
                                    </CardDescription>
                                </div>
                                <Badge variant="outline">{cls.studentCount || 0} Siswa</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground mb-4">
                                    Wali Kelas: {cls.teacherName || "-"}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openStudentDialog(cls)}
                                    >
                                        <Users className="h-4 w-4 mr-1" />
                                        Siswa
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditDialog(cls)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => confirmDeleteClass(cls)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingClass ? "Edit Kelas" : "Tambah Kelas Baru"}
                        </DialogTitle>
                        <DialogDescription>
                            Isi detail informasi kelas di bawah ini
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateOrUpdate}>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Nama Kelas
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    className="col-span-3"
                                    placeholder="Contoh: X-1, XI IPA 2"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="grade" className="text-right">
                                    Tingkat
                                </Label>
                                <Select
                                    value={formData.grade}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, grade: value })
                                    }
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Pilih tingkat" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">Kelas 10</SelectItem>
                                        <SelectItem value="11">Kelas 11</SelectItem>
                                        <SelectItem value="12">Kelas 12</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="year" className="text-right">
                                    Tahun Ajar
                                </Label>
                                <Input
                                    id="year"
                                    value={formData.academicYear}
                                    onChange={(e) =>
                                        setFormData({ ...formData, academicYear: e.target.value })
                                    }
                                    className="col-span-3"
                                    placeholder="Contoh: 2024/2025"
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit">Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Manage Students Dialog */}
            <Dialog
                open={isStudentDialogOpen}
                onOpenChange={(open) => setIsStudentDialogOpen(open)}
            >
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Kelola Siswa - {selectedClass?.name}</DialogTitle>
                        <DialogDescription>
                            Tambah atau hapus siswa dari kelas ini
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 flex gap-4 min-h-0 mt-4">
                        {/* Left: Current Students */}
                        <div className="flex-1 border rounded-md p-4 flex flex-col">
                            <h4 className="font-semibold mb-2">
                                Siswa Terdaftar ({classStudents.length})
                            </h4>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {classStudents.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Belum ada siswa
                                    </p>
                                ) : (
                                    classStudents.map((student) => (
                                        <div
                                            key={student.id}
                                            className="flex justify-between items-center p-2 bg-secondary/20 rounded text-sm"
                                        >
                                            <div>
                                                <div className="font-medium">{student.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {student.username}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive"
                                                onClick={() => confirmRemoveStudent(student)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right: Add Students */}
                        <div className="flex-1 border rounded-md p-4 flex flex-col">
                            <h4 className="font-semibold mb-2">Tambah Siswa</h4>
                            <div className="relative mb-2">
                                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                                <Input
                                    placeholder="Cari siswa..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="pl-7 h-8 text-sm"
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {filteredAvailableStudents.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Tidak ada siswa tersedia
                                    </p>
                                ) : (
                                    filteredAvailableStudents.map((student) => (
                                        <div
                                            key={student.id}
                                            className="flex justify-between items-center p-2 border rounded text-sm hover:bg-accent cursor-pointer"
                                            onClick={() => handleAddStudent(student.id)}
                                        >
                                            <div>
                                                <div className="font-medium">{student.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {student.username}
                                                </div>
                                            </div>
                                            <Plus className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Alert */}
            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {itemToDelete?.type === "class"
                                ? `Anda akan menghapus kelas "${itemToDelete.name}". Tindakan ini tidak dapat dibatalkan.`
                                : `Anda akan menghapus siswa "${itemToDelete?.name}" dari kelas ini.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={
                                itemToDelete?.type === "class"
                                    ? handleDeleteClass
                                    : handleRemoveStudent
                            }
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
