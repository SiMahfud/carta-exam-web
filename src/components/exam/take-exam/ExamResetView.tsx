import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, AlertTriangle, ArrowRight } from "lucide-react";

interface ExamResetViewProps {
    title?: string;
    message?: string;
    onRestart: () => void;
    autoRedirectSeconds?: number;
}

export function ExamResetView({
    title = "Ujian Direset oleh Pengawas",
    message = "Sesi ujian Anda telah direset oleh pengawas/admin sekolah. Pengerjaan Anda sebelumnya telah dibatalkan agar Anda dapat mengerjakan dari awal dengan benar.",
    onRestart,
    autoRedirectSeconds = 10,
}: ExamResetViewProps) {
    const [secondsLeft, setSecondsLeft] = useState(autoRedirectSeconds);

    useEffect(() => {
        if (secondsLeft <= 0) {
            onRestart();
            return;
        }

        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onRestart();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [secondsLeft, onRestart]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-md w-full p-8 text-center shadow-xl border-amber-300 dark:border-amber-800 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                    <RotateCcw className="w-10 h-10 animate-spin-reverse" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                    {title}
                </h2>
                <p className="text-muted-foreground mb-5 text-sm sm:text-base leading-relaxed">
                    {message}
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 mb-6 text-left flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm text-amber-900 dark:text-amber-300">
                        <p className="font-semibold">Harap Mulai Ujian dari Menu Utama</p>
                        <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/80">
                            Pengerjaan lama tidak dapat dilanjutkan. Anda harus mengeklik tombol <strong>Mulai Ujian</strong> di menu utama untuk mendapatkan soal terbaru.
                        </p>
                    </div>
                </div>
                <Button
                    onClick={onRestart}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium flex items-center justify-center gap-2 h-11"
                >
                    <span>Mulai Ujian dari Awal</span>
                    {secondsLeft > 0 && <span className="text-xs opacity-80">({secondsLeft}d)</span>}
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </Card>
        </div>
    );
}
