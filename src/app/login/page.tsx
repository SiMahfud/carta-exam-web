'use client'

import { useState, useTransition } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { login } from "@/actions/auth"
import { ShieldCheck, Lock, User, Loader2, AlertCircle, Eye, EyeOff, Rocket, ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<{ username?: string[]; password?: string[] }>({})
    const [showPassword, setShowPassword] = useState(false)
    const [showManualLogin, setShowManualLogin] = useState(false)

    async function handleSubmit(formData: FormData) {
        setError(null)
        setFieldErrors({})

        startTransition(async () => {
            const result = await login(formData)

            // If we get here without redirect, there was an error
            if (result && !result.success) {
                setError(result.error || 'Terjadi kesalahan')
                if (result.fieldErrors) {
                    setFieldErrors(result.fieldErrors)
                }
            }
        })
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden px-4">
            {/* Background Effects */}
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:16px_28px]"></div>
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/20 rounded-full blur-[140px] -z-10"></div>
            <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-purple-600/15 rounded-full blur-[120px] -z-10"></div>

            <Card className="w-full max-w-md border border-slate-800 shadow-2xl bg-slate-900/90 backdrop-blur-2xl text-slate-100 rounded-2xl overflow-hidden">
                <CardHeader className="space-y-2 text-center pb-6 pt-8">
                    <div className="flex justify-center mb-2">
                        <div className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-inner">
                            <ShieldCheck className="h-9 w-9" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Carta<span className="text-indigo-400">Exam</span>
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-xs sm:text-sm">
                        Sistem Ujian & Asesmen Digital <br />
                        <span className="font-semibold text-indigo-300">SMAN 1 Campurdarat</span>
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-5 px-6 pb-6">
                    {/* SSO Hero Card Button (Metode Utama) */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900/50 via-slate-900 to-purple-950/40 border border-indigo-500/30 text-center space-y-3 shadow-lg">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                            Rekomendasi Masuk
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Masuk instan menggunakan akun <strong>PortoCarta</strong> tanpa perlu menghafal password ujian.
                        </p>
                        <a
                            href="https://porto.sman1campurdarat.sch.id/apps/launch/carta-exam"
                            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md hover:shadow-indigo-500/25 active:scale-[0.98] group"
                        >
                            <Rocket className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            Masuk dengan Akun PortoCarta
                        </a>
                        <p className="text-[11px] text-slate-400">
                            Berlaku otomatis untuk <strong>Siswa, Guru, dan Admin</strong>.
                        </p>
                    </div>

                    {/* Divider Toggle Manual Login */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowManualLogin(!showManualLogin)}
                            className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors py-1.5"
                        >
                            <span>Opsi Login Mandiri (Cadangan)</span>
                            {showManualLogin ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                    </div>

                    {/* Manual Form (Collapsible) */}
                    {showManualLogin && (
                        <form action={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800 animate-in fade-in-50 duration-200">
                            {/* Error Alert */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 text-xs bg-rose-500/10 text-rose-300 rounded-xl border border-rose-500/20" role="alert">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Username Field */}
                            <div className="space-y-1.5">
                                <Label htmlFor="username" className="text-xs text-slate-300">Username / NISN / NIP</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="username"
                                        name="username"
                                        type="text"
                                        autoComplete="username"
                                        className={`pl-9 bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 ${fieldErrors.username ? 'border-rose-500' : ''}`}
                                        placeholder="Masukkan NISN atau NIP"
                                        required
                                        disabled={isPending}
                                    />
                                </div>
                                {fieldErrors.username && (
                                    <p className="text-xs text-rose-400">
                                        {fieldErrors.username[0]}
                                    </p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-xs text-slate-300">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        className={`pl-9 pr-10 bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 ${fieldErrors.password ? 'border-rose-500' : ''}`}
                                        placeholder="••••••••"
                                        required
                                        disabled={isPending}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {fieldErrors.password && (
                                    <p className="text-xs text-rose-400">
                                        {fieldErrors.password[0]}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-10 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all"
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    'Masuk Manual'
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col gap-2 pb-6 pt-0 text-center border-t border-slate-800/60 bg-slate-950/40">
                    <p className="text-[11px] text-slate-500 pt-3">
                        PortoCarta Education Ecosystem &copy; 2026 SMAN 1 Campurdarat
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
