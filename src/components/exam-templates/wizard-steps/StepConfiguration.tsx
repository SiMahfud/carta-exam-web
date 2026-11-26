import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Shield, Settings, AlertTriangle, Camera } from "lucide-react";
import { ExamTemplateFormData, ExambroScreenshotSettings } from "../types";

const DEFAULT_EXAMBRO_SCREENSHOT_SETTINGS: ExambroScreenshotSettings = {
    enabled: true,
    burstCount: 3,
    firstDelayMs: 0,
    followUpIntervalSeconds: 2,
    targetTypes: ['APP_SWITCH', 'WINDOW_BLUR', 'SPLIT_SCREEN', 'PIP_MODE', 'OVERLAY_DETECTED'],
};

const MULTI_SCREENSHOT_VIOLATION_OPTIONS = [
    { type: 'APP_SWITCH', label: 'Keluar / Pindah Aplikasi' },
    { type: 'WINDOW_BLUR', label: 'Kehilangan Fokus / Popup Assistant' },
    { type: 'OVERLAY_DETECTED', label: 'Layar Tertutup Overlay / Floating App' },
    { type: 'SPLIT_SCREEN', label: 'Layar Terbelah (Split Screen)' },
    { type: 'PIP_MODE', label: 'Picture-in-Picture (PiP)' },
    { type: 'MICROPHONE_IN_USE', label: 'Mikrofon Dipakai Aplikasi Lain' },
];

interface StepConfigurationProps {
    formData: ExamTemplateFormData;
    setFormData: (data: ExamTemplateFormData) => void;
}

