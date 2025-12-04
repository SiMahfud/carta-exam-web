"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, ChevronLeft, Save, Clock, Shield, Settings, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

// Types
interface Subject {
    id: string;
    name: string;
}

interface QuestionBank {
    id: string;
    name: string;
    subjectId: string;
    questionCount: number;
    description?: string;
}

export interface ExamTemplateFormData {
    name: string;
    description: string;
    subjectId: string;
    bankIds: string[];
    questionComposition: {
        mc: number;
        complex_mc: number;
        matching: number;
        short: number;
        essay: number;
        true_false: number;
    };
    durationMinutes: number;
    totalScore: number;
    displaySettings: {
        showQuestionNumber: boolean;
        showRemainingTime: boolean;
        showNavigation: boolean;
    };
    enableLockdown: boolean;
    requireToken: boolean;
    maxViolations: number;
    // New fields
    targetType: 'all' | 'classes' | 'grades' | 'students';
    targetIds: string[];
    randomizationRules: {
        mode: 'all' | 'by_type' | 'exclude_type' | 'specific_numbers';
        types?: ('mc' | 'complex_mc' | 'matching' | 'short' | 'essay' | 'true_false')[];
        excludeTypes?: ('mc' | 'complex_mc' | 'matching' | 'short' | 'essay' | 'true_false')[];
        questionNumbers?: number[];
    };
}

interface ExamTemplateWizardProps {
    initialData?: ExamTemplateFormData;
    onSubmit: (data: ExamTemplateFormData) => Promise<void>;
    isEditMode?: boolean;
}

