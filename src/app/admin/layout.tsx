import Link from "next/link"
import { Button } from "@/components/ui/button"
import { logout } from "@/actions/auth"
import { BookOpen, Users, Database, FileText, Calendar, ClipboardList, Edit3 } from "lucide-react"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const navItems = [
        { href: "/admin", label: "Dashboard", icon: ClipboardList },
        { href: "/admin/subjects", label: "Mata Pelajaran", icon: BookOpen },
        { href: "/admin/classes", label: "Kelas & Siswa", icon: Users },
        { href: "/admin/question-banks", label: "Bank Soal", icon: Database },
        { href: "/admin/exam-templates", label: "Template Ujian", icon: FileText },
        { href: "/admin/exam-sessions", label: "Sesi Ujian", icon: Calendar },
        { href: "/admin/grading", label: "Penilaian", icon: Edit3 },
        { href: "/admin/exams", label: "Ujian (Legacy)", icon: FileText },
        { href: "/admin/users", label: "Manajemen User", icon: Users },
    ];

    return (
        <div className="flex min-h-screen">
            <aside className="w-64 bg-gray-900 text-white p-6 flex flex-col">
                <h1 className="text-2xl font-bold mb-8">CartaExam Admin</h1>
                <nav className="space-y-2 flex-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                <Icon className="h-4 w-4" />
                                <span className="text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="mt-auto pt-8">
                    <form action={logout}>
                        <Button variant="destructive" className="w-full">Logout</Button>
                    </form>
                </div>
            </aside>
            <main className="flex-1 p-8 bg-gray-50">
                {children}
            </main>
        </div>
    )
}
