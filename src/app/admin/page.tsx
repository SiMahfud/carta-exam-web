import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import {
    BookOpen,
    Database,
    FileText,
    Calendar,
    Users,
    GraduationCap,
    TrendingUp,
    Activity,
    Clock,
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
    const quickActions = [
        {
            title: "Mata Pelajaran",
            description: "Kelola kurikulum & mapel",
            icon: BookOpen,
            href: "/admin/subjects",
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
        {
            title: "Kelas & Siswa",
            description: "Database siswa & rombel",
            icon: Users,
            href: "/admin/classes",
            color: "text-green-600",
            bg: "bg-green-100",
        },
        {
            title: "Bank Soal",
            description: "Repository soal ujian",
            icon: Database,
            href: "/admin/question-banks",
            color: "text-purple-600",
            bg: "bg-purple-100",
        },
        {
            title: "Template Ujian",
            description: "Konfigurasi format ujian",
            icon: FileText,
            href: "/admin/exam-templates",
            color: "text-orange-600",
            bg: "bg-orange-100",
        },
        {
            title: "Sesi Ujian",
            description: "Jadwal & monitoring",
            icon: Calendar,
            href: "/admin/exam-sessions",
            color: "text-pink-600",
            bg: "bg-pink-100",
        },
        {
            title: "Manajemen User",
            description: "Akses & pengguna sistem",
            icon: GraduationCap,
            href: "/admin/users",
            color: "text-teal-600",
            bg: "bg-teal-100",
        },
    ];

    const stats = [
        { label: "Total Siswa", value: "1,240", change: "+12%", icon: Users },
        { label: "Ujian Selesai", value: "8,432", change: "+5%", icon: FileText },
        { label: "Sesi Aktif", value: "3", change: "Live", icon: Activity },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
                    <p className="text-muted-foreground mt-1">
                        Overview aktivitas dan statistik sistem ujian.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button>
                        <Calendar className="mr-2 h-4 w-4" />
                        Jadwal Baru
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className="border-none shadow-md bg-white hover:shadow-lg transition-all duration-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.label}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                <span className="text-green-600 font-medium flex items-center mr-1">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    {stat.change}
                                </span>
                                dari bulan lalu
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-xl font-semibold mb-4 text-slate-800">Menu Cepat</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link key={action.href} href={action.href}>
                                <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-slate-200 hover:border-primary/50 h-full">
                                    <CardContent className="p-6 flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${action.bg} ${action.color} group-hover:scale-110 transition-transform duration-200`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-lg text-slate-900 group-hover:text-primary transition-colors">
                                                {action.title}
                                            </h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {action.description}
                                            </p>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center">
                                            <ArrowRight className="h-5 w-5 text-slate-400" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Recent Activity / System Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Aktivitas Terkini</CardTitle>
                        <CardDescription>Log aktivitas sistem terbaru</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <Clock className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Sesi Ujian "Matematika XII IPA" dimulai</p>
                                        <p className="text-xs text-muted-foreground">2 menit yang lalu oleh Pak Budi</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                    <CardHeader>
                        <CardTitle className="text-white">Status Sistem</CardTitle>
                        <CardDescription className="text-slate-300">Informasi fitur dan pembaruan</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                <span>Server Operational</span>
                            </li>
                            <li className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                <span>Database Connected</span>
                            </li>
                            <li className="pt-4 border-t border-slate-700">
                                <p className="text-xs font-mono text-slate-400">Version 2.4.0 (Stable)</p>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
