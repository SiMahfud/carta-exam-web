import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ExamTemplateFormData } from "../types";

interface StepTargetProps {
    formData: ExamTemplateFormData;
    setFormData: (data: ExamTemplateFormData) => void;
}

export function StepTarget({ formData, setFormData }: StepTargetProps) {
    return (
        <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
                Tentukan siapa saja yang bisa mengakses ujian ini. Default adalah semua siswa.
            </div>

            <div className="space-y-4">
                <Label>Tipe Target</Label>
                <Select
                    value={formData.targetType}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    );
}
