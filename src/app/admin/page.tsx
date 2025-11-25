import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { BookOpen, Database, FileText, Calendar, Users, GraduationCap } from "lucide-react";

export default function AdminDashboard() {
    const quickActions = [
        {
            title: "Mata Pelajaran",
            description: "Kelola mata pelajaran",
            icon: BookOpen,
            href: "/admin/subjects",
            color: "bg-blue-500",
        },
        {
            title: "Kelas & Siswa",
            description: "Kelola kelas dan siswa",
            icon: Users,
            href: "/admin/classes",
            color: "bg-green-500",
        },
        {
            title: "Bank Soal",
            description: "Kelola bank soal dengan tagging",
            icon: Database,
            href: "/admin/question-banks",
            color: "bg-purple-500",
        },
        {
            title: "Template Ujian",
            description: "Buat template ujian yang dapat digunakan ulang",
            icon: FileText,
            href: "/admin/exam-templates",
            color: "bg-orange-500",
        },
        {
            title: "Sesi Ujian",
            description: "Buat dan monitor sesi ujian",
            icon: Calendar,
            href: "/admin/exam-sessions",
            color: "bg-pink-500",
        },
        {
            title: "Manajemen User",
            description: "Kelola pengguna sistem",
            icon: GraduationCap,
            href: "/admin/users",
            color: "bg-teal-500",
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold">Dashboard Admin</h2>
                <p className="text-muted-foreground mt-2">
                    Selamat datang di CartaExam - Sistem Manajemen Ujian Komprehensif
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Mata Pelajaran</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">0</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Total Bank Soal</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">0</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Sesi Ujian Aktif</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">0</p>
                    </CardContent>
                </Card>
            </div>

            <div>
                <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link key={action.href} href={action.href}>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${action.color} text-white`}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{action.title}</CardTitle>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            {action.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Fitur Sistem Baru</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="font-semibold text-green-600">✓</span>
                            <span>Bank Soal dengan sistem tagging dan tingkat kesulitan</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold text-green-600">✓</span>
                            <span>Template Ujian yang dapat disimpan dan digunakan ulang</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold text-green-600">✓</span>
                            <span>Question Pool - soal acak berbeda untuk setiap siswa</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold text-green-600">✓</span>
                            <span>Sistem scoring fleksibel dengan bobot kustom per tipe soal</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-semibold text-green-600">✓</span>
                            <span>Partial credit untuk soal PG Kompleks dan Menjodohkan</span>
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
