"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface ExamSession {
    id: string;
    sessionName: string;
    templateId: string;
    startTime: string;
    endTime: string;
    targetType: string;
    targetIds: string[];
    status: string;
}

interface Class {
    id: string;
    name: string;
    grade: number;
}

export default function EditExamSessionPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const sessionId = params.id as string;

    // Data
    const [classes, setClasses] = useState<Class[]>([]);

    // Form State
    const [formData, setFormData] = useState<Partial<ExamSession>>({
        sessionName: "",
        startTime: "",
        endTime: "",
        targetIds: [],
        status: "scheduled"
    });

    useEffect(() => {
        fetchData();
    }, [sessionId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sessionRes, classesRes] = await Promise.all([
                fetch(`/api/exam-sessions/${sessionId}`),
                fetch("/api/classes")
            ]);

            if (sessionRes.ok) {
                const session = await sessionRes.json();
                // Convert dates to datetime-local format
                const startTime = new Date(session.startTime).toISOString().slice(0, 16);
                const endTime = new Date(session.endTime).toISOString().slice(0, 16);

                setFormData({
                    sessionName: session.sessionName,
                    templateId: session.templateId,
                    startTime,
                    endTime,
                    targetIds: session.targetIds || [],
                    status: session.status
                });
            }
            if (classesRes.ok) {
                const data = await classesRes.json();
                setClasses(data);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: "Gagal memuat data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClassToggle = (classId: string) => {
        setFormData(prev => {
            const current = prev.targetIds || [];
            const updated = current.includes(classId)
                ? current.filter(id => id !== classId)
                : [...current, classId];
            return { ...prev, targetIds: updated };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.sessionName || !formData.startTime || !formData.endTime) {
            toast({
                title: "Error",
                description: "Mohon lengkapi semua field wajib",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`/api/exam-sessions/${sessionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionName: formData.sessionName,
                    startTime: formData.startTime,
                    endTime: formData.endTime,
                    targetIds: formData.targetIds,
                    status: formData.status
                }),
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Sesi ujian berhasil diperbarui",
                });
                router.push("/admin/exam-sessions");
            } else {
                const error = await response.json();
                throw new Error(error.error || "Failed to update session");
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/exam-sessions">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Edit Sesi Ujian</h2>
                    <p className="text-muted-foreground">Perbarui detail sesi ujian</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Detail Sesi</CardTitle>
                        <CardDescription>Edit informasi sesi ujian</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Nama Sesi</Label>
                            <Input
                                value={formData.sessionName}
                                onChange={e => setFormData({ ...formData, sessionName: e.target.value })}
                                placeholder="Contoh: UTS Matematika Kelas X"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Waktu Mulai</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.startTime}
                                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Waktu Selesai</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.endTime}
                                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label>Target Peserta (Kelas)</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border rounded-lg p-4">
                                {classes.map(cls => (
                                    <div key={cls.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={cls.id}
                                            checked={formData.targetIds?.includes(cls.id)}
                                            onCheckedChange={() => handleClassToggle(cls.id)}
                                        />
                                        <label
                                            htmlFor={cls.id}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {cls.name}
                                        </label>
                                    </div>
                                ))}
                                {classes.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Belum ada data kelas</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="scheduled">Terjadwal</SelectItem>
                                    <SelectItem value="active">Aktif</SelectItem>
                                    <SelectItem value="completed">Selesai</SelectItem>
                                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Link href="/admin/exam-sessions">
                                <Button variant="outline" type="button">Batal</Button>
                            </Link>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan Perubahan
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
