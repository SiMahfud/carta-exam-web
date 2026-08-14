"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
    Activity,
    Search,
    RefreshCw,
    Clock,
    User,
    Calendar,
    Database,
    BookOpen,
    Users,
    FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface ActivityItem {
    id: string;
    description: string;
    timeAgo: string;
    createdAt: string | number;
    userName: string;
    userRole: string;
    action: string;
    entityType: string;
    details: Record<string, any>;
}

export default function ActivityLogsPage() {
    const { toast } = useToast();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterType, setFilterType] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchLogs = useCallback(async () => {
        setRefreshing(true);
        try {
            const url = filterType === "all"
                ? "/api/admin/activities?limit=100"
                : `/api/admin/activities?limit=100&entityType=${filterType}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("Gagal memuat log aktivitas");
            const data = await res.json();
            setActivities(Array.isArray(data) ? data : []);
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Gagal memuat riwayat aktivitas.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filterType, toast]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const filteredActivities = activities.filter((act) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            act.description.toLowerCase().includes(q) ||
            act.userName.toLowerCase().includes(q) ||
            act.action.toLowerCase().includes(q)
        );
    });

    const getActionBadge = (action: string) => {
        switch (action) {
            case "created":
                return <Badge className="bg-emerald-600 text-xs">Dibuat</Badge>;
            case "updated":
                return <Badge className="bg-blue-600 text-xs">Diperbarui</Badge>;
            case "deleted":
                return <Badge variant="destructive" className="text-xs">Dihapus</Badge>;
            case "started":
                return <Badge className="bg-purple-600 text-xs">Dimulai</Badge>;
            case "completed":
                return <Badge className="bg-slate-700 text-xs">Selesai</Badge>;
            default:
                return <Badge variant="outline" className="text-xs">{action}</Badge>;
        }
    };

    const getEntityIcon = (type: string) => {
        switch (type) {
            case "exam_session":
                return <Calendar className="h-4 w-4 text-blue-500" />;
            case "question_bank":
                return <Database className="h-4 w-4 text-purple-500" />;
            case "subject":
                return <BookOpen className="h-4 w-4 text-emerald-500" />;
            case "class":
                return <Users className="h-4 w-4 text-amber-500" />;
            case "user":
                return <User className="h-4 w-4 text-rose-500" />;
            default:
                return <Activity className="h-4 w-4 text-slate-500" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="h-6 w-6 text-primary" />
                        Log Aktivitas Sistem
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Rekam jejak audit keamanan, perubahan data, dan aktivitas ujian sekolah.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchLogs}
                    disabled={refreshing}
                    className="self-start sm:self-auto gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    Segarkan
                </Button>
            </div>

            {/* Filter Tabs & Search Box */}
            <Card className="p-4 border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="flex flex-wrap gap-1 bg-muted/60 p-1 rounded-lg border text-xs">
                        {[
                            { id: "all", label: "Semua" },
                            { id: "exam_session", label: "Sesi Ujian" },
                            { id: "question_bank", label: "Bank Soal" },
                            { id: "subject", label: "Mata Pelajaran" },
                            { id: "class", label: "Kelas" },
                            { id: "user", label: "User" },
                        ].map((tab) => (
                            <Button
                                key={tab.id}
                                size="sm"
                                variant={filterType === tab.id ? "default" : "ghost"}
                                onClick={() => setFilterType(tab.id)}
                                className="text-xs h-7 px-3"
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Cari aktivitas / user..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 text-xs h-8"
                        />
                    </div>
                </div>
            </Card>

            {/* Activity Log List */}
            <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Riwayat Terkini</CardTitle>
                    <CardDescription>
                        Menampilkan {filteredActivities.length} catatan audit log terakhir
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                    {loading ? (
                        <div className="space-y-3 py-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-lg" />
                            ))}
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <EmptyState
                            icon={FileText}
                            title="Belum Ada Log Aktivitas"
                            description="Tidak ditemukan log aktivitas yang sesuai dengan kriteria filter."
                        />
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredActivities.map((act) => (
                                <div
                                    key={act.id}
                                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm hover:bg-muted/40 px-2 rounded-lg transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-muted border shrink-0 mt-0.5">
                                            {getEntityIcon(act.entityType)}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-foreground">
                                                    {act.description}
                                                </span>
                                                {getActionBadge(act.action)}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {act.userName} ({act.userRole})
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {act.timeAgo}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {act.createdAt && (
                                        <span className="text-xs text-muted-foreground shrink-0 font-mono sm:text-right">
                                            {format(new Date(act.createdAt), "d MMM yyyy, HH:mm", { locale: idLocale })}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
