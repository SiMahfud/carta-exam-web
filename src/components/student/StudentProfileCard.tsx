"use client";

import React from "react";
import { User, ShieldCheck, School, GraduationCap, Calendar, CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface StudentProfile {
    id: string;
    name: string;
    username: string; // NIS or Student ID
    role: string;
    primaryClass?: {
        id: string;
        name: string;
        grade: number;
        academicYear: string;
    } | null;
    classes?: Array<{
        id: string;
        name: string;
        grade: number;
        academicYear: string;
    }>;
}

interface StudentProfileCardProps {
    profile: StudentProfile | null;
    loading?: boolean;
    activeExamsCount?: number;
}

export function StudentProfileCard({ profile, loading, activeExamsCount = 0 }: StudentProfileCardProps) {
    if (loading) {
        return (
            <Card className="border shadow-xs overflow-hidden bg-card/60 backdrop-blur-sm animate-pulse mb-6">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-muted"></div>
                            <div className="space-y-2">
                                <div className="h-5 w-48 bg-muted rounded"></div>
                                <div className="h-4 w-32 bg-muted rounded"></div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="h-8 w-24 bg-muted rounded-full"></div>
                            <div className="h-8 w-24 bg-muted rounded-full"></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!profile) return null;

    // Generate initials
    const initials = profile.name
        ? profile.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        : "SW";

    const className = profile.primaryClass?.name || (profile.classes && profile.classes[0]?.name) || "Belum Terdaftar Kelas";
    const academicYear = profile.primaryClass?.academicYear || "2025/2026";

    return (
        <Card className="relative overflow-hidden border border-border/70 shadow-sm bg-gradient-to-br from-background via-background to-primary/5 mb-6">
            {/* Subtle decorative background glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none -mr-20 -mt-20"></div>

            <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Left: Avatar & Identity details */}
                    <div className="flex items-start sm:items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-primary-foreground font-bold text-lg sm:text-xl shadow-md shadow-primary/20 border-2 border-background">
                                {initials}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-0.5 rounded-full ring-2 ring-background" title="Akun Terverifikasi">
                                <CheckCircle2 className="w-4 h-4 fill-green-500 text-background" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                                    {profile.name}
                                </h2>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold text-xs px-2 py-0.5">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Siswa Aktif
                                </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs sm:text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1 font-mono font-medium text-foreground/80 bg-muted/60 px-2 py-0.5 rounded">
                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                    NIS: {profile.username}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                                    <strong className="text-foreground font-semibold">{className}</strong>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                    TA {academicYear}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Quick School Info & Exam Readiness */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/50">
                        <div className="flex items-center gap-2 bg-background/80 border border-border/60 px-3.5 py-2 rounded-xl text-xs">
                            <School className="w-4 h-4 text-primary" />
                            <div>
                                <div className="text-[10px] text-muted-foreground uppercase font-medium">Asal Sekolah</div>
                                <div className="font-semibold text-foreground">SMAN 1 Campurdarat</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 px-3.5 py-2 rounded-xl text-xs">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <div className="text-[10px] text-muted-foreground uppercase font-medium">Ujian Aktif</div>
                                <div className="font-bold text-primary">{activeExamsCount} Tersedia</div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
