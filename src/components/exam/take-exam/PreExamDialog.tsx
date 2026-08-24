"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    CheckCircle2,
    GraduationCap,
    Clock,
    FileText,
    ShieldAlert,
    Sparkles,
    Maximize2,
    Lock,
} from "lucide-react";

interface PreExamDialogProps {
    open: boolean;
    examName: string;
    studentName: string;
    studentUsername?: string;
    className?: string;
    durationMinutes?: number;
    totalQuestions?: number;
    requireToken?: boolean;
    tokenError?: string | null;
    onStartExam: (token?: string) => void;
    loading?: boolean;
}

export function PreExamDialog({
    open,
    examName,
    studentName,
    studentUsername,
    className,
    durationMinutes,
    totalQuestions,
    requireToken = false,
    tokenError = null,
    onStartExam,
    loading = false,
}: PreExamDialogProps) {
    const [token, setToken] = useState("");

    const initials = studentName
        ? studentName
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        : "SW";

    const handleConfirm = () => {
        if (requireToken) {
            onStartExam(token.trim().toUpperCase());
        } else {
            onStartExam();
        }
    };

    return (
        <Dialog open={open}>
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-2 border-primary/20 shadow-2xl">
                {/* Header with decorative background */}
                <div className="bg-gradient-to-r from-primary to-indigo-700 p-6 text-primary-foreground text-center relative overflow-hidden">
                    <div className="relative z-10 space-y-1">
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-none text-xs px-2.5 py-0.5 mb-1">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Konfirmasi Kesiapan Peserta
                        </Badge>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                            {examName || "Ujian Digital"}
                        </h2>
                        <p className="text-xs sm:text-sm text-white/80">
                            SMAN 1 Campurdarat • Platform CBT CartaExam
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Student Identity Card */}
                    <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center shrink-0 shadow-md">
                                {initials}
                            </div>
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-foreground text-sm sm:text-base">
                                        {studentName || "Nama Siswa"}
                                    </span>
                                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    {studentUsername && (
                                        <span className="font-mono bg-background px-1.5 py-0.5 rounded border">
                                            NIS: {studentUsername}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 font-semibold text-foreground">
                                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                                        {className || "Kelas Peserta"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <Badge variant="outline" className="hidden sm:inline-flex text-[11px] bg-background">
                            Akun Terverifikasi
                        </Badge>
                    </div>

                    {/* Exam Specs */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg border bg-muted/30 flex items-center gap-2.5">
                            <Clock className="w-4 h-4 text-primary shrink-0" />
                            <div>
                                <div className="text-muted-foreground text-[11px]">Durasi Ujian</div>
                                <div className="font-bold text-foreground text-sm">
                                    {durationMinutes ? `${durationMinutes} Menit` : "Sesuai Jadwal"}
                                </div>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border bg-muted/30 flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div>
                                <div className="text-muted-foreground text-[11px]">Jumlah Soal</div>
                                <div className="font-bold text-foreground text-sm">
                                    {totalQuestions ? `${totalQuestions} Butir Soal` : "Tersedia"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Token Input if Required */}
                    {requireToken && (
                        <div className="space-y-2 p-3.5 rounded-xl border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                                <Lock className="w-4 h-4" />
                                <span>Token Ujian Diperlukan</span>
                            </div>
                            <Input
                                type="text"
                                placeholder="Masukkan 6 digit token dari pengawas"
                                value={token}
                                onChange={(e) => setToken(e.target.value.toUpperCase())}
                                className="font-mono text-center tracking-widest uppercase font-bold text-base bg-background"
                                maxLength={8}
                            />
                            {tokenError && (
                                <p className="text-xs font-medium text-destructive">{tokenError}</p>
                            )}
                        </div>
                    )}

                    {/* Rules & Motivation Reminder */}
                    <div className="text-xs text-muted-foreground space-y-1.5 p-3 rounded-lg bg-muted/20 border border-border/60">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            Tata Tertib & Kesiapan:
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-[11.5px] leading-relaxed text-foreground/80">
                            <li>Ujian wajib dikerjakan dalam mode <strong>Layar Penuh (Fullscreen)</strong>.</li>
                            <li>Dilarang berpindah tab browser, membuka aplikasi lain, atau mengambil screenshot.</li>
                            <li>Jawaban Anda otomatis tersimpan ke server secara berkala.</li>
                        </ul>
                    </div>

                    <div className="text-center italic text-xs text-muted-foreground">
                        &ldquo;Berdoalah sebelum mengerjakan, baca soal dengan teliti, dan yakinlah pada kemampuan diri sendiri. Selamat mengerjakan!&rdquo;
                    </div>
                </div>

                <DialogFooter className="p-4 bg-muted/30 border-t flex flex-col sm:flex-row gap-2">
                    <Button
                        size="lg"
                        className="w-full sm:w-auto flex-1 font-bold shadow-lg shadow-primary/20 cursor-pointer"
                        onClick={handleConfirm}
                        disabled={loading || (requireToken && !token.trim())}
                    >
                        <Maximize2 className="w-4 h-4 mr-2" />
                        {loading ? "Menyiapkan Ujian..." : "Masuk & Mulai Ujian"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
