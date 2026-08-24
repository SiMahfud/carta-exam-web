"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsHelpProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
    const shortcuts = [
        {
            keys: ["A", "B", "C", "D", "E"],
            desc: "Pilih opsi jawaban A, B, C, D, atau E langsung pada soal pilihan ganda",
        },
        {
            keys: ["1", "2"],
            desc: "Pilih Benar (1) atau Salah (2) pada soal Benar/Salah",
        },
        {
            keys: ["←", "Panah Kiri"],
            desc: "Pindah ke nomor soal sebelumnya",
        },
        {
            keys: ["→", "Panah Kanan"],
            desc: "Pindah ke nomor soal berikutnya",
        },
        {
            keys: ["F"],
            desc: "Tandai / hilangkan tanda ragu-ragu pada soal aktif",
        },
        {
            keys: ["?"],
            desc: "Buka / tutup panduan shortcut keyboard ini",
        },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Keyboard className="w-5 h-5 text-primary" />
                        Shortcut Keyboard (Pengerjaan Cepat)
                    </DialogTitle>
                    <DialogDescription>
                        Gunakan tombol keyboard laptop/PC untuk mempercepat navigasi dan pengisian jawaban ala standar UTBK/UNBK.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    {shortcuts.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 gap-4"
                        >
                            <span className="text-xs text-foreground/90 font-medium">
                                {item.desc}
                            </span>
                            <div className="flex gap-1 shrink-0">
                                {item.keys.map((k, kIdx) => (
                                    <Badge
                                        key={kIdx}
                                        variant="outline"
                                        className="font-mono text-xs px-2 py-0.5 bg-background shadow-xs font-bold border-border/80"
                                    >
                                        {k}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-md text-center">
                    💡 <em>Catatan: Shortcut otomatis nonaktif saat kursor mengetik di kotak jawaban Essay / Isian Singkat.</em>
                </div>
            </DialogContent>
        </Dialog>
    );
}
