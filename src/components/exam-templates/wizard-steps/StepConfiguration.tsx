import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Shield, Settings } from "lucide-react";
import { ExamTemplateFormData } from "../types";

interface StepConfigurationProps {
    formData: ExamTemplateFormData;
    setFormData: (data: ExamTemplateFormData) => void;
}

export function StepConfiguration({ formData, setFormData }: StepConfigurationProps) {
    return (
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
    );
}
