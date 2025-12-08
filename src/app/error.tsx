'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log to console in development
        console.error('Application Error:', error)

        // Report error to Sentry
        Sentry.captureException(error, {
            tags: {
                digest: error.digest,
            },
        })
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full mx-4 text-center">
                <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                        <AlertTriangle className="w-8 h-8 text-destructive" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        Terjadi Kesalahan
                    </h1>
                    <p className="text-muted-foreground">
                        Maaf, terjadi kesalahan yang tidak terduga. Tim kami telah diberitahu
                        dan sedang bekerja untuk memperbaikinya.
                    </p>
                </div>

                {process.env.NODE_ENV === 'development' && error.message && (
                    <div className="mb-6 p-4 bg-destructive/5 rounded-lg border border-destructive/20 text-left">
                        <p className="text-sm font-mono text-destructive break-all">
                            {error.message}
                        </p>
                        {error.digest && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Error ID: {error.digest}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={reset} className="gap-2">
                        <RefreshCcw className="w-4 h-4" />
                        Coba Lagi
                    </Button>
                    <Button variant="outline" asChild className="gap-2">
                        <Link href="/">
                            <Home className="w-4 h-4" />
                            Ke Beranda
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
