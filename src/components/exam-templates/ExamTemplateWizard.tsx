"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Save } from "lucide-react";

// Types
import { ExamTemplateFormData, Subject, QuestionBank } from "./types";

// Step Components
import { StepBasicInfo } from "./wizard-steps/StepBasicInfo";
import { StepQuestionBanks } from "./wizard-steps/StepQuestionBanks";
import { StepComposition } from "./wizard-steps/StepComposition";
import { StepConfiguration } from "./wizard-steps/StepConfiguration";
import { StepTarget } from "./wizard-steps/StepTarget";
import { StepRandomization } from "./wizard-steps/StepRandomization";
import { StepReview } from "./wizard-steps/StepReview";

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
                    {step === 1 && (
                        <StepBasicInfo
                            formData={formData}
                            setFormData={setFormData}
                            subjects={subjects}
                        />
                    )}

                    {step === 2 && (
                        <StepQuestionBanks
                            formData={formData}
                            setFormData={setFormData}
                            questionBanks={questionBanks}
                        />
                    )}

                    {step === 3 && (
                        <StepComposition
                            formData={formData}
                            setFormData={setFormData}
                        />
                    )}

                    {step === 4 && (
                        <StepConfiguration
                            formData={formData}
                            setFormData={setFormData}
                        />
                    )}

                    {step === 5 && (
                        <StepTarget
                            formData={formData}
                            setFormData={setFormData}
                        />
                    )}

                    {step === 6 && (
                        <StepRandomization
                            formData={formData}
                            setFormData={setFormData}
                        />
                    )}

                    {step === 7 && (
                        <StepReview
                            formData={formData}
                            subjects={subjects}
                        />
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6 border-t mt-6">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={step === 1 || loading}
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
                                {loading ? (
                                    "Menyimpan..."
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Simpan Template
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
