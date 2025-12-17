"use client";

import { useState, useEffect, useCallback } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toDateTimeLocalString } from "@/lib/date-utils";
import { ClassSelector } from "@/components/exam/ClassSelector";
import { StudentSelector } from "@/components/exam/StudentSelector";

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

interface Student {
    id: string;
    name: string;
    username: string;
    classes: Array<{ id: string; name: string }>;
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
    const [students, setStudents] = useState<Student[]>([]);

    // Form State
    const [formData, setFormData] = useState<Partial<ExamSession>>({
        sessionName: "",
        startTime: "",
        endTime: "",
        targetType: "class",
        targetIds: [],
        status: "scheduled"
    });



    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [sessionRes, classesRes, studentsRes] = await Promise.all([
                fetch(`/api/exam-sessions/${sessionId}`),
                fetch("/api/classes"),
                fetch("/api/users?role=student")
            ]);

            if (sessionRes.ok) {
                const result = await sessionRes.json();
                const session = result.data || result;
                // Convert dates to datetime-local format (UTC+7)
                const startTime = toDateTimeLocalString(session.startTime);
                const endTime = toDateTimeLocalString(session.endTime);

                setFormData({
                    sessionName: session.sessionName,
                    templateId: session.templateId,
                    startTime,
                    endTime,
                    targetType: session.targetType || "class",
                    targetIds: session.targetIds || [],
                    status: session.status
                });
            }
            if (classesRes.ok) {
                const result = await classesRes.json();
                setClasses(result.data || []);
            }
            if (studentsRes.ok) {
                const result = await studentsRes.json();
                setStudents(result.data || []);
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
    }, [sessionId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleTargetToggle = (targetId: string) => {
        setFormData(prev => {
            const current = prev.targetIds || [];
            const updated = current.includes(targetId)
                ? current.filter(id => id !== targetId)
                : [...current, targetId];
            return { ...prev, targetIds: updated };
        });
    };

    const handleSelectAll = (ids: string[]) => {
        setFormData(prev => ({ ...prev, targetIds: ids }));
    };

    const handleTargetTypeChange = (newType: string) => {
        setFormData(prev => ({
            ...prev,
            targetType: newType,
            targetIds: [] // Reset selected targets when changing type
        }));
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
                    targetType: formData.targetType,
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

                        <div className="space-y-2">
                            <Label>Tipe Target</Label>
                            <Select value={formData.targetType} onValueChange={handleTargetTypeChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Tipe Target" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="class">Kelas Tertentu</SelectItem>
                                    <SelectItem value="individual">Siswa Tertentu</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.targetType === "class" && (
                            <div className="space-y-2">
                                <Label>Pilih Kelas</Label>
                                <ClassSelector
                                    classes={classes}
                                    selectedIds={formData.targetIds || []}
                                    onToggle={handleTargetToggle}
                                    onSelectAll={handleSelectAll}
                                />
                            </div>
                        )}

                        {formData.targetType === "individual" && (
                            <div className="space-y-2">
                                <Label>Pilih Siswa</Label>
                                <StudentSelector
                                    students={students}
                                    selectedIds={formData.targetIds || []}
                                    onToggle={handleTargetToggle}
                                    onSelectAll={handleSelectAll}
                                />
                            </div>
                        )}

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
