import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";
import { FileText, User } from "lucide-react";

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-white border-b">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <h1 className="text-xl font-bold">CartaExam</h1>
                        <nav className="flex gap-4">
                            <Link href="/student/exams" className="flex items-center gap-2 text-sm hover:text-primary">
                                <FileText className="h-4 w-4" />
                                Ujian Saya
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4" />
                            <span className="font-medium">Student User</span>
                        </div>
                        <form action={logout}>
                            <Button variant="outline" size="sm">Logout</Button>
                        </form>
                    </div>
                </div>
            </header>
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
