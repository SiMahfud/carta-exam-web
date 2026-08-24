'use client'

import { useState, useTransition } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { login } from "@/actions/auth"
import { ShieldCheck, Lock, User, Loader2, AlertCircle, Eye, EyeOff, Rocket } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<{ username?: string[]; password?: string[] }>({})
    const [showPassword, setShowPassword] = useState(false)

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
        <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden px-4">
            {/* Background Effects */}
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10"></div>

            <Card className="w-full max-w-md border shadow-2xl bg-background/80 backdrop-blur-xl">
                <CardHeader className="space-y-1 text-center pb-6">
                    <div className="flex justify-center mb-3">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Selamat Datang di CartaExam</CardTitle>
                    <CardDescription>
                        Sistem Ujian & CBT Online <br />
                        <span className="font-semibold text-primary">SMAN 1 Campurdarat</span>
                    </CardDescription>
                </CardHeader>
                
                <form action={handleSubmit}>
                    <CardContent className="space-y-4">
                        {/* Tombol Masuk Cepat SSO PortoCarta */}
                        <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/50 text-center space-y-2">
                            <p className="text-xs text-indigo-950 dark:text-indigo-200 font-medium">
                                Sudah punya akun di <strong>PortoCarta</strong>?
                            </p>
                            <a
                                href="https://porto.sman1campurdarat.sch.id/apps/launch/carta-exam"
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm active:scale-[0.98]"
                            >
                                <Rocket className="h-4 w-4" />
                                Masuk Cepat lewat Akun PortoCarta (SSO)
                            </a>
                        </div>

                        <div className="relative flex py-1 items-center">
                            <div className="flex-grow border-t border-muted"></div>
                            <span className="flex-shrink mx-3 text-[11px] text-muted-foreground uppercase font-medium">
                                atau login mandiri
                            </span>
                            <div className="flex-grow border-t border-muted"></div>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 text-sm bg-destructive/10 text-destructive rounded-lg border border-destructive/20" role="alert">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Username Field */}
                        <div className="space-y-2">
                            <Label htmlFor="username">Username / NISN / NIP</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    className={`pl-9 ${fieldErrors.username ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                    placeholder="Masukkan NISN atau NIP"
                                    required
                                    disabled={isPending}
                                    aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                                />
                            </div>
                            {fieldErrors.username && (
                                <p id="username-error" className="text-sm text-destructive">
                                    {fieldErrors.username[0]}
                                </p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    className={`pl-9 pr-10 ${fieldErrors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                    placeholder="••••••••"
                                    required
                                    disabled={isPending}
                                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p id="password-error" className="text-sm text-destructive">
                                    {fieldErrors.password[0]}
                                </p>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 pt-2">
                        <Button
                            type="submit"
                            className="w-full h-11 text-sm shadow-md transition-all"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                'Masuk ke CartaExam'
                            )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            Akun otomatis tersinkronisasi dari portal induk <strong>PortoCarta</strong>.
                        </p>
                        <Link href="/" className="text-xs text-center text-primary hover:underline">
                            Kembali ke Beranda
                        </Link>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
