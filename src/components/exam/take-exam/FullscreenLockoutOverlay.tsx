"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Maximize2, AlertTriangle, Smartphone, Loader2, Clock, Sparkles } from "lucide-react";

interface FullscreenLockoutOverlayProps {
    isOpen: boolean;
    reason?: "FULLSCREEN_EXIT" | "SPLIT_SCREEN" | "FLOATING_WINDOW" | string;
    details?: string;
    graceSecondsRemaining?: number;
    onRestoreFullscreen: () => Promise<{ success: boolean; message?: string }>;
}

export function FullscreenLockoutOverlay({
    isOpen,
    reason = "FULLSCREEN_EXIT",
    details,
    graceSecondsRemaining,
    onRestoreFullscreen,
}: FullscreenLockoutOverlayProps) {
    const [restoring, setRestoring] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleRestore = async (e?: React.MouseEvent | React.TouchEvent) => {
        if (e) {
            e.stopPropagation();
        }
        if (restoring) return;

        setRestoring(true);
        setErrorMessage(null);
        try {
            const res = await onRestoreFullscreen();
            if (!res.success) {
                setErrorMessage(res.message || "Gagal masuk mode layar penuh. Pastikan layar tidak terbelah.");
            }
        } catch (err) {
            console.error("Restore fullscreen error:", err);
            setErrorMessage("Terjadi kesalahan saat memulihkan layar penuh.");
        } finally {
            setRestoring(false);
        }
    };

    const isSplit = reason === "SPLIT_SCREEN";
    const isFloating = reason === "FLOATING_WINDOW";
    const isFullscreenExit = reason === "FULLSCREEN_EXIT" || (!isSplit && !isFloating);
    const isGracePeriod = isFullscreenExit && graceSecondsRemaining !== undefined && graceSecondsRemaining > 0;

    return (
        <div
            className="fixed inset-0 z-[99999] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none animate-in fade-in duration-200 cursor-pointer"
            role="alertdialog"
            aria-modal="true"
            onClick={handleRestore}
        >
            {/* Quick helper banner on top */}
            <div className="absolute top-4 sm:top-6 px-4 py-2 rounded-full bg-muted/80 border text-xs sm:text-sm text-muted-foreground shadow-sm flex items-center gap-2 pointer-events-none animate-pulse">
                <span>👆</span>
                <span>Ketuk di mana saja pada layar untuk langsung kembali ke ujian</span>
            </div>

            <div
                className={`max-w-md w-full bg-card border-2 shadow-2xl rounded-2xl p-6 sm:p-8 space-y-5 transition-all ${
                    isGracePeriod
                        ? "border-amber-500/50 shadow-amber-500/10"
                        : "border-destructive/40 shadow-destructive/10"
                }`}
                onClick={(e) => {
                    // Clicking inside the card also triggers handleRestore
                    handleRestore(e);
                }}
            >
                {/* Warning Icon with pulsating ring */}
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                    <div
                        className={`absolute inset-0 rounded-full animate-ping opacity-60 ${
                            isGracePeriod ? "bg-amber-500/20" : "bg-destructive/20"
                        }`}
                    />
                    <div
                        className={`relative w-16 h-16 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
                            isGracePeriod
                                ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                                : "bg-destructive/10 border-destructive text-destructive"
                        }`}
                    >
                        {isSplit ? (
                            <Smartphone className="w-8 h-8 animate-bounce" />
                        ) : isGracePeriod ? (
                            <Clock className="w-8 h-8 animate-pulse text-amber-500" />
                        ) : (
                            <ShieldAlert className="w-8 h-8 animate-pulse" />
                        )}
                    </div>
                </div>

                {/* Title and Descriptions */}
                <div className="space-y-2.5">
                    {isGracePeriod ? (
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            Toleransi: {graceSecondsRemaining} Detik Tersisa
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/15 text-destructive font-semibold text-xs uppercase tracking-wider">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {isSplit || isFloating ? "Akses Ujian Dikunci" : "Pelanggaran Dicatat"}
                        </div>
                    )}

                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                        {isSplit
                            ? "Layar Terbelah (Split Screen) Terdeteksi!"
                            : isFloating
                            ? "Jendela Mengambang Terdeteksi!"
                            : isGracePeriod
                            ? "Layar Penuh Terhenti (Tidak Sengaja?)"
                            : "Mode Layar Penuh Terhenti!"}
                    </h2>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {isSplit
                            ? "Ujian wajib dikerjakan dalam satu layar penuh utuh tanpa aplikasi lain. Harap tutup/geser aplikasi sebelah hingga CartaExam memenuhi layar ponsel."
                            : isFloating
                            ? "Aplikasi mengambang (pop-up window) atau aplikasi luar terdeteksi aktif. Harap tutup semua aplikasi luar sebelum melanjutkan."
                            : isGracePeriod
                            ? "Jangan panik! Jika tidak sengaja menekan tombol kembali, segera ketuk layar untuk kembali ke layar penuh tanpa tercatat sebagai pelanggaran."
                            : "Batas toleransi telah habis. Keluar dari layar penuh telah dicatat dalam log ujian. Harap segera kembali ke mode layar penuh untuk melanjutkan."}
                    </p>

                    {/* Informative Tap-to-recover instruction box */}
                    <div
                        className={`p-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center gap-2.5 text-left ${
                            isGracePeriod
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                                : "bg-destructive/10 border-destructive/30 text-destructive"
                        }`}
                    >
                        {isGracePeriod ? (
                            <Sparkles className="w-5 h-5 shrink-0 text-amber-500" />
                        ) : (
                            <Maximize2 className="w-5 h-5 shrink-0" />
                        )}
                        <span>
                            {isGracePeriod ? (
                                <>
                                    <strong>Ketuk di mana saja pada layar ini</strong> sekarang untuk kembali ke mode layar penuh.
                                </>
                            ) : (
                                <>
                                    <strong>Ketuk di mana saja pada layar</strong> untuk langsung mengembalikan mode layar penuh.
                                </>
                            )}
                        </span>
                    </div>

                    {details && (
                        <p className="text-xs font-mono text-muted-foreground/80 bg-muted/50 p-2 rounded border text-left">
                            {details}
                        </p>
                    )}
                </div>

                {/* Error prompt if restore failed */}
                {errorMessage && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium text-left">
                        ⚠️ {errorMessage}
                    </div>
                )}

                {/* Action Button */}
                <div className="space-y-2 pt-1">
                    <Button
                        size="lg"
                        variant={isGracePeriod ? "default" : "destructive"}
                        className={`w-full font-bold text-base py-6 shadow-lg cursor-pointer transition-all active:scale-95 ${
                            isGracePeriod
                                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25"
                                : "shadow-destructive/25"
                        }`}
                        onClick={handleRestore}
                        disabled={restoring}
                    >
                        {restoring ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Memulihkan Layar Penuh...
                            </>
                        ) : isGracePeriod ? (
                            <>
                                <Maximize2 className="w-5 h-5 mr-2" />
                                Ketuk untuk Kembali Sekarang ({graceSecondsRemaining}s)
                            </>
                        ) : (
                            <>
                                <Maximize2 className="w-5 h-5 mr-2" />
                                {isSplit ? "Saya Sudah Menutup Split Screen" : "Kembalikan ke Layar Penuh"}
                            </>
                        )}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                        {isGracePeriod
                            ? "Kembali sebelum toleransi habis agar tidak tercatat sebagai pelanggaran."
                            : "Tindakan ini dicatat dalam log pengawasan ujian."}
                    </p>
                </div>
            </div>
        </div>
    );
}
