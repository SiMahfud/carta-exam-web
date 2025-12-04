import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExamTemplateFormData } from "../types";

interface StepCompositionProps {
    formData: ExamTemplateFormData;
    setFormData: (data: ExamTemplateFormData) => void;
}

export function StepComposition({ formData, setFormData }: StepCompositionProps) {
    return (
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
    );
}
