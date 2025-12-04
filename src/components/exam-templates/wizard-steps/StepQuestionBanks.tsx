import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExamTemplateFormData, QuestionBank } from "../types";

interface StepQuestionBanksProps {
    formData: ExamTemplateFormData;
    setFormData: (data: ExamTemplateFormData) => void;
    questionBanks: QuestionBank[];
}

export function StepQuestionBanks({ formData, setFormData, questionBanks }: StepQuestionBanksProps) {
    return (
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
    );
}
