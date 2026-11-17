"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface PrintDispensasiModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tokenData: {
        token: string;
        scope?: "session" | "daily" | "weekly" | "permanent" | string | null;
        studentName?: string | null;
        studentUsername?: string | null;
        className?: string | null;
        expiresAt: string | Date;
        notes?: string | null;
    } | null;
}

export function PrintDispensasiModal({
    open,
    onOpenChange,
    tokenData,
}: PrintDispensasiModalProps) {
    if (!tokenData) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="h-5 w-5 text-primary" />
                        Slip Dispensasi Ujian Siswa
                    </DialogTitle>
                </DialogHeader>

                {/* Printable Slip Container */}
                <div id="printable-dispensasi-slip" className="p-5 border-2 border-dashed border-slate-400 bg-white text-slate-900 rounded-xl space-y-4 font-sans">
                    {/* Header SMAN 1 Campurdarat */}
                    <div className="text-center border-b pb-3 border-slate-300">
                        <h3 className="font-bold text-sm tracking-wider uppercase text-slate-900">
                            SMAN 1 CAMPURDARAT
                        </h3>
                        <p className="text-[11px] text-slate-600">
                            SURAT DISPENSASI & TOKEN AKSES UJIAN
                        </p>
                        <p className="text-[10px] text-slate-500">
                            Tahun Ajaran 2025/2026
                        </p>
                    </div>

                    {/* Student Identity */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <span className="text-slate-500 block text-[10px] uppercase">Nama Siswa:</span>
                            <span className="font-bold text-slate-900">{tokenData.studentName || "Siswa Terdaftar"}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[10px] uppercase">NIS / Kelas:</span>
                            <span className="font-mono font-semibold text-slate-900">
                                {tokenData.studentUsername || "-"} {tokenData.className ? `(${tokenData.className})` : ""}
                            </span>
                        </div>
                    </div>

                    {/* Token Box */}
                    <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-center space-y-1">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                            Kode Token Dispensasi Ujian
                        </div>
                        <div className="text-2xl font-mono font-extrabold tracking-widest text-slate-900">
                            {tokenData.token}
                        </div>
                        <div className="text-[10px] text-slate-500">
                            Masukkan kode ini di layar ujian jika akses Anda terkunci.
                        </div>
                    </div>

                    {/* Expiration, Scope and Notes */}
                    <div className="text-[11px] space-y-1 border-t pt-2 border-slate-200">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Lingkup Dispensasi:</span>
                            <span className="font-bold text-slate-900">
                                {tokenData.scope === "session" ? "1 Sesi Ujian Saja (Per Jam/Mapel)" :
                                 tokenData.scope === "weekly" ? "Mingguan (1 Pekan Penuh)" :
                                 tokenData.scope === "permanent" ? "Bebas Sepanjang Ujian" :
                                 "Harian (1 Hari Ini)"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Batas Kedaluwarsa:</span>
                            <span className="font-medium text-slate-800">
                                s.d. {format(new Date(tokenData.expiresAt), "dd MMM yyyy, HH:mm", { locale: idLocale })}
                            </span>
                        </div>
                        {tokenData.notes && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">Keterangan:</span>
                                <span className="text-slate-800 font-medium text-right max-w-[250px]">{tokenData.notes}</span>
                            </div>
                        )}
                    </div>

                    {/* Signature Area */}
                    <div className="pt-3 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-600">
                        <div>
                            <div>Dicetak pada: {format(new Date(), "dd/MM/yyyy HH:mm")}</div>
                            <div className="italic text-[9px] text-slate-400">Harap simpan slip ini selama ujian</div>
                        </div>
                        <div className="text-center w-32">
                            <div className="mb-8">Petugas TU/Piket,</div>
                            <div className="border-b border-slate-400 pb-0.5 font-medium">( .................................... )</div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Tutup
                    </Button>
                    <Button onClick={handlePrint} className="gap-2 bg-primary">
                        <Printer className="h-4 w-4" />
                        Cetak Slip
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
