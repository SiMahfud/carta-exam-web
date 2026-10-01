import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TerminatedExamViewProps {
    violationCount: number;
    onReturn: () => void;
    onRetry?: () => void;
}

export function TerminatedExamView({ violationCount, onReturn, onRetry }: TerminatedExamViewProps) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="max-w-md mx-4 p-8 text-center shadow-lg border-red-200 dark:border-red-900/50">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Ujian Dihentikan</h2>
                <p className="text-muted-foreground mb-4">
                    Ujian Anda telah dihentikan karena melebihi batas pelanggaran yang diizinkan.
                </p>
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 rounded-xl p-4 mb-6">
                    <p className="text-sm text-red-700 dark:text-red-300">
                        <strong>Total pelanggaran:</strong> {violationCount}
                    </p>
                    <p className="text-sm text-red-700/80 dark:text-red-300/80 mt-2">
                        Jika pengawas telah membuka kembali kunci ujian Anda, silakan klik tombol di bawah untuk melanjutkan.
                    </p>
                </div>
                <div className="space-y-2.5">
                    {onRetry && (
                        <Button onClick={onRetry} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                            Cek Status & Lanjutkan Ujian
                        </Button>
                    )}
                    <Button onClick={onReturn} variant={onRetry ? "outline" : "default"} className="w-full">
                        Kembali ke Daftar Ujian
                    </Button>
                </div>
            </Card>
        </div>
    );
}
