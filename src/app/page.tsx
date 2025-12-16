import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, BookOpen, MonitorPlay, CheckCircle, ArrowRight, GraduationCap } from "lucide-react";
import { getSchoolSettings } from "@/actions/settings";

export default async function Home() {
  const settings = await getSchoolSettings();

  const schoolName = settings?.schoolName || "CartaExam";
  const heroTitle = settings?.heroTitle || "Ujian Modern untuk Generasi Digital";
  const heroDescription = settings?.heroDescription || "Platform ujian yang aman, cerdas, dan mudah digunakan untuk SMAN 1 Campurdarat. Tingkatkan integritas dan efisiensi evaluasi pembelajaran.";
  const showStats = settings?.heroShowStats ?? true;
  const featuresTitle = settings?.featuresTitle || "Fitur Unggulan";
  const featuresSubtitle = settings?.featuresSubtitle || "Dirancang khusus untuk kebutuhan evaluasi akademik modern dengan standar keamanan tinggi.";
  const footerText = settings?.footerText || `© ${new Date().getFullYear()} ${schoolName}. Built with ❤️ for education.`;

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              {settings?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logoUrl} alt="Logo" className="h-6 w-6 object-contain" />
              ) : (
                <ShieldCheck className="h-6 w-6 text-primary" />
              )}
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
              {schoolName}
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="hidden md:inline-flex">
                Masuk sebagai Guru
              </Button>
            </Link>
            <ModeToggle />
            <Link href="/login">
              <Button className="rounded-full px-6 shadow-lg shadow-primary/20">
                Mulai Ujian
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent blur-3xl"></div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Sistem Ujian Digital Terpadu
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
              {heroTitle}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed whitespace-pre-wrap">
              {heroDescription}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:-translate-y-1">
                  Masuk Sekarang <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full hover:bg-secondary/50">
                  Pelajari Fitur
                </Button>
              </Link>
            </div>

            {/* Stats/Social Proof */}
            {showStats && (
              <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto border-t pt-8">
                {[
                  { label: "Siswa Aktif", value: "1000+" },
                  { label: "Ujian Selesai", value: "5000+" },
                  { label: "Tipe Soal", value: "5" },
                  { label: "Keamanan", value: "TKDN" },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-muted/30 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{featuresTitle}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {featuresSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(settings?.features && settings.features.length > 0 ? settings.features : [
                {
                  icon: "ShieldCheck",
                  title: "Keamanan Tinggi",
                  description: "Lockdown browser, deteksi tab switching, dan anti copy-paste untuk integritas maksimal.",
                  color: "text-blue-500"
                },
                {
                  icon: "BookOpen",
                  title: "Bank Soal Fleksibel",
                  description: "Mendukung Pilihan Ganda, Kompleks, Menjodohkan, Isian Singkat, dan Esai.",
                  color: "text-purple-500"
                },
                {
                  icon: "MonitorPlay",
                  title: "Monitoring Real-time",
                  description: "Pantau aktivitas siswa secara langsung. Deteksi kecurangan secara instan.",
                  color: "text-green-500"
                },
                {
                  icon: "CheckCircle",
                  title: "Auto Grading",
                  description: "Penilaian otomatis untuk soal objektif. Hasil keluar instan dan akurat.",
                  color: "text-orange-500"
                }
              ]).map((feature: any, i: number) => {
                // Feature icon mapping
                const IconComponent = feature.icon === "ShieldCheck" ? ShieldCheck :
                  feature.icon === "BookOpen" ? BookOpen :
                    feature.icon === "MonitorPlay" ? MonitorPlay :
                      feature.icon === "CheckCircle" ? CheckCircle :
                        CheckCircle; // Default fallback

                return (
                  <Card key={i} className="border-none shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-background/50 backdrop-blur-sm">
                    <CardHeader>
                      <div className={`h-12 w-12 rounded-lg bg-background shadow-sm flex items-center justify-center mb-4 ${feature.color}`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description || feature.desc /* Handle both keys for compatibility */}
                      </CardDescription>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="bg-primary rounded-3xl p-8 md:p-16 text-center text-primary-foreground relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>

              <div className="relative z-10 max-w-2xl mx-auto">
                <GraduationCap className="h-16 w-16 mx-auto mb-6 text-white/80" />
                <h2 className="text-3xl md:text-5xl font-bold mb-6">Siap Melaksanakan Ujian?</h2>
                <p className="text-primary-foreground/80 text-lg mb-8">
                  Bergabunglah dengan ribuan siswa lainnya dalam pengalaman ujian digital yang lebih baik.
                </p>
                <Link href="/login">
                  <Button size="lg" variant="secondary" className="h-14 px-10 text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105">
                    Mulai Sekarang
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">{schoolName}</span>
            </div>
            <div className="text-sm text-muted-foreground text-center md:text-right">
              <p>{footerText}</p>
              {settings?.contactEmail && <p>{settings.contactEmail}</p>}
              {settings?.contactPhone && <p>{settings.contactPhone}</p>}
              {settings?.address && <p>{settings.address}</p>}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
