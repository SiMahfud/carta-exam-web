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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, Shield, GraduationCap, BookOpen } from "lucide-react";
import { BulkUserManager } from "@/components/bulk-import/BulkUserManager";
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

interface User {
    id: string;
    name: string;
    username: string;
    role: "admin" | "teacher" | "student";
    createdAt: Date;
}

const roleLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline"; icon: React.ReactNode }> = {
    admin: { label: "Admin", variant: "default", icon: <Shield className="h-3 w-3" /> },
    teacher: { label: "Guru", variant: "secondary", icon: <BookOpen className="h-3 w-3" /> },
    student: { label: "Siswa", variant: "outline", icon: <GraduationCap className="h-3 w-3" /> },
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        username: "",
        password: "",
        role: "student" as "admin" | "teacher" | "student",
    });



    const fetchUsers = useCallback(async () => {
        try {
            const response = await fetch("/api/users");
            if (response.ok) {
                const result = await response.json();
                setUsers(result);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast({
                title: "Error",
                description: "Gagal mengambil data user",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate password for new users
        if (!editingUser && !formData.password) {
            toast({
                title: "Error",
                description: "Password wajib diisi untuk user baru",
                variant: "destructive",
            });
            return;
        }

        try {
            const url = editingUser
                ? `/api/users/${editingUser.id}`
                : "/api/users";
            const method = editingUser ? "PUT" : "POST";

            const bodyData: Record<string, string> = {
                name: formData.name,
                username: formData.username,
                role: formData.role,
            };

            // Only include password if provided
            if (formData.password) {
                bodyData.password = formData.password;
            }

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData),
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: `User ${editingUser ? "diupdate" : "ditambahkan"} dengan sukses`,
                });
                setDialogOpen(false);
                resetForm();
                fetchUsers();
            } else {
                const error = await response.json();
                toast({
                    title: "Error",
                    description: error.error || "Gagal menyimpan user",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error saving user:", error);
            toast({
                title: "Error",
                description: "Gagal menyimpan user",
                variant: "destructive",
            });
        }
    };

    const handleDeleteClick = (id: string) => {
        setUserToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;

        try {
            const response = await fetch(`/api/users/${userToDelete}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "User berhasil dihapus",
                });
                fetchUsers();
            } else {
                toast({
                    title: "Error",
                    description: "Gagal menghapus user",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({
                title: "Error",
                description: "Gagal menghapus user",
                variant: "destructive",
            });
        } finally {
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    };

    const openEditDialog = (user: User) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            username: user.username,
            password: "", // Don't pre-fill password
            role: user.role,
        });
        setDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({ name: "", username: "", password: "", role: "student" });
        setEditingUser(null);
    };

    // Group users by role
    const adminUsers = users.filter(u => u.role === "admin");
    const teacherUsers = users.filter(u => u.role === "teacher");
    const studentUsers = users.filter(u => u.role === "student");

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center flex-col sm:flex-row gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Manajemen User</h2>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                        Kelola user admin, guru, dan siswa
                    </p>
                </div>
                <div className="flex gap-2">
                    <BulkUserManager onSuccess={fetchUsers} />
                    <Button
                        onClick={() => {
                            resetForm();
                            setDialogOpen(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah User
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : users.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                            Belum ada user. Tambahkan yang pertama!
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {/* Admin Users */}
                    {adminUsers.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Admin ({adminUsers.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {adminUsers.map((user) => (
                                    <UserCard
                                        key={user.id}
                                        user={user}
                                        onEdit={openEditDialog}
                                        onDelete={handleDeleteClick}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Teacher Users */}
                    {teacherUsers.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                Guru ({teacherUsers.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {teacherUsers.map((user) => (
                                    <UserCard
                                        key={user.id}
                                        user={user}
                                        onEdit={openEditDialog}
                                        onDelete={handleDeleteClick}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Student Users */}
                    {studentUsers.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <GraduationCap className="h-5 w-5" />
                                Siswa ({studentUsers.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {studentUsers.map((user) => (
                                    <UserCard
                                        key={user.id}
                                        user={user}
                                        onEdit={openEditDialog}
                                        onDelete={handleDeleteClick}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingUser ? "Edit" : "Tambah"} User
                        </DialogTitle>
                        <DialogDescription>
                            {editingUser
                                ? "Ubah informasi user. Kosongkan password jika tidak ingin mengubahnya."
                                : "Tambah user baru ke sistem"}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name">Nama Lengkap *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    required
                                    placeholder="Masukkan nama lengkap"
                                />
                            </div>
                            <div>
                                <Label htmlFor="username">Username *</Label>
                                <Input
                                    id="username"
                                    value={formData.username}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            username: e.target.value,
                                        })
                                    }
                                    required
                                    placeholder="Masukkan username"
                                />
                            </div>
                            <div>
                                <Label htmlFor="password">
                                    Password {editingUser ? "(opsional)" : "*"}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            password: e.target.value,
                                        })
                                    }
                                    required={!editingUser}
                                    placeholder={editingUser ? "Kosongkan jika tidak diubah" : "Masukkan password"}
                                />
                            </div>
                            <div>
                                <Label htmlFor="role">Role *</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value: "admin" | "teacher" | "student") =>
                                        setFormData({ ...formData, role: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4" />
                                                Admin
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="teacher">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4" />
                                                Guru
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="student">
                                            <div className="flex items-center gap-2">
                                                <GraduationCap className="h-4 w-4" />
                                                Siswa
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
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
                                {editingUser ? "Simpan" : "Tambah"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus User?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait.
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

// UserCard component
function UserCard({
    user,
    onEdit,
    onDelete,
}: {
    user: User;
    onEdit: (user: User) => void;
    onDelete: (id: string) => void;
}) {
    const roleInfo = roleLabels[user.role];

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{user.name}</CardTitle>
                        <CardDescription className="mt-1">
                            @{user.username}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(user)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(user.id)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Badge variant={roleInfo.variant} className="flex items-center gap-1 w-fit">
                    {roleInfo.icon}
                    {roleInfo.label}
                </Badge>
            </CardContent>
        </Card>
    );
}
