"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { ClassSelector } from "@/components/exam/ClassSelector";
import { StudentSelector } from "@/components/exam/StudentSelector";

interface ExamTemplate {
    id: string;
    name: string;
    durationMinutes: number;
    subjectName: string;
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

export default function CreateExamSessionPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Data
    const [templates, setTemplates] = useState<ExamTemplate[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        sessionName: "",
        templateId: "",
        startTime: "",
        endTime: "",
        targetType: "class",
        targetIds: [] as string[]
    });



    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [templatesRes, classesRes, studentsRes] = await Promise.all([
                fetch("/api/exam-templates?limit=100"), // Fetch all for now
                fetch("/api/classes"),
                fetch("/api/users?role=student")
            ]);

            if (templatesRes.ok) {
                const result = await templatesRes.json();
                setTemplates(result.data || []);
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
                description: "Gagal memuat data awal",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleTargetToggle = (targetId: string) => {
        setFormData(prev => {
            const current = prev.targetIds;
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

        if (!formData.templateId || !formData.sessionName || !formData.startTime || !formData.endTime || formData.targetIds.length === 0) {
            toast({
                title: "Error",
                description: "Mohon lengkapi semua field wajib",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch("/api/exam-sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Sesi ujian berhasil dibuat",
                });
                router.push("/admin/exam-sessions");
            } else {
                const error = await response.json();
                throw new Error(error.error || "Failed to create session");
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

    // Auto-fill session name when template is selected
    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template && !formData.sessionName) {
            setFormData(prev => ({
                ...prev,
                templateId,
                sessionName: `Ujian ${template.name}`
            }));
        } else {
            setFormData(prev => ({ ...prev, templateId }));
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
                    <h2 className="text-2xl font-bold tracking-tight">Buat Sesi Ujian Baru</h2>
                    <p className="text-muted-foreground">Jadwalkan pelaksanaan ujian untuk kelas</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Detail Sesi</CardTitle>
                        <CardDescription>Konfigurasi dasar sesi ujian</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Template Ujian</Label>
                            <Select value={formData.templateId} onValueChange={handleTemplateSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Template Ujian" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name} ({t.subjectName}) - {t.durationMinutes} menit
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

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
                                    selectedIds={formData.targetIds}
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
                                    selectedIds={formData.targetIds}
                                    onToggle={handleTargetToggle}
                                    onSelectAll={handleSelectAll}
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-4 pt-4">
                            <Link href="/admin/exam-sessions">
                                <Button variant="outline" type="button">Batal</Button>
                            </Link>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Buat Sesi
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
