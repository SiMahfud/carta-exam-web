import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Shield, Settings, AlertTriangle } from "lucide-react";
import { ExamTemplateFormData } from "../types";

interface StepConfigurationProps {
    formData: ExamTemplateFormData;
    setFormData: (data: ExamTemplateFormData) => void;
}

export function StepConfiguration({ formData, setFormData }: StepConfigurationProps) {
    const updateViolationSetting = (key: string, value: any) => {
        setFormData({
            ...formData,
            violationSettings: {
                ...formData.violationSettings,
                [key]: value
            }
        });
    };

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

            {/* Violation Detection Settings */}
            {formData.enableLockdown && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <h3 className="font-semibold text-lg">Pengaturan Deteksi Pelanggaran</h3>
                    </div>

                    {/* Violation Mode */}
                    <div className="p-4 border rounded-lg space-y-3">
                        <Label className="text-base">Mode Pelanggaran</Label>
                        <div className="grid gap-2 md:grid-cols-3">
                            {[
                                { value: 'strict', label: 'Ketat', desc: 'Dihitung & terminate jika melebihi batas' },
                                { value: 'lenient', label: 'Toleran', desc: 'Hanya peringatan, tidak terminate' },
                                { value: 'disabled', label: 'Nonaktif', desc: 'Tidak ada deteksi pelanggaran' },
                            ].map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${formData.violationSettings.mode === option.value
                                            ? 'border-primary bg-primary/5'
                                            : 'hover:border-muted-foreground/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="violationMode"
                                            value={option.value}
                                            checked={formData.violationSettings.mode === option.value}
                                            onChange={(e) => updateViolationSetting('mode', e.target.value)}
                                            className="accent-primary"
                                        />
                                        <span className="font-medium">{option.label}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground mt-1">{option.desc}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {formData.violationSettings.mode !== 'disabled' && (
                        <>
                            {/* Detection Types */}
                            <div className="p-4 border rounded-lg space-y-3">
                                <Label className="text-base">Jenis Deteksi</Label>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="detectTabSwitch"
                                            checked={formData.violationSettings.detectTabSwitch}
                                            onCheckedChange={(checked) => updateViolationSetting('detectTabSwitch', checked)}
                                        />
                                        <Label htmlFor="detectTabSwitch" className="cursor-pointer">
                                            Deteksi pindah tab
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="detectCopyPaste"
                                            checked={formData.violationSettings.detectCopyPaste}
                                            onCheckedChange={(checked) => updateViolationSetting('detectCopyPaste', checked)}
                                        />
                                        <Label htmlFor="detectCopyPaste" className="cursor-pointer">
                                            Deteksi copy/paste
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="detectRightClick"
                                            checked={formData.violationSettings.detectRightClick}
                                            onCheckedChange={(checked) => updateViolationSetting('detectRightClick', checked)}
                                        />
                                        <Label htmlFor="detectRightClick" className="cursor-pointer">
                                            Deteksi klik kanan
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="detectScreenshot"
                                            checked={formData.violationSettings.detectScreenshot}
                                            onCheckedChange={(checked) => updateViolationSetting('detectScreenshot', checked)}
                                        />
                                        <Label htmlFor="detectScreenshot" className="cursor-pointer">
                                            Deteksi screenshot
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="detectDevTools"
                                            checked={formData.violationSettings.detectDevTools}
                                            onCheckedChange={(checked) => updateViolationSetting('detectDevTools', checked)}
                                        />
                                        <Label htmlFor="detectDevTools" className="cursor-pointer">
                                            Deteksi DevTools (F12)
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            {/* Cooldown */}
                            <div className="p-4 border rounded-lg space-y-3">
                                <Label className="text-base">Jeda Antar Pelanggaran</Label>
                                <p className="text-sm text-muted-foreground">
                                    Waktu minimal antara pelanggaran sejenis untuk mencegah double-counting.
                                </p>
                                <div className="flex gap-2">
                                    {[3, 5, 10, 15].map((sec) => (
                                        <button
                                            key={sec}
                                            type="button"
                                            onClick={() => updateViolationSetting('cooldownSeconds', sec)}
                                            className={`px-4 py-2 rounded-md border transition-colors ${formData.violationSettings.cooldownSeconds === sec
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'hover:bg-muted'
                                                }`}
                                        >
                                            {sec} detik
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

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
