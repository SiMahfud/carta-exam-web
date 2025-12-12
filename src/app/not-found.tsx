'use client'

import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NotFound() {
    const router = useRouter()

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full mx-4 text-center">
                <div className="mb-6">
                    <div className="text-8xl font-bold text-muted-foreground/30 mb-4">
                        404
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        Halaman Tidak Ditemukan
                    </h1>
                    <p className="text-muted-foreground">
                        Maaf, halaman yang Anda cari tidak ditemukan atau telah dipindahkan.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" onClick={() => router.back()} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Kembali
                    </Button>
                    <Button asChild className="gap-2">
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
