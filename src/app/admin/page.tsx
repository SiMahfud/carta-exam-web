"use client";

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
    ArrowRight,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Stat {
    label: string;
    value: string;
    change: string;
    icon: string;
}

interface ActivityLog {
    id: string;
    description: string;
    timeAgo: string;
    userName: string;
    action: string;
    entityType: string;
}

interface HealthStatus {
    server: {
        status: "operational" | "degraded" | "down";
        responseTime: string;
    };
    database: {
        status: "connected" | "down";
        responseTime: string;
    };
    version: string;
}

export default function AdminDashboard() {
    const { toast } = useToast();
    const [stats, setStats] = useState<Record<string, Stat> | null>(null);
    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch stats
                const statsRes = await fetch("/api/admin/stats");
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setStats(statsData);
                }

                // Fetch activities
                const activitiesRes = await fetch("/api/admin/activities?limit=5");
                if (activitiesRes.ok) {
                    const activitiesData = await activitiesRes.json();
                    setActivities(activitiesData);
                }

                // Fetch health
                const healthRes = await fetch("/api/admin/health");
                if (healthRes.ok) {
                    const healthData = await healthRes.json();
                    setHealth(healthData);
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                toast({
                    title: "Error",
                    description: "Gagal memuat data dashboard",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [toast]);

    const getIconComponent = (iconName: string) => {
        const icons: Record<string, typeof Users> = {
            Users,
            FileText,
            Activity,
        };
        return icons[iconName] || Activity;
    };

    const getActivityIcon = (entityType: string) => {
        const icons: Record<string, typeof Clock> = {
            exam_session: Calendar,
            question_bank: Database,
            subject: BookOpen,
            class: Users,
            user: GraduationCap,
        };
        return icons[entityType] || Clock;
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h2>
                    <p className="text-muted-foreground mt-1">
                        Overview aktivitas dan statistik sistem ujian.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/exam-sessions">
                        <Button>
                            <Calendar className="mr-2 h-4 w-4" />
                            Jadwal Baru
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {loading ? (
                    // Loading skeleton
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="border-none shadow-md bg-white dark:bg-slate-800">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-20 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </CardContent>
                        </Card>
                    ))
                ) : stats ? (
                    Object.values(stats).map((stat, i) => {
                        const Icon = getIconComponent(stat.icon);
                        return (
                            <Card key={i} className="border-none shadow-md bg-white dark:bg-slate-800 hover:shadow-lg transition-all duration-200">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {stat.label}
                                    </CardTitle>
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                        <span className="text-green-600 font-medium flex items-center mr-1">
                                            <TrendingUp className="h-3 w-3 mr-1" />
                                            {stat.change}
                                        </span>
                                        {stat.change !== "Live" && "dari bulan lalu"}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })
                ) : null}
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">Menu Cepat</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link key={action.href} href={action.href}>
                                <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-slate-200 dark:border-slate-700 hover:border-primary/50 h-full dark:bg-slate-800">
                                    <CardContent className="p-6 flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${action.bg} dark:bg-opacity-20 ${action.color} group-hover:scale-110 transition-transform duration-200`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                                {action.title}
                                            </h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {action.description}
                                            </p>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center dark:text-slate-300">
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
                <Card className="border-slate-200 dark:border-slate-700 shadow-sm dark:bg-slate-800">
                    <CardHeader>
                        <CardTitle>Aktivitas Terkini</CardTitle>
                        <CardDescription>Log aktivitas sistem terbaru</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-start gap-3 pb-4 border-b last:border-0">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activities.length > 0 ? (
                            <div className="space-y-4">
                                {activities.map((activity, i) => {
                                    const Icon = getActivityIcon(activity.entityType);
                                    return (
                                        <div key={activity.id} className={`flex items-start gap-3 pb-4 ${i < activities.length - 1 ? 'border-b' : ''}`}>
                                            <div className="bg-blue-100 p-2 rounded-full">
                                                <Icon className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.description}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {activity.timeAgo} oleh {activity.userName}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState
                                icon={Activity}
                                title="Belum ada aktivitas"
                                description="Aktivitas sistem akan muncul di sini."
                                className="py-8 border-none bg-transparent"
                            />
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                    <CardHeader>
                        <CardTitle className="text-white">Status Sistem</CardTitle>
                        <CardDescription className="text-slate-300">Informasi fitur dan pembaruan</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <ul className="space-y-3">
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <Skeleton className="h-2 w-2 rounded-full bg-slate-600" />
                                        <Skeleton className="h-4 w-32 bg-slate-700" />
                                    </li>
                                ))}
                            </ul>
                        ) : health ? (
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2 text-sm">
                                    <div className={`h-2 w-2 rounded-full ${health.server.status === "operational" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`}></div>
                                    <span>Server {health.server.status === "operational" ? "Operational" : "Down"}</span>
                                    <span className="text-xs text-slate-400">({health.server.responseTime})</span>
                                </li>
                                <li className="flex items-center gap-2 text-sm">
                                    <div className={`h-2 w-2 rounded-full ${health.database.status === "connected" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`}></div>
                                    <span>Database {health.database.status === "connected" ? "Connected" : "Down"}</span>
                                    <span className="text-xs text-slate-400">({health.database.responseTime})</span>
                                </li>
                                <li className="pt-4 border-t border-slate-700">
                                    <p className="text-xs font-mono text-slate-400">Version {health.version}</p>
                                </li>
                            </ul>
                        ) : (
                            <ul className="space-y-3">
                                <li className="flex items-center gap-2 text-sm">
                                    <div className="h-2 w-2 rounded-full bg-slate-500"></div>
                                    <span>Checking status...</span>
                                </li>
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
