"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import ExamTemplateWizard from "@/components/exam-templates/ExamTemplateWizard";
import { ExamTemplateFormData } from "@/components/exam-templates/types";
import { Loader2 } from "lucide-react";

export default function EditExamTemplatePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState<ExamTemplateFormData | null>(null);

    useEffect(() => {
        fetchTemplate();
    }, [params.id]);

    const fetchTemplate = async () => {
        try {
            const response = await fetch(`/api/exam-templates/${params.id}`);
            if (response.ok) {
                const data = await response.json();
                const safeParse = (data: any, fallback: any) => {
                    if (typeof data === 'string') {
                        try {
                            return JSON.parse(data);
                        } catch (e) {
                            return fallback;
                        }
                    }
                    return data || fallback;
                };

                // Ensure data matches ExamTemplateFormData structure
                // Some fields might need default values if they are null in DB
                setInitialData({
                    name: data.name,
                    description: data.description || "",
                    subjectId: data.subjectId,
                    bankIds: safeParse(data.bankIds, []),
                    questionComposition: safeParse(data.questionComposition, {
                        mc: 0,
                        complex_mc: 0,
                        matching: 0,
                        short: 0,
                        essay: 0,
                        true_false: 0,
                    }),
                    durationMinutes: data.durationMinutes,
                    minSubmitMinutes: data.minDurationMinutes || 0,
                    totalScore: data.totalScore || 100,
                    displaySettings: safeParse(data.displaySettings, {
                        showQuestionNumber: true,
                        showRemainingTime: true,
                        showNavigation: true,
                    }),
                    enableLockdown: data.enableLockdown ?? true,
                    requireToken: data.requireToken ?? false,
                    maxViolations: data.maxViolations ?? 3,
                    violationSettings: safeParse(data.violationSettings, {
                        detectTabSwitch: true,
                        detectCopyPaste: true,
                        detectRightClick: true,
                        detectScreenshot: true,
                        detectDevTools: true,
                        cooldownSeconds: 5,
                        mode: 'strict' as const,
                    }),
                    // New fields
                    targetType: data.targetType || 'all',
                    targetIds: safeParse(data.targetIds, []),
                    randomizationRules: safeParse(data.randomizationRules, { mode: 'all' }),
                });
            } else {
                toast({
                    title: "Error",
                    description: "Gagal mengambil data template",
                    variant: "destructive",
                });
                router.push("/admin/exam-templates");
            }
        } catch (error) {
            console.error("Error fetching template:", error);
            toast({
                title: "Error",
                description: "Terjadi kesalahan sistem",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (formData: ExamTemplateFormData) => {
        try {
            const response = await fetch(`/api/exam-templates/${params.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    minDurationMinutes: formData.minSubmitMinutes,
                }),
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Template ujian berhasil diperbarui",
                });
                router.push("/admin/exam-templates");
            } else {
                throw new Error("Failed to update template");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal memperbarui template",
                variant: "destructive",
            });
            throw error;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!initialData) {
        return null; // Or some error state, but fetchTemplate handles redirect
    }

    return (
        <ExamTemplateWizard
            initialData={initialData}
            onSubmit={handleSubmit}
            isEditMode={true}
        />
    );
}
