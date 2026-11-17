"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { format, addDays, subDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
    Calendar as CalendarIcon,
    Clock,
    Users,
    Monitor,
    BookOpen,
    Key,
    ChevronLeft,
    ChevronRight,
    RotateCw,
    Sparkles,
    CheckCircle2,
    PlayCircle,
    CalendarDays,
    BarChart3,
    ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface ExamSessionItem {
    id: string;
    sessionName: string;
    status: string;
    effectiveStatus: "active" | "scheduled" | "completed" | "cancelled";
    startTime: string;
    endTime: string;
    durationMinutes: number;
    templateId: string;
    templateName: string;
    subjectName: string;
    subjectCode: string | null;
    creatorName: string | null;
    requireToken: boolean;
    accessToken: string | null;
    targetType: "class" | "individual";
    targetCount: number;
    targetNames: string[];
    submissions: {
        total: number;
        inProgress: number;
        completed: number;
    };
}

interface ScheduleResponse {
    date: string;
    summary: {
        total: number;
        active: number;
        scheduled: number;
        completed: number;
    };
    sessions: ExamSessionItem[];
}

export function TodayExamSchedule({ className }: { className?: string }) {
    // Current date in YYYY-MM-DD
    const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [expandedTargets, setExpandedTargets] = useState<Record<string, boolean>>({});

    const isToday = selectedDate === todayStr;
    const isYesterday = selectedDate === format(subDays(new Date(), 1), "yyyy-MM-dd");
    const isTomorrow = selectedDate === format(addDays(new Date(), 1), "yyyy-MM-dd");

    const fetchSchedule = async (date: string, showRefreshing = false) => {
        if (showRefreshing) setIsRefreshing(true);
        else setLoading(true);

        try {
            const res = await fetch(`/api/admin/exam-schedule?date=${date}`);
            if (res.ok) {
                const rawData = await res.json();
                // Handle both wrapped { data: { ... } } and direct { ... }
                const data = (rawData && typeof rawData === 'object' && 'data' in rawData && rawData.data)
                    ? rawData.data
                    : rawData;

                if (data && data.summary && Array.isArray(data.sessions)) {
                    setScheduleData(data);
                } else {
                    setScheduleData(null);
                }
            } else {
                setScheduleData(null);
            }
        } catch (error) {
            console.error("Gagal memuat jadwal ujian:", error);
            setScheduleData(null);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSchedule(selectedDate);
    }, [selectedDate]);

    // Navigation functions
    const handlePrevDay = () => {
        const prev = subDays(new Date(selectedDate + "T12:00:00"), 1);
        setSelectedDate(format(prev, "yyyy-MM-dd"));
    };

    const handleNextDay = () => {
        const next = addDays(new Date(selectedDate + "T12:00:00"), 1);
        setSelectedDate(format(next, "yyyy-MM-dd"));
    };

    const handleSetToday = () => {
        setSelectedDate(todayStr);
    };

    const toggleExpandTargets = (sessionId: string) => {
        setExpandedTargets(prev => ({
            ...prev,
            [sessionId]: !prev[sessionId]
        }));
    };

    // Date label formatted nicely in Indonesian
    const formattedDateLabel = useMemo(() => {
        try {
            const dateObj = new Date(selectedDate + "T12:00:00");
            return format(dateObj, "EEEE, d MMMM yyyy", { locale: idLocale });
        } catch {
            return selectedDate;
        }
    }, [selectedDate]);

    const getStatusBadge = (status: ExamSessionItem["effectiveStatus"]) => {
        switch (status) {
            case "active":
                return (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 px-2.5 py-0.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Sedang Berlangsung
                    </Badge>
                );
            case "scheduled":
                return (
                    <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/30 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Terjadwal
                    </Badge>
                );
            case "completed":
                return (
                    <Badge variant="secondary" className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-slate-500" />
                        Selesai
                    </Badge>
                );
            case "cancelled":
                return (
                    <Badge variant="destructive" className="flex items-center gap-1">
                        Dibatalkan
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Card className={cn("border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden", className)}>
            <CardHeader className="bg-gradient-to-r from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900 border-b pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Title & Date display */}
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                                <CalendarDays className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                        Jadwal Ujian
                                    </CardTitle>
                                    {isToday && (
                                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 border-none font-medium">
                                            Hari Ini
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription className="text-sm font-medium text-slate-600 dark:text-slate-300 capitalize mt-0.5">
                                    {formattedDateLabel}
                                </CardDescription>
                            </div>
                        </div>
                    </div>

                    {/* Date Controls & Switcher */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Quick filter buttons */}
                        <div className="inline-flex rounded-lg border bg-slate-100/80 dark:bg-slate-800 p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setSelectedDate(format(subDays(new Date(), 1), "yyyy-MM-dd"))}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-md font-medium transition-all",
                                    isYesterday
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-muted-foreground hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                Kemarin
                            </button>
                            <button
                                type="button"
                                onClick={handleSetToday}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-md font-medium transition-all",
                                    isToday
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-muted-foreground hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                Hari Ini
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedDate(format(addDays(new Date(), 1), "yyyy-MM-dd"))}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-md font-medium transition-all",
                                    isTomorrow
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-muted-foreground hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                Besok
                            </button>
                        </div>

                        {/* Date Navigation & Picker */}
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handlePrevDay}
                                title="Hari Sebelumnya"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            {/* Native date picker with modern styling */}
                            <div className="relative">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => {
                                        if (e.target.value) setSelectedDate(e.target.value);
                                    }}
                                    className="h-8 px-2.5 text-xs rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleNextDay}
                                title="Hari Berikutnya"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8 text-muted-foreground", isRefreshing && "animate-spin")}
                                onClick={() => fetchSchedule(selectedDate, true)}
                                title="Segarkan Data"
                            >
                                <RotateCw className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Summary Pills */}
                {scheduleData?.summary && scheduleData.summary.total > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-3 mt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-xs text-muted-foreground mr-1">Ringkasan Sesi:</span>
                        <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            Total: <strong className="ml-1 text-slate-900 dark:text-white">{scheduleData.summary.total}</strong>
                        </Badge>
                        {scheduleData.summary.active > 0 && (
                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                                Berlangsung: <strong className="ml-1">{scheduleData.summary.active}</strong>
                            </Badge>
                        )}
                        {scheduleData.summary.scheduled > 0 && (
                            <Badge variant="outline" className="text-blue-700 bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                                Terjadwal: <strong className="ml-1">{scheduleData.summary.scheduled}</strong>
                            </Badge>
                        )}
                        {scheduleData.summary.completed > 0 && (
                            <Badge variant="outline" className="text-slate-600 bg-slate-50 dark:bg-slate-800/60">
                                Selesai: <strong className="ml-1">{scheduleData.summary.completed}</strong>
                            </Badge>
                        )}
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-5">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className="border-slate-200 dark:border-slate-700">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-4 w-28" />
                                        <Skeleton className="h-5 w-20 rounded-full" />
                                    </div>
                                    <Skeleton className="h-5 w-3/4" />
                                    <div className="space-y-1.5 pt-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-4 w-48" />
                                    </div>
                                    <div className="pt-3 border-t">
                                        <Skeleton className="h-8 w-full rounded-md" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : !scheduleData || !scheduleData.sessions || scheduleData.sessions.length === 0 ? (
                    <EmptyState
                        icon={CalendarIcon}
                        title={`Tidak ada ujian pada ${isToday ? "hari ini" : formattedDateLabel}`}
                        description="Tidak ada sesi ujian yang terjadwal atau aktif pada tanggal ini."
                        action={{
                            label: "Buat Sesi Ujian Baru",
                            onClick: () => {
                                window.location.href = "/admin/exam-sessions/create";
                            },
                        }}
                        className="py-10 border-none bg-slate-50/50 dark:bg-slate-850/50 rounded-xl"
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(scheduleData.sessions || []).map((session) => {
                            const isExpanded = expandedTargets[session.id] || false;
                            const hasManyTargets = session.targetNames.length > 3;
                            const displayedTargets = isExpanded
                                ? session.targetNames
                                : session.targetNames.slice(0, 3);

                            const startTimeFormatted = format(new Date(session.startTime), "HH:mm");
                            const endTimeFormatted = format(new Date(session.endTime), "HH:mm");

                            const isSessionActive = session.effectiveStatus === "active";
                            const isSessionCompleted = session.effectiveStatus === "completed";

                            return (
                                <Card
                                    key={session.id}
                                    className={cn(
                                        "group flex flex-col justify-between transition-all duration-200 border-slate-200 dark:border-slate-700 hover:shadow-md",
                                        isSessionActive && "border-emerald-500/60 dark:border-emerald-600/70 shadow-sm shadow-emerald-500/10 bg-gradient-to-b from-emerald-50/20 to-transparent dark:from-emerald-950/10"
                                    )}
                                >
                                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                        {/* Top Header: Subject & Status */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary">
                                                    <BookOpen className="h-3 w-3" />
                                                    {session.subjectName}
                                                </span>
                                                {getStatusBadge(session.effectiveStatus)}
                                            </div>

                                            {/* Session Name */}
                                            <h4 className="font-bold text-base text-slate-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
                                                {session.sessionName}
                                            </h4>
                                            <p className="text-xs text-muted-foreground truncate">
                                                Format: {session.templateName}
                                            </p>
                                        </div>

                                        {/* Details metadata */}
                                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                                            {/* Time & Duration */}
                                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                                    <span className="font-medium">
                                                        {startTimeFormatted} - {endTimeFormatted} WIB
                                                    </span>
                                                </div>
                                                <span className="text-muted-foreground">
                                                    {session.durationMinutes} menit
                                                </span>
                                            </div>

                                            {/* Target Classes / Students */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                                        <span className="font-medium">
                                                            {session.targetType === "class"
                                                                ? `${session.targetCount} Kelas Target`
                                                                : `${session.targetCount} Siswa`}
                                                        </span>
                                                    </div>
                                                    {session.requireToken && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-400 text-amber-700 dark:text-amber-400 gap-0.5">
                                                            <Key className="h-2.5 w-2.5" />
                                                            Token
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Target names badges */}
                                                {session.targetType === "class" && session.targetNames.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                                        {displayedTargets.map((cls, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                                            >
                                                                {cls}
                                                            </span>
                                                        ))}
                                                        {hasManyTargets && (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleExpandTargets(session.id)}
                                                                className="px-1.5 py-0.5 rounded text-[10px] font-medium text-primary hover:underline"
                                                            >
                                                                {isExpanded ? "Tutup" : `+${session.targetNames.length - 3} lainnya`}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Live Submissions Tracker (if active or has submissions) */}
                                            {session.submissions.total > 0 && (
                                                <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                                                    <span className="text-[11px] text-muted-foreground">Progres Siswa:</span>
                                                    <div className="flex items-center gap-2 text-[11px] font-medium">
                                                        {session.submissions.inProgress > 0 && (
                                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                                {session.submissions.inProgress} aktif
                                                            </span>
                                                        )}
                                                        <span className="text-slate-600 dark:text-slate-300">
                                                            {session.submissions.completed} selesai
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            ({session.submissions.total} total)
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <div className="pt-2">
                                            {isSessionActive ? (
                                                <Link href={`/admin/exam-sessions/${session.id}`} className="block">
                                                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-2">
                                                        <Monitor className="h-4 w-4" />
                                                        Monitor Ujian Langsung
                                                    </Button>
                                                </Link>
                                            ) : isSessionCompleted ? (
                                                <div className="flex gap-2">
                                                    <Link href={`/admin/exam-sessions/${session.id}/results`} className="flex-1">
                                                        <Button variant="outline" className="w-full text-xs flex items-center justify-center gap-1.5">
                                                            <BarChart3 className="h-3.5 w-3.5" />
                                                            Lihat Nilai
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/admin/exam-sessions/${session.id}`}>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9" title="Detail Sesi">
                                                            <ArrowUpRight className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Link href={`/admin/exam-sessions/${session.id}`} className="flex-1">
                                                        <Button variant="outline" className="w-full text-xs flex items-center justify-center gap-1.5">
                                                            <Monitor className="h-3.5 w-3.5" />
                                                            Ruang Monitor
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/admin/exam-sessions/${session.id}/edit`}>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9" title="Edit Sesi">
                                                            <ArrowUpRight className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

