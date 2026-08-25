"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, KeyRound, Loader2, CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SessionExpiredDialogProps {
    open: boolean;
    studentUsername?: string;
    studentName?: string;
    onSuccess: () => void;
}

export function SessionExpiredDialog({
    open,
    studentUsername = "",
    studentName = "",
    onSuccess,
}: SessionExpiredDialogProps) {
    const [username, setUsername] = useState(studentUsername);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [ssoLoading, setSsoLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Keep username in sync if prop changes
    useEffect(() => {
        if (studentUsername && !username) {
            setUsername(studentUsername);
        }
    }, [studentUsername, username]);

    // Listen for SSO postMessage from popup window
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "SSO_REAUTH_SUCCESS") {
                setSuccess(true);
                setSsoLoading(false);
                setTimeout(() => {
                    setSuccess(false);
                    onSuccess();
                }, 600);
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [onSuccess]);

    const handleReauth = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetUsername = (username || studentUsername).trim();
        if (!targetUsername || !password) {
            setError("Username dan password wajib diisi");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/auth/reauth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: targetUsername,
                    password,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setPassword("");
                    onSuccess();
                }, 800);
            } else {
                setError(data.error || "Gagal memperbarui sesi. Pastikan password benar.");
            }
        } catch {
            setError("Terjadi kesalahan jaringan. Periksa koneksi internet Anda.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenSsoPopup = () => {
        setSsoLoading(true);
        setError(null);

        const width = 520;
        const height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const portoUrl = "https://porto.sman1campurdarat.sch.id";
        const popup = window.open(
            `${portoUrl}/sso/carta-exam?mode=popup`,
            "PortoCartaSSO",
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=no`
        );

        if (!popup) {
            setSsoLoading(false);
            setError("Popup diblokir oleh browser. Izinkan pop-up atau gunakan input password di bawah.");
            return;
        }

        // Timer to detect if popup closed without completing
        const timer = setInterval(() => {
            if (popup.closed) {
                clearInterval(timer);
                setSsoLoading(false);
            }
        }, 1000);
    };

    return (
        <Dialog open={open} onOpenChange={() => { /* Modal is persistent during session expiry */ }}>
            <DialogContent className="sm:max-w-[460px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader className="text-left space-y-2">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-semibold">
                        <KeyRound className="h-5 w-5 animate-pulse" />
                        <DialogTitle className="text-lg">Sesi Login Berakhir</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                        Halaman ditinggal atau sesi login kedaluwarsa. <strong className="text-foreground font-semibold">Jawaban Anda di layar tetap aman</strong>. Pilih salah satu cara di bawah untuk memulihkan sesi:
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive" className="py-2.5">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="py-2.5 border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <AlertDescription className="text-xs font-medium">Sesi berhasil diperbarui! Melanjutkan ujian...</AlertDescription>
                    </Alert>
                )}

                {/* Option 1: PortoCarta SSO One-Click Re-Auth */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-blue-950 dark:text-blue-200">
                                Pengguna SSO PortoCarta
                            </span>
                        </div>
                    </div>
                    <p className="text-[11.5px] text-blue-800/80 dark:text-blue-300/80 leading-snug">
                        Jika Anda login dari PortoCarta, klik tombol di bawah untuk menyinkronkan kembali sesi otomatis.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenSsoPopup}
                        disabled={ssoLoading || loading || success}
                        className="w-full bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium text-xs shadow-sm h-8"
                    >
                        {ssoLoading ? (
                            <>
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                Menunggu Verifikasi SSO...
                            </>
                        ) : (
                            <>
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                Perbarui via SSO PortoCarta
                            </>
                        )}
                    </Button>
                </div>

                <div className="relative my-1 text-center">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-muted" />
                    </div>
                    <span className="relative bg-background px-2 text-[11px] text-muted-foreground uppercase font-medium">
                        atau masukkan password
                    </span>
                </div>

                {/* Option 2: Direct Password Authentication */}
                <form onSubmit={handleReauth} className="space-y-3.5">
                    <div className="space-y-1">
                        <Label htmlFor="reauth-username" className="text-xs font-medium">
                            NIS / Username
                        </Label>
                        <Input
                            id="reauth-username"
                            type="text"
                            value={username || studentUsername}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Contoh: 12345 atau admin"
                            disabled={loading || success || ssoLoading}
                            className="text-sm h-9"
                            required
                        />
                        {studentName && (
                            <p className="text-[11px] text-muted-foreground">
                                Terdaftar atas nama: <span className="font-medium text-foreground">{studentName}</span>
                            </p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="reauth-password" className="text-xs font-medium">
                                Password
                            </Label>
                            <span className="text-[10.5px] text-muted-foreground">
                                Default SSO: <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono font-semibold">NIS Anda</code>
                            </span>
                        </div>
                        <div className="relative">
                            <Input
                                id="reauth-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Masukkan password (default: NIS)"
                                disabled={loading || success || ssoLoading}
                                className="text-sm pr-9 h-9"
                                autoFocus
                                required
                            />
                            <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                        </div>
                    </div>

                    <DialogFooter className="pt-2 sm:justify-between gap-2 flex-col-reverse sm:flex-row">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground h-8"
                            onClick={() => {
                                window.location.href = "/login";
                            }}
                        >
                            Ke Halaman Login
                        </Button>

                        <Button
                            type="submit"
                            disabled={loading || success || ssoLoading}
                            className="w-full sm:w-auto bg-primary text-primary-foreground font-semibold shadow-sm text-xs h-8 px-4"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    Memverifikasi...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                                    Berhasil!
                                </>
                            ) : (
                                "Perbarui Sesi & Lanjut"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
