'use client'

import { useState, useTransition } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { login, type LoginResult } from "@/actions/auth"
import { ShieldCheck, Lock, User, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react"
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

            <Card className="w-full max-w-md border-none shadow-2xl bg-background/60 backdrop-blur-xl">
                <CardHeader className="space-y-1 text-center pb-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-primary/10 ring-1 ring-primary/20">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Selamat Datang</CardTitle>
                    <CardDescription>
                        Masuk untuk mengakses sistem ujian <br />
                        <span className="font-medium text-primary">SMAN 1 Campurdarat</span>
                    </CardDescription>
                </CardHeader>
                <form action={handleSubmit}>
                    <CardContent className="space-y-4">
                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 text-sm bg-destructive/10 text-destructive rounded-lg border border-destructive/20" role="alert">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Username Field */}
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    className={`pl-9 ${fieldErrors.username ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                    placeholder="Masukkan username"
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
                    <CardFooter className="flex flex-col gap-4 pt-4">
                        <Button
                            type="submit"
                            className="w-full h-11 text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                'Masuk'
                            )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            Lupa password? Hubungi administrator sekolah.
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
