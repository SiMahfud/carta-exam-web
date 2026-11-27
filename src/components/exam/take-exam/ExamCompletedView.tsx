import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { SebQuitButton } from "@/components/seb/SebQuitButton";

interface ExamCompletedViewProps {
    title?: string;
    message?: string;
    onReturn: () => void;
    autoRedirectSeconds?: number;
}

export function ExamCompletedView({
    title = "Ujian Telah Selesai",
    message = "Ujian Anda telah dikumpulkan oleh pengawas.",
    onReturn,
    autoRedirectSeconds = 5,
}: ExamCompletedViewProps) {
    const [secondsLeft, setSecondsLeft] = useState(autoRedirectSeconds);

    useEffect(() => {
        if (secondsLeft <= 0) {
            onReturn();
            return;
        }

        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onReturn();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [secondsLeft, onReturn]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-md w-full p-8 text-center shadow-xl border-emerald-200 dark:border-emerald-900/50 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                    {title}
                </h2>
                <p className="text-muted-foreground mb-5 text-sm sm:text-base leading-relaxed">
                    {message}
                </p>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-4 mb-6 text-left flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
                        <p className="font-semibold">Jawaban Anda Aman</p>
                        <p className="mt-0.5 text-emerald-700/90 dark:text-emerald-300/80">
                            Semua jawaban yang telah Anda pilih sudah tersimpan dengan aman di server sekolah.
                        </p>
                    </div>
                </div>
                <Button
                    onClick={onReturn}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center justify-center gap-2 h-11"
                >
                    <span>Kembali ke Daftar Ujian</span>
                    {secondsLeft > 0 && <span className="text-xs opacity-80">({secondsLeft}d)</span>}
                    <ArrowRight className="w-4 h-4" />
                </Button>

                <div className="mt-3 flex justify-center">
                    <SebQuitButton variant="outline" size="sm" className="w-full" />
                </div>
            </Card>
        </div>
    );
}
