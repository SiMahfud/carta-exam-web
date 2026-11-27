"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
    Check,
    Copy,
    Download,
    KeyRound,
    Loader2,
    QrCode,
    Save,
    Shield,
    Trash2,
} from "lucide-react";

interface SebAdminState {
    examUrl: string;
    portoCartaUrl: string;
    startPath: string;
    allowSsoPortoCarta: boolean;
    portoAllowedMode: "full_domain" | "sso_only";
    allowQuit: boolean;
    hasQuitPassword: boolean;
    quitURL: string;
    hasCustomExambroPin?: boolean;
    defaultExambroPin?: string;
    enableUrlFilter: boolean;
    sendBrowserExamKey: boolean;
    allowScreenCapture: boolean;
    clearCookiesOnEnd: boolean;
    showTaskBar: boolean;
    showReloadButton: boolean;
    allowPopupsForSso: boolean;
    configKey: string;
    launchUrls: {
        downloadUrl: string;
        sebUrl: string;
        qrUrl: string;
    };
    urlFilterPreview: Array<{ expression: string; action: number }>;
}

export function SebConfigCard() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [quitPassword, setQuitPassword] = useState("");
    const [exambroExitPin, setExambroExitPin] = useState("");
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [qrVersion, setQrVersion] = useState<number>(() => Date.now());
    const [state, setState] = useState<SebAdminState>({
        examUrl: "",
        portoCartaUrl: "",
        startPath: "/login",
        allowSsoPortoCarta: false,
        portoAllowedMode: "full_domain",
        allowQuit: true,
        hasQuitPassword: false,
        quitURL: "",
        hasCustomExambroPin: false,
        defaultExambroPin: "CARTA2026",
        enableUrlFilter: true,
        sendBrowserExamKey: true,
        allowScreenCapture: false,
        clearCookiesOnEnd: true,
        showTaskBar: true,
        showReloadButton: true,
        allowPopupsForSso: true,
        configKey: "",
        launchUrls: {
            downloadUrl: "/api/seb/config",
            sebUrl: "",
            qrUrl: "/api/seb/qr",
        },
        urlFilterPreview: [],
    });

    const loadConfig = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/seb-config");
            const data = await res.json();
            if (res.ok && data.success && data.data) {
                setState(data.data);
            }
        } catch (err) {
            console.error("Failed to fetch SEB config:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const saveConfig = async (override?: { clearQuitPassword?: boolean; resetExambroExitPin?: boolean }) => {
        setSaving(true);
        try {
            const payload = {
                examUrl: state.examUrl,
                portoCartaUrl: state.portoCartaUrl,
                startPath: state.startPath,
                allowSsoPortoCarta: state.allowSsoPortoCarta,
                portoAllowedMode: state.portoAllowedMode,
                allowQuit: state.allowQuit,
                quitPassword: quitPassword.trim() || undefined,
                clearQuitPassword: override?.clearQuitPassword || false,
                quitURL: state.quitURL,
                exambroExitPin: exambroExitPin.trim() || undefined,
                resetExambroExitPin: override?.resetExambroExitPin || false,
                enableUrlFilter: state.enableUrlFilter,
                sendBrowserExamKey: state.sendBrowserExamKey,
                allowScreenCapture: state.allowScreenCapture,
                clearCookiesOnEnd: state.clearCookiesOnEnd,
                showTaskBar: state.showTaskBar,
                showReloadButton: state.showReloadButton,
                allowPopupsForSso: state.allowPopupsForSso,
            };

            const res = await fetch("/api/admin/seb-config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok && data.success && data.data) {
                setState(data.data);
                setQuitPassword("");
                setExambroExitPin("");
                setQrVersion(Date.now());
                toast({
                    title: "Konfigurasi SEB Disimpan",
                    description: "File .seb dan QR Code otomatis diperbarui.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Gagal Menyimpan",
                    description: data.error || "Periksa kembali input URL SEB.",
                });
            }
        } catch (err) {
            console.error("Error saving SEB config:", err);
            toast({
                variant: "destructive",
                title: "Gagal Menghubungi Server",
                description: "Terjadi kesalahan jaringan saat menyimpan konfigurasi SEB.",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = async (text: string, fieldName: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            toast({
                variant: "destructive",
                title: "Gagal Menyalin",
                description: "Salin teks secara manual.",
            });
        }
    };

    return (
        <Card className="border shadow-sm bg-card">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Shield className="h-5 w-5 text-indigo-500" />
                                Generator Safe Exam Browser (SEB) iOS & Desktop
                            </CardTitle>
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border-indigo-200">
                                SSO PortoCarta (Opsi A)
                            </Badge>
                        </div>
                        <CardDescription className="text-xs">
                            Hasilkan file <code>.seb</code>, tautan <code>sebs://</code>, dan QR Code siap scan untuk iPhone, iPad, Windows, dan Mac dengan dukungan redirect SSO PortoCarta.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                            <a href="/api/seb/config" download="cartaexam.seb">
                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                Unduh .seb
                            </a>
                        </Button>
                        <Button
                            onClick={() => saveConfig()}
                            disabled={saving || loading}
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                        >
                            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                            Simpan Konfigurasi
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Memuat konfigurasi SEB...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Form Konfigurasi */}
                        <div className="lg:col-span-2 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="seb-exam-url" className="text-xs font-medium">URL CartaExam (Start URL Base)</Label>
                                    <Input
                                        id="seb-exam-url"
                                        value={state.examUrl}
                                        onChange={(e) => setState({ ...state, examUrl: e.target.value })}
                                        placeholder="https://exam.sekolahanda.sch.id"
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="seb-porto-url" className="text-xs font-medium">URL PortoCarta (SSO Hub, Opsional)</Label>
                                    <Input
                                        id="seb-porto-url"
                                        value={state.portoCartaUrl}
                                        onChange={(e) => setState({ ...state, portoCartaUrl: e.target.value })}
                                        placeholder="https://porto.sekolahanda.sch.id (kosongkan jika standalone)"
                                        className="text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="seb-start-path" className="text-xs font-medium">Path Halaman Awal</Label>
                                    <Input
                                        id="seb-start-path"
                                        value={state.startPath}
                                        onChange={(e) => setState({ ...state, startPath: e.target.value })}
                                        placeholder="/login"
                                        className="text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="seb-quit-password" className="text-xs font-medium flex items-center gap-1.5">
                                            <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                                            Quit Password SEB
                                        </Label>
                                        {state.hasQuitPassword && (
                                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                Aktif (Tersimpan SHA-256)
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            id="seb-quit-password"
                                            type="password"
                                            value={quitPassword}
                                            onChange={(e) => setQuitPassword(e.target.value)}
                                            placeholder={state.hasQuitPassword ? "Isi untuk ganti password keluar" : "Opsional: password keluar pengawas"}
                                            className="text-sm"
                                        />
                                        {state.hasQuitPassword && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                title="Hapus Quit Password"
                                                onClick={() => saveConfig({ clearQuitPassword: true })}
                                                disabled={saving}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                    {!state.hasQuitPassword && (
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                            Disarankan mengisi Quit Password SEB agar siswa tidak bisa keluar paksa (Ctrl+Q) saat ujian berlangsung, sedangkan keluar mandiri dari dashboard tetap berfungsi via Quit URL.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="seb-quit-url" className="text-xs font-medium">
                                        Quit URL SEB (Keluar Mandiri Sebelum/Sesudah Ujian)
                                    </Label>
                                    <Input
                                        id="seb-quit-url"
                                        value={state.quitURL}
                                        onChange={(e) => setState({ ...state, quitURL: e.target.value })}
                                        placeholder="https://exam.sekolahanda.sch.id/seb-quit"
                                        className="text-sm font-mono"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Halaman ini memicu tombol &quot;Keluar dari SEB&quot; di login/dashboard menutup SEB tanpa password.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label htmlFor="exambro-exit-pin" className="text-xs font-medium flex items-center gap-1.5">
                                            <KeyRound className="h-3.5 w-3.5 text-indigo-500" />
                                            PIN / Password Keluar Darurat CartaExambro
                                        </Label>
                                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                            {state.hasCustomExambroPin ? "Kustom Aktif" : `Default (${state.defaultExambroPin || "CARTA2026"})`}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            id="exambro-exit-pin"
                                            type="password"
                                            value={exambroExitPin}
                                            onChange={(e) => setExambroExitPin(e.target.value)}
                                            placeholder="Isi PIN/password baru pengawas (min. 4 karakter)"
                                            className="text-sm"
                                        />
                                        {state.hasCustomExambroPin && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                title="Reset ke PIN default CARTA2026"
                                                onClick={() => saveConfig({ resetExambroExitPin: true })}
                                                disabled={saving}
                                            >
                                                Reset
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Diminta saat tombol Keluar/Back ditekan di CartaExambro ketika ujian sedang aktif.
                                    </p>
                                </div>
                            </div>

                            {/* Opsi A SSO & URL Filter */}
                            <div className="rounded-xl border p-4 space-y-4 bg-muted/20">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">Izinkan SSO PortoCarta (Opsi A)</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Masukkan domain PortoCarta ke whitelist SEB agar tombol &quot;Masuk dengan Akun PortoCarta&quot; dapat berjalan lancar.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={state.allowSsoPortoCarta}
                                        onCheckedChange={(checked) => setState({ ...state, allowSsoPortoCarta: checked })}
                                    />
                                </div>

                                {state.allowSsoPortoCarta && (
                                    <div className="space-y-1.5 pt-2 border-t">
                                        <Label className="text-xs font-medium">Cakupan Whitelist URL PortoCarta</Label>
                                        <Select
                                            value={state.portoAllowedMode}
                                            onValueChange={(value: "full_domain" | "sso_only") =>
                                                setState({ ...state, portoAllowedMode: value })
                                            }
                                        >
                                            <SelectTrigger className="text-xs h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="full_domain">
                                                    Seluruh domain PortoCarta (porto.*/*) — Paling stabil untuk login & asset
                                                </SelectItem>
                                                <SelectItem value="sso_only">
                                                    Hanya jalur SSO &amp; Login (/login, /auth, /apps/launch/carta-exam, /_next)
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <Label className="text-xs font-medium">Aktifkan URL Filter</Label>
                                            <p className="text-[11px] text-muted-foreground">Blokir semua situs lain</p>
                                        </div>
                                        <Switch
                                            checked={state.enableUrlFilter}
                                            onCheckedChange={(checked) => setState({ ...state, enableUrlFilter: checked })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <Label className="text-xs font-medium">Blokir Rekam/Share Layar</Label>
                                            <p className="text-[11px] text-muted-foreground">Screen share, Mirroring, PrtScn</p>
                                        </div>
                                        <Switch
                                            checked={!state.allowScreenCapture}
                                            onCheckedChange={(checked) => setState({ ...state, allowScreenCapture: !checked })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <Label className="text-xs font-medium">Hapus Cookie Saat Keluar</Label>
                                            <p className="text-[11px] text-muted-foreground">Aman untuk perangkat sekolah</p>
                                        </div>
                                        <Switch
                                            checked={state.clearCookiesOnEnd}
                                            onCheckedChange={(checked) => setState({ ...state, clearCookiesOnEnd: checked })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <Label className="text-xs font-medium">Izinkan Pop-up SSO Re-Auth</Label>
                                            <p className="text-[11px] text-muted-foreground">Untuk pemulihan sesi ujian</p>
                                        </div>
                                        <Switch
                                            checked={state.allowPopupsForSso}
                                            onCheckedChange={(checked) => setState({ ...state, allowPopupsForSso: checked })}
                                        />
                                    </div>
                                </div>

                                {state.urlFilterPreview.length > 0 && (
                                    <div className="pt-2 border-t space-y-1.5">
                                        <span className="text-[11px] font-medium text-muted-foreground block">
                                            Aturan URL Filter Aktif:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {state.urlFilterPreview.map((rule, idx) => (
                                                <Badge key={`${rule.expression}-${idx}`} variant="secondary" className="font-mono text-[11px]">
                                                    {rule.expression}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* QR Code & Link Distribusi Siswa */}
                        <div className="rounded-xl border p-4 bg-muted/30 flex flex-col items-center justify-between gap-4">
                            <div className="w-full space-y-1 text-center">
                                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                    <QrCode className="h-4 w-4 text-indigo-500" />
                                    QR Code Peluncuran SEB
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Siswa iPhone/iPad cukup scan dari Kamera bawaan atau aplikasi SEB.
                                </p>
                            </div>

                            <div className="bg-white p-3 rounded-xl border shadow-xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`/api/seb/qr?v=${qrVersion}`}
                                    alt="QR Code SEB CartaExam"
                                    className="w-44 h-44"
                                />
                            </div>

                            <div className="w-full space-y-2.5">
                                <div className="space-y-1">
                                    <span className="text-[11px] font-medium text-muted-foreground">Tautan Peluncuran (sebs://)</span>
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            readOnly
                                            value={state.launchUrls.sebUrl}
                                            className="font-mono text-[11px] h-8 bg-background"
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 shrink-0"
                                            onClick={() => handleCopy(state.launchUrls.sebUrl, "sebUrl")}
                                        >
                                            {copiedField === "sebUrl" ? (
                                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-[11px] font-medium text-muted-foreground">SEB Config Key (SHA-256)</span>
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            readOnly
                                            value={state.configKey}
                                            className="font-mono text-[10px] h-8 bg-background"
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 shrink-0"
                                            onClick={() => handleCopy(state.configKey, "configKey")}
                                        >
                                            {copiedField === "configKey" ? (
                                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                        <a href="/api/seb/qr?format=png" download="cartaexam-seb-qr.png">
                                            <Download className="h-3.5 w-3.5 mr-1" />
                                            QR PNG
                                        </a>
                                    </Button>
                                    <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                        <a href="/api/seb/config" download="cartaexam.seb">
                                            <Download className="h-3.5 w-3.5 mr-1" />
                                            File .seb
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
