import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
    );
}
