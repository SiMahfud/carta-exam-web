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
    Keyboard,
    HelpCircle
} from "lucide-react";
import { useState } from "react";
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
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

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

    // Initialize keyboard shortcuts
    const shortcuts = getAdminShortcuts(router, {
        openSearch: () => setIsSearchOpen(true),
        openShortcutsHelp: () => setIsShortcutsHelpOpen(true),
    });
    useKeyboardShortcuts({ shortcuts });

    const navItems = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/subjects", label: "Mata Pelajaran", icon: BookOpen },
        { href: "/admin/classes", label: "Kelas & Siswa", icon: Users },
        { href: "/admin/question-banks", label: "Bank Soal", icon: Database },
        { href: "/admin/exam-templates", label: "Template Ujian", icon: FileText },
        { href: "/admin/exam-sessions", label: "Sesi Ujian", icon: Calendar },
        { href: "/admin/grading", label: "Penilaian", icon: Edit3 },
        { href: "/admin/users", label: "Manajemen User", icon: GraduationCap },
    ];

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
                            <div className="bg-primary/20 p-1.5 rounded-lg">
                                <Settings className="h-5 w-5 text-primary" />
                            </div>
                            <span>Carta<span className="text-primary">Admin</span></span>
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
                            Menu Utama
                        </div>
                        {navItems.map((item) => {
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
                                </Link>
                            );
                        })}
                    </div>

                    <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <Avatar className="h-9 w-9 border border-slate-700">
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-slate-800 text-slate-300">AD</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-white truncate">Administrator</p>
                                <p className="text-xs text-slate-500 truncate">admin@cartaexam.com</p>
                            </div>
                        </div>
                        <form action={logout}>
                            <Button
                                variant="destructive"
                                className="w-full justify-start bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-none"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
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
                        <Link href="/help" data-tour="help-button">
                            <Button variant="ghost" size="icon" title="Pusat Bantuan">
                                <HelpCircle className="h-5 w-5" />
                            </Button>
                        </Link>
                        <RecentItemsDropdown />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src="" />
                                        <AvatarFallback>AD</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">Administrator</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            admin@cartaexam.com
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    Settings
                                </DropdownMenuItem>
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

            {/* Onboarding Tour */}
            <OnboardingTour />
        </div>
    )
}
