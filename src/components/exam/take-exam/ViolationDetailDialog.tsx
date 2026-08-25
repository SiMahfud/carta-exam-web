"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    AlertTriangle,
    ShieldAlert,
    ExternalLink,
    Maximize2,
    Keyboard,
    Camera,
    MousePointer,
    Printer,
    Code2,
    Smartphone,
    Info,
    CheckCircle2
} from "lucide-react";

export interface ViolationLogItem {
    type: string;
    details?: string;
    timestamp: string | Date;
}

interface ViolationDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    violationCount: number;
    maxViolations?: number;
    violationMode?: "strict" | "lenient" | "disabled" | string;
    violationLogs?: ViolationLogItem[];
}

function getViolationIcon(type: string) {
    const lower = type.toLowerCase();
    if (lower.includes("tab")) return <ExternalLink className="h-4 w-4 text-amber-500" />;
    if (lower.includes("fullscreen")) return <Maximize2 className="h-4 w-4 text-red-500" />;
    if (lower.includes("keyboard") || lower.includes("copy") || lower.includes("paste")) return <Keyboard className="h-4 w-4 text-orange-500" />;
    if (lower.includes("screenshot")) return <Camera className="h-4 w-4 text-purple-500" />;
    if (lower.includes("right_click") || lower.includes("context_menu")) return <MousePointer className="h-4 w-4 text-blue-500" />;
    if (lower.includes("print")) return <Printer className="h-4 w-4 text-indigo-500" />;
    if (lower.includes("devtools")) return <Code2 className="h-4 w-4 text-pink-500" />;
    if (lower.includes("back") || lower.includes("device")) return <Smartphone className="h-4 w-4 text-rose-500" />;
    return <ShieldAlert className="h-4 w-4 text-red-500" />;
}

function getViolationLabel(type: string): string {
    const labels: Record<string, string> = {
        TAB_SWITCH: "Pindah Tab Browser",
        WINDOW_BLUR: "Keluar dari Jendela Ujian",
        RIGHT_CLICK: "Klik Kanan Diblokir",
        KEYBOARD_SHORTCUT: "Shortcut Keyboard Terlarang",
        PRINT_ATTEMPT: "Mencoba Cetak Halaman",
        DEVTOOLS: "Membuka Developer Tools",
        SCREENSHOT: "Mencoba Screenshot",
        FULLSCREEN_EXIT: "Keluar dari Layar Penuh",
        BACK_BUTTON: "Menekan Tombol Kembali (HP)",
        WATERMARK_TAMPERING: "Manipulasi Watermark Keamanan",
        DEVICE_MISMATCH: "Perangkat Tidak Cocok",
        // Lowercase variant
        tab_switch: "Pindah Tab Browser",
        window_blur: "Keluar dari Jendela Ujian",
        context_menu: "Klik Kanan Diblokir",
        copy: "Mencoba Copy Teks",
        paste: "Mencoba Paste Teks",
        cut: "Mencoba Cut Teks",
        screenshot_attempt: "Mencoba Screenshot",
        watermark_tampering: "Manipulasi Watermark Keamanan",
    };
    return labels[type] || type;
}

function formatTime(timestamp: string | Date): string {
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return "-";
        return date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }) + " WIB";
    } catch {
        return "-";
    }
}

export function ViolationDetailDialog({
    open,
    onOpenChange,
    violationCount,
    maxViolations = 3,
    violationMode = "strict",
    violationLogs = [],
}: ViolationDetailDialogProps) {
    const remainingViolations = Math.max(0, maxViolations - violationCount);
    const isStrict = violationMode === "strict";
    const percentage = Math.min(100, Math.round((violationCount / Math.max(1, maxViolations)) * 100));

    const isHighRisk = isStrict && remainingViolations <= 1;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Header */}
                <DialogHeader className="p-6 pb-4 border-b bg-muted/40">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isHighRisk ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">
                                Riwayat Pelanggaran Ujian
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Catatan aktivitas yang terdeteksi melanggar tata tertib ujian
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Status & Risk Banner */}
                    <div className={`p-4 rounded-xl border ${isHighRisk ? "bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200" : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"}`}>
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider">
                                Status Keamanan
                            </span>
                            <Badge variant={isHighRisk ? "destructive" : "outline"} className="font-mono text-xs">
                                {violationCount} / {maxViolations} Pelanggaran
                            </Badge>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden mb-2">
                            <div
                                className={`h-full transition-all duration-500 rounded-full ${isHighRisk ? "bg-red-600" : "bg-amber-500"}`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>

                        <p className="text-xs">
                            {isStrict ? (
                                remainingViolations === 0 ? (
                                    <strong className="text-red-600 dark:text-red-400">
                                        Batas maksimal pelanggaran telah tercapai. Ujian akan dihentikan.
                                    </strong>
                                ) : (
                                    <>
                                        Tersisa <strong>{remainingViolations} kesempatan lagi</strong> sebelum ujian dihentikan secara otomatis.
                                    </>
                                )
                            ) : (
                                <>
                                    Mode Toleran: Pelanggaran dicatat untuk laporan pengawas dan penilaian akhir.
                                </>
                            )}
                        </p>
                    </div>

                    {/* Timeline List */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Daftar Pelanggaran ({violationLogs.length > 0 ? violationLogs.length : violationCount})
                            </h4>
                            <span className="text-xs text-muted-foreground">Urutan Kejadian</span>
                        </div>

                        {violationLogs.length > 0 ? (
                            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                                {violationLogs.map((log, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 p-3 rounded-lg border bg-card/60 hover:bg-card transition-colors text-xs"
                                    >
                                        <div className="mt-0.5 p-1.5 rounded-md bg-muted shrink-0">
                                            {getViolationIcon(log.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-foreground truncate">
                                                    {getViolationLabel(log.type)}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                                                    {formatTime(log.timestamp)}
                                                </span>
                                            </div>
                                            {log.details && (
                                                <p className="text-muted-foreground text-[11px] mt-0.5 break-words">
                                                    {log.details}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                                Total {violationCount} pelanggaran tercatat dalam sesi ini.
                            </div>
                        )}
                    </div>

                    {/* Rules reminder */}
                    <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-semibold">
                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>Tata Tertib Ujian</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90 pl-1">
                            <li>Tetap berada di dalam mode layar penuh (fullscreen).</li>
                            <li>Dilarang berpindah ke tab browser lain atau membuka aplikasi lain.</li>
                            <li>Dilarang mengambil screenshot, menyalin (copy/paste), atau klik kanan.</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="p-4 border-t bg-muted/20">
                    <Button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto flex items-center gap-1.5"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Saya Paham, Kembali ke Ujian
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
