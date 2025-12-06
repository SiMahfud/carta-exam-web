import { Badge } from "@/components/ui/badge";
import { ExamTemplateFormData, Subject } from "../types";

interface StepReviewProps {
    formData: ExamTemplateFormData;
    subjects: Subject[];
}

export function StepReview({ formData, subjects }: StepReviewProps) {
    return (
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
                    {formData.minSubmitMinutes > 0 && (
                        <div>
                            <h4 className="font-semibold text-sm text-muted-foreground mb-1">Min. Pengumpulan</h4>
                            <p className="font-medium">{formData.minSubmitMinutes} Menit</p>
                        </div>
                    )}
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
                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">Keamanan</h4>
                    <div className="flex flex-wrap gap-2">
                        {formData.enableLockdown && <Badge variant="secondary">Lockdown Browser</Badge>}
                        {formData.requireToken && <Badge variant="secondary">Token Wajib</Badge>}
                        <Badge variant="secondary">Max Pelanggaran: {formData.maxViolations}</Badge>
                    </div>
                </div>
            </div>
        </div>
    );
}
