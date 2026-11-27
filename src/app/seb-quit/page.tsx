import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Fallback landing page when navigating to SEB's configured `quitURL`.
 * Inside Safe Exam Browser, navigating to this URL closes SEB automatically without requiring a Quit Password.
 */
export default function SebQuitPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
            <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center space-y-4 shadow-xl">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-7 h-7 text-emerald-400" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Sesi Safe Exam Browser Berakhir</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Jika Anda membuka halaman ini di dalam Safe Exam Browser, aplikasi SEB akan otomatis tertutup.
                    Jika tidak tertutup otomatis, silakan tutup jendela browser atau tekan tombol di bawah untuk kembali.
                </p>
                <div className="pt-2">
                    <Button asChild variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800">
                        <Link href="/login">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Kembali ke Halaman Login
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
