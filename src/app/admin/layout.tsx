import Link from "next/link"
import { Button } from "@/components/ui/button"
import { logout } from "@/actions/auth"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen">
            <aside className="w-64 bg-gray-900 text-white p-6">
                <h1 className="text-2xl font-bold mb-8">Admin Panel</h1>
                <nav className="space-y-4">
                    <Link href="/admin" className="block hover:text-gray-300">Dashboard</Link>
                    <Link href="/admin/exams" className="block hover:text-gray-300">Manajemen Ujian</Link>
                    <Link href="/admin/users" className="block hover:text-gray-300">Manajemen User</Link>
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
