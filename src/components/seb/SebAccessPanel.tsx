"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { detectClientEnvironment } from "@/lib/browser-detection";

interface SebAccessPanelProps {
    variant?: "login" | "dialog";
    message?: string;
}

export function SebAccessPanel({ variant = "login", message }: SebAccessPanelProps) {
    const [sebUrl, setSebUrl] = useState("#");
    const [downloadUrl, setDownloadUrl] = useState("/api/seb/config");
    const [showQr, setShowQr] = useState(variant === "dialog");
    const [env, setEnv] = useState({ isSeb: false, isExambro: false, isIos: false, isAndroid: false });

    useEffect(() => {
        setEnv(detectClientEnvironment());
        if (typeof window !== "undefined") {
            const { protocol, host } = window.location;
            const scheme = protocol === "https:" ? "sebs" : "seb";
            setSebUrl(`${scheme}://${host}/api/seb/config`);
            setDownloadUrl(`${protocol}//${host}/api/seb/config`);
        }
    }, []);

    if (env.isSeb) {
        return (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                <span>Anda sedang menggunakan <strong>Safe Exam Browser (SEB)</strong>.</span>
            </div>
        );
    }

    const isLogin = variant === "login";

    return (
        <div
            className={
                isLogin
                    ? "space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-left text-xs text-slate-300"
                    : "space-y-4 text-left text-sm"
            }
        >
            {message && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                    {message}
                </div>
            )}

            <div className="space-y-1.5">
                <div className={`flex items-center gap-1.5 font-semibold ${isLogin ? "text-slate-100" : "text-foreground"}`}>
                    <Smartphone className="h-4 w-4 text-indigo-400" />
                    <span>Petunjuk Masuk via Safe Exam Browser (SEB)</span>
                </div>
                <ol className={`list-decimal space-y-1 pl-4 text-[11.5px] leading-relaxed ${isLogin ? "text-slate-400" : "text-muted-foreground"}`}>
                    <li>
                        Pastikan aplikasi <strong>SafeExamBrowser</strong> sudah terpasang (App Store untuk iPhone/iPad, atau{" "}
                        <span className="underline">safeexambrowser.org</span> untuk PC/Mac).
                    </li>
                    <li>
                        Ketuk <strong>Buka di Safe Exam Browser</strong> di bawah ini (atau scan QR Code dengan Kamera iPhone/iPad).
                    </li>
                    <li>
                        Setelah SEB terbuka, silakan login menggunakan akun sekolah Anda di dalam SEB.
                    </li>
                </ol>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button asChild size="sm" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                    <a href={sebUrl}>
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Buka di SEB
                    </a>
                </Button>
                <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className={
                        isLogin
                            ? "w-full border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
                            : "w-full"
                    }
                >
                    <a href={downloadUrl} download="cartaexam.seb">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Unduh File .seb
                    </a>
                </Button>
            </div>

            <div className="flex items-center justify-between pt-0.5">
                <button
                    type="button"
                    onClick={() => setShowQr((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium transition-colors ${
                        isLogin ? "text-indigo-300 hover:text-indigo-200" : "text-primary hover:underline"
                    }`}
                >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>{showQr ? "Sembunyikan QR Code SEB" : "Tampilkan QR Code untuk iPhone/iPad"}</span>
                </button>
            </div>

            {showQr && (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-700/60 bg-white p-3 text-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/api/seb/qr"
                        alt="QR Code Konfigurasi Safe Exam Browser CartaExam"
                        className="h-44 w-44 rounded-md"
                    />
                    <p className="text-center text-[11px] text-slate-600">
                        Scan dengan aplikasi <strong>Kamera iPhone/iPad</strong> atau scanner QR di dalam SEB.
                    </p>
                </div>
            )}
        </div>
    );
}
