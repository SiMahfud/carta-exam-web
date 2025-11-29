import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, BookOpen, MonitorPlay, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">CartaExam</span>
          </div>
          <nav>
            <Link href="/login">
              <Button>Login</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Platform Ujian Modern <br className="hidden md:block" />
              untuk <span className="text-primary">SMAN 1 Campurdarat</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Solusi ujian digital yang aman, efisien, dan mudah digunakan.
              Mendukung berbagai tipe soal dan pemantauan real-time.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8 text-lg">
                  Mulai Ujian
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Fitur Unggulan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <ShieldCheck className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Keamanan Tinggi</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Dilengkapi dengan fitur lockdown browser, deteksi pindah tab, dan pencegahan copy-paste untuk menjaga integritas ujian.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BookOpen className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Bank Soal Fleksibel</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Mendukung berbagai tipe soal: Pilihan Ganda, Kompleks, Menjodohkan, Isian Singkat, dan Esai.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <MonitorPlay className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Monitoring Real-time</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Guru dapat memantau aktivitas siswa secara langsung saat ujian berlangsung, termasuk status pengerjaan dan pelanggaran.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CheckCircle className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Penilaian Otomatis</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Hasil ujian langsung keluar untuk soal objektif. Mempercepat proses koreksi dan rekap nilai.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CartaExam - SMAN 1 Campurdarat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
