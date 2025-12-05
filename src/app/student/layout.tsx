"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";
import { FileText, User, ShieldCheck, LogOut } from "lucide-react";

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    // Check if currently in an active exam session (taking exam)
    // Path pattern: /student/exams/[sessionId] (not just /student/exams)
    const isInExamSession = pathname?.match(/^\/student\/exams\/[^\/]+$/);

    // If in exam session, render minimal layout without header
    if (isInExamSession) {
        return (
            <div className="min-h-screen bg-background">
                {children}
            </div>
        );
    }

    // Normal layout with header
    return (
        <div className="min-h-screen flex flex-col bg-muted/30">
            <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <Link href="/student/exams" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                            <div className="bg-primary/10 p-1.5 rounded-lg">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 hidden sm:inline-block">
                                CartaExam
                            </span>
                        </Link>
                        <nav className="flex gap-4 ml-4 border-l pl-4 h-6 items-center">
                            <Link href="/student/exams" className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
                                <FileText className="h-4 w-4" />
                                Ujian Saya
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Siswa</span>
                        </div>
                        <form action={logout}>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <LogOut className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Keluar</span>
                            </Button>
                        </form>
                    </div>
                </div>
            </header>
            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
