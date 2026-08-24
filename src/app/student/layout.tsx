"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";
import { FileText, User, ShieldCheck, LogOut, Globe } from "lucide-react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";

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
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <a
                            href="https://porto.sman1campurdarat.sch.id/siswa/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1.5 rounded-full transition-colors font-medium shadow-xs"
                            title="Buka Portal Siswa PortoCarta"
                        >
                            <Globe className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Portal Siswa</span>
                        </a>
                        <div className="flex items-center gap-2 text-xs bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">Siswa</span>
                        </div>
                        <NotificationDropdown />
                        <ModeToggle />
                        <form action={logout}>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs">
                                <LogOut className="h-4 w-4 mr-1.5" />
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