export default function ExamTemplateWizard({ initialData, onSubmit, isEditMode = false }: ExamTemplateWizardProps) {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);

    // Form State
    const [formData, setFormData] = useState<ExamTemplateFormData>(initialData || {
        name: "",
        description: "",
        subjectId: "",
        bankIds: [],
        questionComposition: {
            mc: 0,
            complex_mc: 0,
            matching: 0,
            short: 0,
            essay: 0,
            true_false: 0,
        },
        durationMinutes: 60,
        totalScore: 100,
        displaySettings: {
            showQuestionNumber: true,
            showRemainingTime: true,
            showNavigation: true,
        },
        // Security defaults
        enableLockdown: true,
        requireToken: false,
        maxViolations: 3,
        // New field defaults
        targetType: 'all',
        targetIds: [],
        randomizationRules: {
            mode: 'all',
        },
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
        }
    };

    const fetchQuestionBanks = async (subjectId: string) => {
        try {
            const response = await fetch(`/api/question-banks?subjectId=${subjectId}`);
            if (response.ok) {
                const data = await response.json();
                setQuestionBanks(data);
            }
        } catch (error) {
            console.error("Error fetching question banks:", error);
        }
    };

    useEffect(() => {
        if (formData.subjectId) {
            fetchQuestionBanks(formData.subjectId);
        } else {
            setQuestionBanks([]);
        }
    }, [formData.subjectId]);

    const handleNext = () => {
        if (step === 1 && (!formData.name || !formData.subjectId)) {
            toast({
                title: "Validasi Gagal",
                description: "Mohon lengkapi nama dan mata pelajaran",
                variant: "destructive",
            });
            return;
        }
        if (step === 2 && formData.bankIds.length === 0) {
            toast({
                title: "Validasi Gagal",
                description: "Pilih minimal satu bank soal",
                variant: "destructive",
            });
            return;
        }
        if (step === 3) {
            const totalQuestions = Object.values(formData.questionComposition).reduce((a, b) => a + b, 0);
            if (totalQuestions === 0) {
                toast({
                    title: "Validasi Gagal",
                    description: "Total soal tidak boleh 0",
                    variant: "destructive",
                });
                return;
            }
        }
        setStep(step + 1);
    };

    const handleBack = () => {
        setStep(step - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        {isEditMode ? "Edit Template Ujian" : "Buat Template Ujian"}
                    </h2>
                    <p className="text-muted-foreground">
                        Langkah {step} dari 7
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${(step / 7) * 100}%` }}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {step === 1 && "Informasi Dasar"}
                        {step === 2 && "Sumber Soal"}
                        {step === 3 && "Komposisi Soal"}
                        {step === 4 && "Pengaturan & Keamanan"}
                        {step === 5 && "Target Ujian"}
                        {step === 6 && "Aturan Pengacakan"}
                        {step === 7 && "Review & Simpan"}
                    </CardTitle>
                    <CardDescription>
                        {step === 1 && "Isi detail dasar template ujian"}
                        {step === 2 && "Pilih bank soal yang akan digunakan"}
                        {step === 3 && "Tentukan jumlah soal per tipe"}
                        {step === 4 && "Atur durasi, skor, dan keamanan"}
                        {step === 5 && "Pilih kelas atau siswa yang bisa mengakses"}
                        {step === 6 && "Atur cara pengacakan soal"}
                        {step === 7 && "Periksa kembali konfigurasi sebelum menyimpan"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nama Template</Label>
                                <Input
                                    id="name"
                                    placeholder="Contoh: Ujian Tengah Semester Ganjil"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Mata Pelajaran</Label>
                                <Select
                                    value={formData.subjectId}
                                    onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih mata pelajaran" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((subject) => (
                                            <SelectItem key={subject.id} value={subject.id}>
                                                {subject.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Deskripsi tambahan untuk template ini"
                                    value={formData.description || ""}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Question Banks */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                                Pilih bank soal yang akan digunakan sebagai sumber pertanyaan untuk ujian ini.
                            </div>
                            {questionBanks.length === 0 ? (
                                <div className="text-center py-8 border rounded-lg bg-muted/20">
                                    <p>Tidak ada bank soal tersedia untuk mata pelajaran ini.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {questionBanks.map((bank) => (
                                        <div
                                            key={bank.id}
                                            className={`
                                                relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors
                                                ${formData.bankIds.includes(bank.id) ? "border-primary bg-primary/5" : "hover:bg-accent"}
                                            `}
                                            onClick={() => {
                                                const current = formData.bankIds;
                                                const updated = current.includes(bank.id)
                                                    ? current.filter(id => id !== bank.id)
                                                    : [...current, bank.id];
                                                setFormData({ ...formData, bankIds: updated });
                                            }}
                                        >
                                            <Checkbox
                                                checked={formData.bankIds.includes(bank.id)}
                                                onCheckedChange={() => { }} // Handled by parent div click
                                            />
                                            <div className="flex-1 space-y-1">
                                                <div className="font-medium leading-none flex justify-between">
                                                    {bank.name}
                                                    <Badge variant="secondary" className="ml-2">
                                                        {bank.questionCount} Soal
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {bank.description || "Tidak ada deskripsi"}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Question Composition */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="text-sm text-muted-foreground">
                                Tentukan jumlah soal untuk setiap tipe pertanyaan. Pastikan total soal sesuai dengan yang tersedia di bank soal yang dipilih.
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Pilihan Ganda</Label>
                                            <p className="text-xs text-muted-foreground">Multiple Choice (A-E)</p>
                                        </div>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="w-24 text-right"
                                            value={formData.questionComposition.mc}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                questionComposition: {
                                                    ...formData.questionComposition,
                                                    mc: parseInt(e.target.value) || 0
                                                }
                                            })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Pilihan Ganda Kompleks</Label>
                                            <p className="text-xs text-muted-foreground">Multiple Answers</p>
                                        </div>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="w-24 text-right"
                                            value={formData.questionComposition.complex_mc}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                questionComposition: {
                                                    ...formData.questionComposition,
                                                    complex_mc: parseInt(e.target.value) || 0
                                                }
                                            })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Menjodohkan</Label>
                                            <p className="text-xs text-muted-foreground">Matching Pairs</p>
                                        </div>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="w-24 text-right"
                                            value={formData.questionComposition.matching}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                questionComposition: {
                                                    ...formData.questionComposition,
                                                    matching: parseInt(e.target.value) || 0
                                                }
                                            })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Isian Singkat</Label>
                                            <p className="text-xs text-muted-foreground">Short Answer</p>
                                        </div>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="w-24 text-right"
                                            value={formData.questionComposition.short}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                questionComposition: {
                                                    ...formData.questionComposition,
                                                    short: parseInt(e.target.value) || 0
                                                }
                                            })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Uraian / Esai</Label>
                                            <p className="text-xs text-muted-foreground">Essay</p>
                                        </div>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="w-24 text-right"
                                            value={formData.questionComposition.essay}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                questionComposition: {
                                                    ...formData.questionComposition,
                                                    essay: parseInt(e.target.value) || 0
                                                }
                                            })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Benar - Salah</Label>
                                            <p className="text-xs text-muted-foreground">True / False</p>
                                        </div>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="w-24 text-right"
                                            value={formData.questionComposition.true_false}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                questionComposition: {
                                                    ...formData.questionComposition,
                                                    true_false: parseInt(e.target.value) || 0
                                                }
                                            })}
                                        />
                                    </div>

                                    <div className="p-4 bg-secondary/20 rounded-lg">
                                        <div className="flex justify-between items-center font-semibold">
                                            <span>Total Soal:</span>
                                            <span className="text-lg">
                                                {Object.values(formData.questionComposition).reduce((a, b) => a + b, 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Configuration */}
                    {step === 4 && (
                        <div className="space-y-8">
                            {/* Timing */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b">
                                    <Clock className="h-5 w-5 text-primary" />
                                    <h3 className="font-semibold text-lg">Waktu & Skor</h3>
                                </div>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Durasi Ujian (Menit)</Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            min="1"
                                            value={formData.durationMinutes}
                                            onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="totalScore">Total Skor Maksimal</Label>
                                        <Input
                                            id="totalScore"
                                            type="number"
                                            min="1"
                                            value={formData.totalScore}
                                            onChange={(e) => setFormData({ ...formData, totalScore: parseInt(e.target.value) || 0 })}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Sistem akan otomatis mengkonversi bobot soal ke skala ini.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Security */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b">
                                    <Shield className="h-5 w-5 text-primary" />
                                    <h3 className="font-semibold text-lg">Keamanan</h3>
                                </div>
                                <div className="grid gap-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Lockdown Browser</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Mencegah siswa membuka tab lain atau aplikasi lain.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.enableLockdown}
                                            onCheckedChange={(checked) => setFormData({ ...formData, enableLockdown: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Token Ujian</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Siswa memerlukan token khusus untuk memulai ujian.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.requireToken}
                                            onCheckedChange={(checked) => setFormData({ ...formData, requireToken: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Batas Pelanggaran</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Jumlah maksimal peringatan sebelum ujian dihentikan otomatis.
                                            </p>
                                        </div>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="w-24 text-right"
                                            value={formData.maxViolations}
                                            onChange={(e) => setFormData({ ...formData, maxViolations: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Display Settings */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b">
                                    <Settings className="h-5 w-5 text-primary" />
                                    <h3 className="font-semibold text-lg">Tampilan</h3>
                                </div>
                                <div className="grid gap-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="showNav"
                                            checked={formData.displaySettings.showNavigation}
                                            onCheckedChange={(checked) => setFormData({
                                                ...formData,
                                                displaySettings: { ...formData.displaySettings, showNavigation: checked as boolean }
                                            })}
                                        />
                                        <Label htmlFor="showNav">Tampilkan Navigasi Soal</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="showTime"
                                            checked={formData.displaySettings.showRemainingTime}
                                            onCheckedChange={(checked) => setFormData({
                                                ...formData,
                                                displaySettings: { ...formData.displaySettings, showRemainingTime: checked as boolean }
                                            })}
                                        />
                                        <Label htmlFor="showTime">Tampilkan Sisa Waktu</Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Target Selection */}
                    {step === 5 && (
                        <div className="space-y-6">
                            <div className="text-sm text-muted-foreground">
                                Tentukan siapa saja yang bisa mengakses ujian ini. Default adalah semua siswa.
                            </div>

                            <div className="space-y-4">
                                <Label>Tipe Target</Label>
                                <Select
                                    value={formData.targetType}
                                    onValueChange={(value: any) => setFormData({ ...formData, targetType: value, targetIds: [] })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Siswa</SelectItem>
                                        <SelectItem value="classes">Kelas Tertentu</SelectItem>
                                        <SelectItem value="grades">Tingkat Tertentu</SelectItem>
                                        <SelectItem value="students">Siswa Tertentu</SelectItem>
                                    </SelectContent>
                                </Select>

                                {formData.targetType !== 'all' && (
                                    <div className="p-4 border rounded-lg bg-muted/20">
                                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                            ⓘ Fitur pemilihan target spesifik akan tersedia saat membuat sesi ujian dari template ini.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 6: Advanced Randomization */}
                    {step === 6 && (
                        <div className="space-y-6">
                            <div className="text-sm text-muted-foreground">
                                Atur cara soal diacak untuk setiap siswa. Pengacakan membuat soal lebih aman.
                            </div>

                            <div className="space-y-4">
                                <Label>Mode Pengacakan</Label>
                                <Select
                                    value={formData.randomizationRules.mode}
                                    onValueChange={(value: any) => setFormData({
                                        ...formData,
                                        randomizationRules: { mode: value }
                                    })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Acak Semua Soal</SelectItem>
                                        <SelectItem value="by_type">Acak Jenis Soal Tertentu</SelectItem>
                                        <SelectItem value="exclude_type">Acak Kecuali Jenis Tertentu</SelectItem>
                                        <SelectItem value="specific_numbers">Acak Nomor Tertentu</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.randomizationRules.mode === 'by_type' && (
                                <div className="space-y-3">
                                    <Label>Jenis Soal yang Diacak</Label>
                                    <div className="grid gap-3">
                                        {[
                                            { value: 'mc', label: 'Pilihan Ganda' },
                                            { value: 'complex_mc', label: 'Pilihan Ganda Kompleks' },
                                            { value: 'matching', label: 'Menjodohkan' },
                                            { value: 'short', label: 'Isian Singkat' },
                                            { value: 'essay', label: 'Uraian/Esai' },
                                            { value: 'true_false', label: 'Benar - Salah' },
                                        ].map(type => (
                                            <div key={type.value} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`random-${type.value}`}
                                                    checked={formData.randomizationRules.types?.includes(type.value as any) || false}
                                                    onCheckedChange={(checked) => {
                                                        const current = formData.randomizationRules.types || [];
                                                        const updated = checked
                                                            ? [...current, type.value as any]
                                                            : current.filter(t => t !== type.value);
                                                        setFormData({
                                                            ...formData,
                                                            randomizationRules: {
                                                                ...formData.randomizationRules,
                                                                types: updated
                                                            }
                                                        });
                                                    }}
                                                />
                                                <Label htmlFor={`random-${type.value}`} className="font-normal">
                                                    {type.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.randomizationRules.mode === 'exclude_type' && (
                                <div className="space-y-3">
                                    <Label>Jenis Soal yang TIDAK Diacak</Label>
                                    <div className="grid gap-3">
                                        {[
                                            { value: 'mc', label: 'Pilihan Ganda' },
                                            { value: 'complex_mc', label: 'Pilihan Ganda Kompleks' },
                                            { value: 'matching', label: 'Menjodohkan' },
                                            { value: 'short', label: 'Isian Singkat' },
                                            { value: 'essay', label: 'Uraian/Esai' },
                                            { value: 'true_false', label: 'Benar - Salah' },
                                        ].map(type => (
                                            <div key={type.value} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`exclude-${type.value}`}
                                                    checked={formData.randomizationRules.excludeTypes?.includes(type.value as any) || false}
                                                    onCheckedChange={(checked) => {
                                                        const current = formData.randomizationRules.excludeTypes || [];
                                                        const updated = checked
                                                            ? [...current, type.value as any]
                                                            : current.filter(t => t !== type.value);
                                                        setFormData({
                                                            ...formData,
                                                            randomizationRules: {
                                                                ...formData.randomizationRules,
                                                                excludeTypes: updated
                                                            }
                                                        });
                                                    }}
                                                />
                                                <Label htmlFor={`exclude-${type.value}`} className="font-normal">
                                                    {type.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.randomizationRules.mode === 'specific_numbers' && (
                                <div className="space-y-3">
                                    <Label>Nomor Soal yang Diacak (pisahkan dengan koma)</Label>
                                    <Input
                                        placeholder="Contoh: 1,3,5,7,9"
                                        value={formData.randomizationRules.questionNumbers?.join(',') || ''}
                                        onChange={(e) => {
                                            const numbers = e.target.value
                                                .split(',')
                                                .map(n => parseInt(n.trim()))
                                                .filter(n => !isNaN(n));
                                            setFormData({
                                                ...formData,
                                                randomizationRules: {
                                                    ...formData.randomizationRules,
                                                    questionNumbers: numbers
                                                }
                                            });
                                        }}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Masukkan nomor soal yang ingin diacak. Nomor dimulai dari 1.
                                    </p>
                                </div>
                            )}

                            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                    💡 Tip: Acak semua soal kecuali esai agar esai tetap di akhir.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 7: Review */}
                    {step === 7 && (
                        <div className="space-y-6">
                            <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">Nama Template</h4>
                                        <p className="font-medium">{formData.name}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">Mata Pelajaran</h4>
                                        <p className="font-medium">
                                            {subjects.find(s => s.id === formData.subjectId)?.name || "-"}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">Durasi</h4>
                                        <p className="font-medium">{formData.durationMinutes} Menit</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm text-muted-foreground mb-1">Total Skor</h4>
                                        <p className="font-medium">{formData.totalScore}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Komposisi Soal</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.questionComposition.mc > 0 && (
                                            <Badge variant="outline">PG: {formData.questionComposition.mc}</Badge>
                                        )}
                                        {formData.questionComposition.complex_mc > 0 && (
                                            <Badge variant="outline">PG Kompleks: {formData.questionComposition.complex_mc}</Badge>
                                        )}
                                        {formData.questionComposition.matching > 0 && (
                                            <Badge variant="outline">Menjodohkan: {formData.questionComposition.matching}</Badge>
                                        )}
                                        {formData.questionComposition.short > 0 && (
                                            <Badge variant="outline">Isian: {formData.questionComposition.short}</Badge>
                                        )}
                                        {formData.questionComposition.essay > 0 && (
                                            <Badge variant="outline">Esai: {formData.questionComposition.essay}</Badge>
                                        )}
                                        {formData.questionComposition.true_false > 0 && (
                                            <Badge variant="outline">B/S: {formData.questionComposition.true_false}</Badge>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Bank Soal Terpilih</h4>
                                    <ul className="list-disc list-inside text-sm">
                                        {questionBanks
                                            .filter(b => formData.bankIds.includes(b.id))
                                            .map(b => (
                                                <li key={b.id}>{b.name}</li>
                                            ))
                                        }
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Pengaturan Keamanan</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.enableLockdown && <Badge variant="secondary">Lockdown Browser</Badge>}
                                        {formData.requireToken && <Badge variant="secondary">Token Wajib</Badge>}
                                        <Badge variant="secondary">Max Pelanggaran: {formData.maxViolations}</Badge>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Target Ujian</h4>
                                    <Badge variant="outline">
                                        {formData.targetType === 'all' && 'Semua Siswa'}
                                        {formData.targetType === 'classes' && 'Kelas Tertentu'}
                                        {formData.targetType === 'grades' && 'Tingkat Tertentu'}
                                        {formData.targetType === 'students' && 'Siswa Tertentu'}
                                    </Badge>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Pengacakan Soal</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.randomizationRules.mode === 'all' && (
                                            <Badge variant="outline">Acak Semua Soal</Badge>
                                        )}
                                        {formData.randomizationRules.mode === 'by_type' && (
                                            <>
                                                <Badge variant="outline">Acak Jenis Tertentu:</Badge>
                                                {formData.randomizationRules.types?.map(t => (
                                                    <Badge key={t} variant="secondary">{t}</Badge>
                                                ))}
                                            </>
                                        )}
                                        {formData.randomizationRules.mode === 'exclude_type' && (
                                            <>
                                                <Badge variant="outline">Acak Kecuali:</Badge>
                                                {formData.randomizationRules.excludeTypes?.map(t => (
                                                    <Badge key={t} variant="secondary">{t}</Badge>
                                                ))}
                                            </>
                                        )}
                                        {formData.randomizationRules.mode === 'specific_numbers' && (
                                            <>
                                                <Badge variant="outline">Acak Nomor Tertentu:</Badge>
                                                <Badge variant="secondary">
                                                    {formData.randomizationRules.questionNumbers?.join(', ')}
                                                </Badge>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 text-blue-700 p-3 rounded border border-blue-200">
                                <FileText className="h-4 w-4" />
                                <p>
                                    Pastikan semua pengaturan sudah benar. Template yang sudah dibuat dapat diedit kembali nantinya.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between pt-6">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={step === 1}
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Kembali
                        </Button>

                        {step < 7 ? (
                            <Button onClick={handleNext}>
                                Lanjut
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={loading}>
                                <Save className="mr-2 h-4 w-4" />
                                {loading ? "Menyimpan..." : (isEditMode ? "Simpan Perubahan" : "Simpan Template")}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