export function StepConfiguration({ formData, setFormData }: StepConfigurationProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateViolationSetting = (key: string, value: any) => {
        setFormData({
            ...formData,
            violationSettings: {
                ...formData.violationSettings,
                [key]: value
            }
        });
    };

    const screenshotConfig: ExambroScreenshotSettings = {
        ...DEFAULT_EXAMBRO_SCREENSHOT_SETTINGS,
        ...(formData.violationSettings.exambroScreenshotCapture || {}),
    };

    const updateScreenshotSetting = <K extends keyof ExambroScreenshotSettings>(
        key: K,
        value: ExambroScreenshotSettings[K]
    ) => {
        updateViolationSetting('exambroScreenshotCapture', {
            ...screenshotConfig,
            [key]: value,
        });
    };

    const toggleMultiScreenshotType = (type: string, checked: boolean) => {
        const nextTypes = checked
            ? Array.from(new Set([...screenshotConfig.targetTypes, type]))
            : screenshotConfig.targetTypes.filter((t) => t !== type);
        updateScreenshotSetting('targetTypes', nextTypes);
    };

    return (
        <div className="space-y-8">
            {/* Timing */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                    <Clock className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Waktu &amp; Skor</h3>
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
                        <Label htmlFor="minSubmit">Waktu Minimum Pengumpulan (Menit)</Label>
                        <Input
                            id="minSubmit"
                            type="number"
                            min="0"
                            max={formData.durationMinutes}
                            value={formData.minSubmitMinutes}
                            onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                setFormData({ ...formData, minSubmitMinutes: Math.min(value, formData.durationMinutes) });
                            }}
                        />
                        <p className="text-xs text-muted-foreground">
                            Siswa hanya bisa mengumpulkan ujian setelah waktu ini. Isi 0 untuk tanpa batasan.
                        </p>
                    </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
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
                            <Label className="text-base">Kunci 1 Perangkat (Device Binding)</Label>
                            <p className="text-sm text-muted-foreground">
                                Batasi siswa hanya dapat mengakses ujian dari 1 perangkat yang pertama kali digunakan.
                            </p>
                        </div>
                        <Switch
                            checked={formData.violationSettings.deviceBinding ?? false}
                            onCheckedChange={(checked) => updateViolationSetting('deviceBinding', checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="text-base">Wajibkan Safe Exam Browser (SEB)</Label>
                            <p className="text-sm text-muted-foreground">
                                Hanya izinkan pengerjaan melalui aplikasi Safe Exam Browser (PC/Mac/iPhone/iPad).
                            </p>
                        </div>
                        <Switch
                            checked={formData.violationSettings.requireSeb ?? false}
                            onCheckedChange={(checked) => updateViolationSetting('requireSeb', checked)}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="text-base">Wajibkan Aplikasi Exambro (Android)</Label>
                            <p className="text-sm text-muted-foreground">
                                Wajibkan aplikasi Exambro resmi untuk pengerjaan ujian di perangkat Android.
                            </p>
                        </div>
                        <Switch
                            checked={formData.violationSettings.requireExambro ?? false}
                            onCheckedChange={(checked) => updateViolationSetting('requireExambro', checked)}
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
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="watermarkAntiTamper"
                                            checked={formData.violationSettings.watermarkAntiTamper ?? true}
                                            onCheckedChange={(checked) => updateViolationSetting('watermarkAntiTamper', checked)}
                                        />
                                        <Label htmlFor="watermarkAntiTamper" className="cursor-pointer">
                                            Anti-Tamper Watermark Layar
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

                            {/* Max Away Timeout */}
                            <div className="p-4 border rounded-lg space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Batas Waktu Keluar Ujian (Auto-Block)</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Jika siswa meninggalkan halaman ujian (minimize, beralih tab/aplikasi) melebihi batas waktu ini, ujian langsung dihentikan dan diblokir otomatis.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Input
                                            type="number"
                                            min="5"
                                            max="300"
                                            className="w-24 text-right"
                                            value={formData.violationSettings.maxAwaySeconds ?? 15}
                                            onChange={(e) => updateViolationSetting('maxAwaySeconds', Math.max(5, parseInt(e.target.value) || 15))}
                                        />
                                        <span className="text-sm text-muted-foreground font-medium">detik</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {[10, 15, 20, 30].map((sec) => (
                                        <button
                                            key={sec}
                                            type="button"
                                            onClick={() => updateViolationSetting('maxAwaySeconds', sec)}
                                            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                                                (formData.violationSettings.maxAwaySeconds ?? 15) === sec
                                                    ? 'bg-primary text-primary-foreground border-primary font-medium'
                                                    : 'hover:bg-muted'
                                            }`}
                                        >
                                            {sec} detik {sec === 15 ? '(Default)' : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Late Entry Tolerance */}
                            <div className="p-4 border rounded-lg space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Label className="text-base font-semibold">Batas Keterlambatan Masuk (Auto-Block)</Label>
                                            <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">Anti-Bocoran</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Kunci otomatis akses bagi siswa yang belum memulai ujian setelah sekian menit sejak sesi dibuka. Mencegah siswa menunda masuk untuk mencari jawaban di browser. Isi 0 untuk menonaktifkan batasan.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Input
                                            type="number"
                                            min="0"
                                            max="120"
                                            className="w-24 text-right"
                                            value={formData.violationSettings.lateToleranceMinutes ?? 10}
                                            onChange={(e) => updateViolationSetting('lateToleranceMinutes', Math.max(0, parseInt(e.target.value) || 0))}
                                        />
                                        <span className="text-sm text-muted-foreground font-medium">menit</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {[
                                        { val: 0, label: "Nonaktif (Bebas)" },
                                        { val: 5, label: "5 menit" },
                                        { val: 10, label: "10 menit (Standar)" },
                                        { val: 15, label: "15 menit" },
                                        { val: 30, label: "30 menit" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.val}
                                            type="button"
                                            onClick={() => updateViolationSetting('lateToleranceMinutes', opt.val)}
                                            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                                                (formData.violationSettings.lateToleranceMinutes ?? 10) === opt.val
                                                    ? 'bg-primary text-primary-foreground border-primary font-medium'
                                                    : 'hover:bg-muted'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Exambro Screenshot Capture Settings */}
                            <div className="p-4 border rounded-lg space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Camera className="h-4 w-4 text-primary" />
                                            <Label className="text-base font-semibold">Bukti Screenshot CartaExambro (Android)</Label>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Ambil tangkapan seluruh layar saat pelanggaran terdeteksi. Untuk pelanggaran tertentu, foto lanjutan diambil otomatis selama pelanggaran masih berlangsung (dibatalkan jika siswa segera kembali).
                                        </p>
                                    </div>
                                    <Switch
                                        checked={screenshotConfig.enabled}
                                        onCheckedChange={(checked) => updateScreenshotSetting('enabled', checked)}
                                    />
                                </div>

                                {screenshotConfig.enabled && (
                                    <div className="space-y-4 pt-2 border-t">
                                        <div className="grid gap-4 md:grid-cols-3">
                                            {/* Burst Count */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                                    Maksimal Foto / Kejadian
                                                </Label>
                                                <div className="flex gap-1.5">
                                                    {[
                                                        { val: 1, label: '1 Foto' },
                                                        { val: 2, label: '2 Foto' },
                                                        { val: 3, label: '3 Foto' },
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.val}
                                                            type="button"
                                                            onClick={() => updateScreenshotSetting('burstCount', opt.val)}
                                                            className={`flex-1 px-2.5 py-2 text-xs rounded-md border transition-colors ${screenshotConfig.burstCount === opt.val
                                                                ? 'bg-primary text-primary-foreground border-primary font-medium'
                                                                : 'hover:bg-muted'
                                                                }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* First Delay */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                                    Delay Foto Pertama
                                                </Label>
                                                <div className="flex gap-1.5">
                                                    {[
                                                        { val: 0, label: '0 dtk (Langsung)' },
                                                        { val: 1000, label: '1 dtk' },
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.val}
                                                            type="button"
                                                            onClick={() => updateScreenshotSetting('firstDelayMs', opt.val)}
                                                            className={`flex-1 px-2.5 py-2 text-xs rounded-md border transition-colors ${screenshotConfig.firstDelayMs === opt.val
                                                                ? 'bg-primary text-primary-foreground border-primary font-medium'
                                                                : 'hover:bg-muted'
                                                                }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Follow-up Interval */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                                    Jeda Foto Lanjutan
                                                </Label>
                                                <div className="flex gap-1.5">
                                                    {[1, 2, 3].map((sec) => (
                                                        <button
                                                            key={sec}
                                                            type="button"
                                                            disabled={screenshotConfig.burstCount <= 1}
                                                            onClick={() => updateScreenshotSetting('followUpIntervalSeconds', sec)}
                                                            className={`flex-1 px-2.5 py-2 text-xs rounded-md border transition-colors disabled:opacity-40 ${screenshotConfig.followUpIntervalSeconds === sec
                                                                ? 'bg-primary text-primary-foreground border-primary font-medium'
                                                                : 'hover:bg-muted'
                                                                }`}
                                                        >
                                                            {sec} dtk
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {screenshotConfig.burstCount > 1 && (
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                                    Jenis Pelanggaran yang Menggunakan Multi-Screenshot ({screenshotConfig.burstCount} Foto Beruntun)
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Pelanggaran yang tidak dicentang tetap mengambil 1 screenshot awal. Jika siswa kembali ke ujian sebelum jeda selesai (misal unblur &lt; {screenshotConfig.followUpIntervalSeconds} detik), foto lanjutan otomatis dibatalkan.
                                                </p>
                                                <div className="grid gap-2.5 md:grid-cols-2 pt-1">
                                                    {MULTI_SCREENSHOT_VIOLATION_OPTIONS.map((item) => (
                                                        <div key={item.type} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`multi-ss-${item.type}`}
                                                                checked={screenshotConfig.targetTypes.includes(item.type)}
                                                                onCheckedChange={(checked) =>
                                                                    toggleMultiScreenshotType(item.type, checked === true)
                                                                }
                                                            />
                                                            <Label htmlFor={`multi-ss-${item.type}`} className="text-sm cursor-pointer">
                                                                {item.label}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="showResult"
                            checked={formData.displaySettings.showResultImmediately}
                            onCheckedChange={(checked) => setFormData({
                                ...formData,
                                displaySettings: { ...formData.displaySettings, showResultImmediately: checked as boolean }
                            })}
                        />
                        <Label htmlFor="showResult">Tampilkan Nilai Segera Setelah Selesai</Label>
                    </div>
                </div>
            </div>
        </div>
    );
}
