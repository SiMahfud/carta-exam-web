"use client"

import { useState } from "react"
import Link from "next/link"
import {
    Search,
    BookOpen,
    HelpCircle,
    FileQuestion,
    Users,
    GraduationCap,
    LayoutDashboard,
    Video,
    ChevronRight,
    ArrowLeft,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface FAQItem {
    id: string
    question: string
    answer: string
    category: string
}

interface HelpCategory {
    id: string
    title: string
    description: string
    icon: React.ReactNode
    articles: string[]
}

const faqData: FAQItem[] = [
    {
        id: "1",
        question: "Bagaimana cara membuat bank soal baru?",
        answer: "Buka menu 'Bank Soal' di sidebar, lalu klik tombol 'Tambah Bank Soal'. Isi nama dan mata pelajaran, kemudian simpan.",
        category: "bank-soal",
    },
    {
        id: "2",
        question: "Bagaimana cara mengimpor soal dari Word?",
        answer: "Buka bank soal yang diinginkan, klik tombol 'Impor', pilih file DOCX, lalu preview dan konfirmasi soal yang akan diimpor.",
        category: "bank-soal",
    },
    {
        id: "3",
        question: "Bagaimana cara membuat template ujian?",
        answer: "Buka menu 'Template Ujian', klik 'Buat Template Baru', lalu ikuti wizard untuk memilih soal, atur durasi, dan konfigurasi keamanan.",
        category: "ujian",
    },
    {
        id: "4",
        question: "Bagaimana cara memulai sesi ujian?",
        answer: "Setelah membuat template, buka menu 'Sesi Ujian', klik 'Buat Sesi Baru', pilih template, atur jadwal, dan tentukan peserta.",
        category: "ujian",
    },
    {
        id: "5",
        question: "Bagaimana cara menambah siswa baru?",
        answer: "Buka menu 'Siswa', klik 'Tambah Siswa' untuk menambah satu per satu, atau gunakan 'Impor Excel' untuk menambah banyak siswa sekaligus.",
        category: "siswa",
    },
    {
        id: "6",
        question: "Bagaimana cara melihat hasil ujian?",
        answer: "Buka menu 'Penilaian', pilih sesi ujian, lalu lihat daftar nilai siswa. Klik nama siswa untuk melihat detail jawaban.",
        category: "penilaian",
    },
    {
        id: "7",
        question: "Bagaimana cara mengekspor nilai ke Excel?",
        answer: "Buka halaman penilaian sesi ujian, lalu klik tombol 'Ekspor Excel' di bagian atas halaman.",
        category: "penilaian",
    },
    {
        id: "8",
        question: "Apa itu mode lockdown ujian?",
        answer: "Mode lockdown mencegah siswa berpindah tab, menyalin teks, atau keluar dari mode fullscreen saat ujian berlangsung.",
        category: "keamanan",
    },
]

const helpCategories: HelpCategory[] = [
    {
        id: "memulai",
        title: "Memulai",
        description: "Panduan dasar untuk mulai menggunakan CartaExam",
        icon: <LayoutDashboard className="h-6 w-6" />,
        articles: ["Navigasi Dashboard", "Pengaturan Akun", "Pintasan Keyboard"],
    },
    {
        id: "bank-soal",
        title: "Bank Soal",
        description: "Kelola dan buat soal-soal ujian",
        icon: <FileQuestion className="h-6 w-6" />,
        articles: ["Membuat Bank Soal", "Jenis-jenis Soal", "Impor dari Word", "Tag dan Kesulitan"],
    },
    {
        id: "ujian",
        title: "Ujian",
        description: "Buat dan kelola template serta sesi ujian",
        icon: <BookOpen className="h-6 w-6" />,
        articles: ["Template Ujian", "Sesi Ujian", "Pengacakan Soal", "Token Akses"],
    },
    {
        id: "siswa",
        title: "Manajemen Siswa",
        description: "Kelola data siswa dan kelas",
        icon: <Users className="h-6 w-6" />,
        articles: ["Tambah Siswa", "Impor Excel", "Kelola Kelas", "Enroll Siswa"],
    },
    {
        id: "penilaian",
        title: "Penilaian",
        description: "Koreksi dan lihat hasil ujian",
        icon: <GraduationCap className="h-6 w-6" />,
        articles: ["Auto-grading", "Koreksi Essay", "Ekspor Nilai", "Statistik"],
    },
    {
        id: "video",
        title: "Video Tutorial",
        description: "Pelajari melalui video panduan",
        icon: <Video className="h-6 w-6" />,
        articles: ["Segera hadir..."],
    },
]

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredFAQ = faqData.filter(
        (item) =>
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-4 mb-6">
                        <Link href="/admin">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Kembali
                            </Button>
                        </Link>
                    </div>

                    <div className="text-center max-w-2xl mx-auto">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <HelpCircle className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Pusat Bantuan</h1>
                        <p className="text-muted-foreground mb-6">
                            Temukan jawaban dan panduan untuk menggunakan CartaExam
                        </p>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari pertanyaan atau topik..."
                                className="pl-10 h-12"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Search Results */}
                {searchQuery && (
                    <section className="mb-12">
                        <h2 className="text-xl font-semibold mb-4">
                            Hasil Pencarian ({filteredFAQ.length})
                        </h2>
                        {filteredFAQ.length > 0 ? (
                            <div className="space-y-3">
                                {filteredFAQ.map((item) => (
                                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <h3 className="font-medium mb-2">{item.question}</h3>
                                            <p className="text-sm text-muted-foreground">{item.answer}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <p className="text-muted-foreground">
                                        Tidak ada hasil untuk &ldquo;{searchQuery}&rdquo;
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </section>
                )}

                {/* Categories */}
                {!searchQuery && (
                    <>
                        <section className="mb-12">
                            <h2 className="text-xl font-semibold mb-4">Kategori Bantuan</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {helpCategories.map((category) => (
                                    <Card
                                        key={category.id}
                                        className="hover:shadow-md transition-shadow cursor-pointer group"
                                    >
                                        <CardHeader>
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                    {category.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <CardTitle className="text-lg">{category.title}</CardTitle>
                                                    <CardDescription>{category.description}</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-1">
                                                {category.articles.map((article, idx) => (
                                                    <li key={idx} className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                                                        <ChevronRight className="h-3 w-3 mr-1" />
                                                        {article}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>

                        {/* FAQ Section */}
                        <section>
                            <h2 className="text-xl font-semibold mb-4">Pertanyaan Umum (FAQ)</h2>
                            <div className="space-y-3">
                                {faqData.map((item) => (
                                    <Card key={item.id}>
                                        <CardContent className="p-4">
                                            <h3 className="font-medium mb-2">{item.question}</h3>
                                            <p className="text-sm text-muted-foreground">{item.answer}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {/* Contact Section */}
                <section className="mt-12 text-center">
                    <Card className="bg-muted/50">
                        <CardContent className="p-8">
                            <h3 className="text-lg font-semibold mb-2">Masih butuh bantuan?</h3>
                            <p className="text-muted-foreground mb-4">
                                Hubungi administrator sekolah atau tim support kami
                            </p>
                            <Button variant="outline">
                                Hubungi Support
                            </Button>
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    )
}
