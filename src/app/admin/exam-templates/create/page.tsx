"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import ExamTemplateWizard, { ExamTemplateFormData } from "@/components/exam-templates/ExamTemplateWizard";

export default function CreateExamTemplatePage() {
    const router = useRouter();
    const { toast } = useToast();

    const handleSubmit = async (formData: ExamTemplateFormData) => {
        try {
            const response = await fetch("/api/exam-templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    createdBy: "412d0456-4fcd-473b-a3b5-e16b9a116976", // TODO: Replace with actual user ID from session
                }),
            });

            if (response.ok) {
                toast({
                    title: "Berhasil",
                    description: "Template ujian berhasil dibuat",
                });
                router.push("/admin/exam-templates");
            } else {
                throw new Error("Failed to create template");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal membuat template",
                variant: "destructive",
            });
            throw error; // Re-throw to let the wizard handle loading state if needed
        }
    };

    return <ExamTemplateWizard onSubmit={handleSubmit} />;
}
