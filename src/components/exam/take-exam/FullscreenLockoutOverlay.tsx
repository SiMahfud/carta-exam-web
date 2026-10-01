"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Maximize2, AlertTriangle, Smartphone, Loader2 } from "lucide-react";

interface FullscreenLockoutOverlayProps {
    isOpen: boolean;
    reason?: "FULLSCREEN_EXIT" | "SPLIT_SCREEN" | "FLOATING_WINDOW" | string;
    details?: string;
    onRestoreFullscreen: () => Promise<{ success: boolean; message?: string }>;
}

export function FullscreenLockoutOverlay({
    isOpen,
    reason = "FULLSCREEN_EXIT",
    details,
    onRestoreFullscreen,
}: FullscreenLockoutOverlayProps) {
    const [restoring, setRestoring] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleRestore = async () => {
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

    return (
        <div
            className="fixed inset-0 z-[99999] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200"
            role="alertdialog"
            aria-modal="true"
        >
            <div className="max-w-md w-full bg-card border-2 border-destructive/40 shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6">
                {/* Warning Icon with pulsating ring */}
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping opacity-60" />
                    <div className="relative w-16 h-16 rounded-full bg-destructive/10 border-2 border-destructive text-destructive flex items-center justify-center shadow-lg">
                        {isSplit ? (
                            <Smartphone className="w-8 h-8 animate-bounce" />
                        ) : (
                            <ShieldAlert className="w-8 h-8 animate-pulse" />
                        )}
                    </div>
                </div>

                {/* Title and Descriptions */}
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/15 text-destructive font-semibold text-xs uppercase tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Akses Ujian Dikunci
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                        {isSplit
                            ? "Layar Terbelah (Split Screen) Terdeteksi!"
                            : isFloating
                            ? "Jendela Mengambang Terdeteksi!"
                            : "Mode Layar Penuh Terhenti!"}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {isSplit
                            ? "Ujian wajib dikerjakan dalam satu layar penuh utuh tanpa aplikasi lain. Harap tutup/geser aplikasi sebelah hingga CartaExam memenuhi layar ponsel."
                            : isFloating
                            ? "Aplikasi mengambang (pop-up window) atau aplikasi luar terdeteksi aktif. Harap tutup semua aplikasi luar sebelum melanjutkan."
                            : "Anda keluar dari mode layar penuh. Selama ujian berlangsung, Anda dilarang keluar dari layar penuh atau membuka menu lain."}
                    </p>
                    {details && (
                        <p className="text-xs font-mono text-muted-foreground/80 bg-muted/50 p-2 rounded border">
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

                {/* Restore Fullscreen Action Button */}
                <div className="space-y-2 pt-2">
                    <Button
                        size="lg"
                        variant="destructive"
                        className="w-full font-bold text-base py-6 shadow-lg shadow-destructive/25 cursor-pointer"
                        onClick={handleRestore}
                        disabled={restoring}
                    >
                        {restoring ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Memeriksa Layar...
                            </>
                        ) : (
                            <>
                                <Maximize2 className="w-5 h-5 mr-2" />
                                {isSplit ? "Saya Sudah Menutup Split Screen" : "Kembalikan ke Layar Penuh"}
                            </>
                        )}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                        Tindakan ini dicatat dalam log pengawasan ujian.
                    </p>
                </div>
            </div>
        </div>
    );
}
