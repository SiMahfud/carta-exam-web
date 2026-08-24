"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";
import { FileText, User, ShieldCheck, LogOut, Globe, GraduationCap, CheckCircle2, ChevronDown } from "lucide-react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StudentProfile {
    id: string;
    name: string;
    username: string;
    role: string;
    primaryClass?: {
        id: string;
        name: string;
        grade: number;
        academicYear: string;
    } | null;
}

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [profile, setProfile] = useState<StudentProfile | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch("/api/student/profile");
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.data) {
                        setProfile(data.data);
                    }
                }
            } catch (err) {
                console.error("Error loading student profile in layout:", err);
            }
        };

        fetchProfile();
    }, []);

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

    const initials = profile?.name
        ? profile.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        : "SW";

    const className = profile?.primaryClass?.name || "Siswa";

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

                    <div className="flex items-center gap-2 sm:gap-3">
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

                        {/* Student Profile Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-2.5 sm:px-3 gap-2 rounded-full border-border/80 hover:bg-accent/50 transition-all cursor-pointer"
                                >
                                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shrink-0">
                                        {initials}
                                    </div>
                                    <div className="hidden sm:flex flex-col text-left text-xs leading-tight">
                                        <span className="font-semibold text-foreground max-w-[120px] truncate">
                                            {profile ? profile.name : "Siswa"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {className}
                                        </span>
                                    </div>
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 p-2 shadow-lg">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold text-foreground leading-none">
                                                {profile?.name || "Profil Siswa"}
                                            </p>
                                            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400 border-green-300">
                                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                                Terverifikasi
                                            </Badge>
                                        </div>
                                        <p className="text-xs font-mono text-muted-foreground">
                                            NIS: {profile?.username || "-"}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <div className="px-2 py-1.5 text-xs text-muted-foreground space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
                                            Kelas:
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            {className}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                                            Tahun Ajaran:
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            {profile?.primaryClass?.academicYear || "2025/2026"}
                                        </span>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />
                                <form action={logout}>
                                    <DropdownMenuItem asChild>
                                        <button type="submit" className="w-full flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer">
                                            <LogOut className="h-4 w-4" />
                                            <span>Keluar Akun</span>
                                        </button>
                                    </DropdownMenuItem>
                                </form>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <NotificationDropdown />
                        <ModeToggle />
                    </div>
                </div>
            </header>
            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}

