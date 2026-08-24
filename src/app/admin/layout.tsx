"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";
import {
    BookOpen,
    Users,
    Database,
    FileText,
    Calendar,
    Edit3,
    LogOut,
    Menu,
    X,
    LayoutDashboard,
    GraduationCap,
    Settings,
    Search,
    HelpCircle,
    Activity,
    Globe,
    CheckCircle2,
    Shield,
    Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/global-search/GlobalSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { useKeyboardShortcuts, getAdminShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsHelp } from "@/components/ui/keyboard-shortcuts-help";
import { RecentItemsDropdown } from "@/components/ui/recent-items";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";

interface UserSession {
    id: string;
    name: string;
    role: "admin" | "teacher" | "student";
}

function getInitials(name: string): string {
    if (!name) return "AD";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
    const [user, setUser] = useState<UserSession | null>(null);

    useEffect(() => {
        fetch("/api/auth/session")
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    setUser(data.user);
                }
            })
            .catch(err => console.error("Error fetching session:", err));
    }, []);

    // Initialize keyboard shortcuts
    const shortcuts = getAdminShortcuts(router, {
        openSearch: () => setIsSearchOpen(true),
        openShortcutsHelp: () => setIsShortcutsHelpOpen(true),
    });
    useKeyboardShortcuts({ shortcuts });

    const isAdmin = user?.role === "admin";

    // Navigation items with role-based visibility
    const navItems = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
        { href: "/admin/subjects", label: "Mata Pelajaran", icon: BookOpen, adminOnly: false },
        { href: "/admin/classes", label: "Kelas & Siswa", icon: Users, adminOnly: false },
        { href: "/admin/question-banks", label: "Bank Soal", icon: Database, adminOnly: false },
        { href: "/admin/exam-templates", label: "Template Ujian", icon: FileText, adminOnly: false },
        { href: "/admin/exam-sessions", label: "Sesi Ujian", icon: Calendar, adminOnly: false },
        { href: "/admin/grading", label: "Penilaian", icon: Edit3, adminOnly: false },
        // Menu Khusus Administrator Sistem
        { href: "/admin/users", label: "Manajemen User", icon: GraduationCap, adminOnly: true },
        { href: "/admin/settings", label: "Pengaturan Sekolah", icon: Settings, adminOnly: true },
        { href: "/admin/activity-logs", label: "Log Aktivitas", icon: Activity, adminOnly: true },
    ];

    const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

    return (
        <div className="min-h-screen bg-muted/30 dark:bg-background flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                data-tour="sidebar"
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block shadow-xl",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-full flex flex-col">
                    <div className="h-16 flex items-center px-6 border-b border-slate-800">
                        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                            <div className="bg-primary/20 p-1.5 rounded-lg text-primary">
                                {isAdmin ? <Shield className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                            </div>
                            <span>
                                Carta<span className="text-primary">{isAdmin ? "Admin" : "Guru"}</span>
                            </span>
                        </div>
                        <button
                            className="ml-auto lg:hidden text-slate-400 hover:text-white"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                        <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {isAdmin ? "Menu Utama & Sistem" : "Menu Pembelajaran & Ujian"}
                        </div>
                        {visibleNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                                        isActive
                                            ? "bg-primary text-white shadow-md shadow-primary/20"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
                                    <span className="font-medium text-sm">{item.label}</span>
                                    {item.adminOnly && (
                                        <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                                            Admin
                                        </span>
                                    )}
                                </Link>
                            );
                        })}

                        {/* Tautan Pintas ke PortoCarta */}
                        <div className="pt-4 mt-4 border-t border-slate-800/80 px-2">
                            <a
                                href="https://porto.sman1campurdarat.sch.id/dashboard"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/50 transition-all"
                            >
                                <Globe className="h-4 w-4 text-indigo-400" />
                                <span>Portal PortoCarta</span>
                            </a>
                        </div>
                    </div>

                    {/* Profil Pengguna Dinamis */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <Avatar className="h-9 w-9 border border-slate-700">
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-slate-800 text-slate-300 font-semibold text-xs">
                                    {getInitials(user?.name || "")}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-white truncate" title={user?.name || "Memuat..."}>
                                    {user?.name || "Memuat..."}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                        isAdmin
                                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    )}>
                                        {isAdmin ? "Administrator" : "Guru / Pendidik"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <form action={logout}>
                            <Button
                                variant="destructive"
                                className="w-full justify-start bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-none text-xs h-9"
                            >
                                <LogOut className="mr-2 h-3.5 w-3.5" />
                                Logout
                            </Button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-background border-b flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu className="h-6 w-6" />
                        </Button>
                        <h2 className="font-semibold text-lg text-slate-800 dark:text-white hidden sm:block">
                            {navItems.find(item => item.href === pathname)?.label || "Dashboard"}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Tombol Pintas ke PortoCarta */}
                        <a
                            href="https://porto.sman1campurdarat.sch.id/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-medium transition-all mr-1 shadow-xs"
                            title="Buka Portal Induk PortoCarta"
                        >
                            <Globe className="h-3.5 w-3.5" />
                            <span>Portal Sekolah</span>
                        </a>

                        {/* Search Button */}
                        <Button
                            data-tour="global-search"
                            variant="outline"
                            className="hidden sm:flex items-center gap-2 text-muted-foreground"
                            onClick={() => setIsSearchOpen(true)}
                        >
                            <Search className="h-4 w-4" />
                            <span className="text-sm">Cari...</span>
                            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                                Ctrl+K
                            </kbd>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="sm:hidden"
                            onClick={() => setIsSearchOpen(true)}
                        >
                            <Search className="h-5 w-5" />
                        </Button>
                        <ModeToggle />
                        <NotificationDropdown />
                        <Link href="/help" data-tour="help-button">
                            <Button variant="ghost" size="icon" title="Pusat Bantuan">
                                <HelpCircle className="h-5 w-5" />
                            </Button>
                        </Link>
                        <RecentItemsDropdown />
                        
                        {/* User Menu Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src="" />
                                        <AvatarFallback className="font-semibold text-xs">
                                            {getInitials(user?.name || "")}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-60" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-semibold leading-none truncate">{user?.name || "Memuat..."}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {isAdmin ? "Hak Akses: Administrator" : "Hak Akses: Guru / Pendidik"}
                                        </p>
                                        <p className="text-[11px] leading-none text-emerald-600 dark:text-emerald-400 font-medium pt-1 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> SSO PortoCarta Aktif
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <a href="https://porto.sman1campurdarat.sch.id/dashboard" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                                        <Globe className="h-4 w-4 mr-2 text-indigo-500" />
                                        Buka Portal PortoCarta
                                    </a>
                                </DropdownMenuItem>
                                {isAdmin && (
                                    <DropdownMenuItem asChild>
                                        <Link href="/admin/settings" className="cursor-pointer">
                                            <Settings className="h-4 w-4 mr-2" />
                                            Pengaturan Sistem & Sync
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                    <form action={logout} className="w-full">
                                        <button type="submit" className="w-full text-left">Logout</button>
                                    </form>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        <Breadcrumbs />
                        {children}
                    </div>
                </main>
            </div>

            {/* Global Search Dialog */}
            <GlobalSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />

            {/* Keyboard Shortcuts Help */}
            <KeyboardShortcutsHelp
                open={isShortcutsHelpOpen}
                onOpenChange={setIsShortcutsHelpOpen}
                shortcuts={shortcuts}
            />
        </div>
    );
}
