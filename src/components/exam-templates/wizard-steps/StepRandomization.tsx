import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ExamTemplateFormData } from "../types";

interface StepRandomizationProps {
    formData: ExamTemplateFormData;
    setFormData: (data: ExamTemplateFormData) => void;
}

export function StepRandomization({ formData, setFormData }: StepRandomizationProps) {
    return (
        <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
                Atur cara soal diacak untuk setiap siswa. Pengacakan membuat soal lebih aman.
            </div>

            <div className="space-y-4">
                <Label>Mode Pengacakan Soal</Label>
                <Select
                    value={formData.randomizationRules.mode}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onValueChange={(value: any) => setFormData({
                        ...formData,
                        randomizeQuestions: true,
                        randomizationRules: { ...formData.randomizationRules, mode: value }
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
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    checked={formData.randomizationRules.types?.includes(type.value as any) || false}
                                    onCheckedChange={(checked) => {
                                        const current = formData.randomizationRules.types || [];
                                        const updated = checked
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            ? [...current, type.value as any]
                                            : current.filter(t => t !== type.value);
                                        setFormData({
                                            ...formData,
                                            randomizeQuestions: true,
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
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    checked={formData.randomizationRules.excludeTypes?.includes(type.value as any) || false}
                                    onCheckedChange={(checked) => {
                                        const current = formData.randomizationRules.excludeTypes || [];
                                        const updated = checked
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            ? [...current, type.value as any]
                                            : current.filter(t => t !== type.value);
                                        setFormData({
                                            ...formData,
                                            randomizeQuestions: true,
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
                                randomizeQuestions: true,
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

            {/* Pengacakan Pilihan Jawaban */}
            <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label>Acak Pilihan Jawaban</Label>
                        <p className="text-xs text-muted-foreground">
                            Mengacak urutan pilihan A, B, C, D untuk soal pilihan ganda dan kompleks
                        </p>
                    </div>
                    <Switch
                        checked={formData.randomizationRules.shuffleAnswers || false}
                        onCheckedChange={(checked) => setFormData({
                            ...formData,
                            randomizeAnswers: checked,
                            randomizationRules: {
                                ...formData.randomizationRules,
                                shuffleAnswers: checked
                            }
                        })}
                    />
                </div>
            </div>

            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                    💡 Tip: Acak semua soal kecuali esai agar esai tetap di akhir.
                </p>
            </div>
        </div>
    );
}

