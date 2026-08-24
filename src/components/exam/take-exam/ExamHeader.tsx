"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Clock,
    Send,
    Menu,
    CheckCircle2,
    Maximize2,
    Minimize2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExamHeaderProps {
    currentQuestionIndex: number;
    totalQuestions: number;
    timeRemaining: number;
    autoSaving: boolean;
    onShowSubmit: () => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    studentName?: string;
    studentUsername?: string;
    className?: string;
    fontSize?: "sm" | "base" | "lg" | "xl";
    onChangeFontSize?: (size: "sm" | "base" | "lg" | "xl") => void;
    isZenMode?: boolean;
    onToggleZenMode?: () => void;
}

export function ExamHeader({
    currentQuestionIndex,
    totalQuestions,
    timeRemaining,
    autoSaving,
    onShowSubmit,
    isSidebarOpen,
    setIsSidebarOpen,
    studentName,
    studentUsername,
    className,
    fontSize = "base",
    onChangeFontSize,
    isZenMode = false,
    onToggleZenMode,
}: ExamHeaderProps) {
    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const initials = studentName
        ? studentName
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        : "SW";

    const isNearEnd = timeRemaining > 0 && timeRemaining <= 300; // 5 mins
    const isWarningTime = timeRemaining > 300 && timeRemaining <= 900; // 15 mins

    return (
        <header className="bg-background/90 backdrop-blur-md border-b sticky top-0 z-20 shadow-xs">
            <div className="container mx-auto px-3 sm:px-4 h-16 flex justify-between items-center gap-2">
                {/* Left section: Hamburger / Question progress & Student identity */}
                <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
                    <Button
                        variant="outline"
                        size="icon"
                        className="lg:hidden shrink-0 h-9 w-9 rounded-lg border-border/80"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        aria-label="Buka Navigasi Soal"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    <div className="flex items-center gap-3 min-w-0">
                        {/* Student identity chip */}
                        {studentName && (
                            <div className="hidden md:flex items-center gap-2 bg-muted/50 border border-border/60 px-2.5 py-1 rounded-full text-xs shrink-0">
                                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                                    {initials}
                                </div>
                                <span className="font-semibold text-foreground truncate max-w-[130px]" title={`${studentName}${studentUsername ? ` (NIS: ${studentUsername})` : ""}`}>
                                    {studentName}
                                </span>
                                {className && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-none">
                                        {className}
                                    </Badge>
                                )}
                            </div>
                        )}

                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm sm:text-base text-foreground">
                                    Soal {currentQuestionIndex + 1}
                                </span>
                                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                                    / {totalQuestions}
                                </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground hidden sm:block">
                                CartaExam CBT
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right section: Sync status, Font Size scaler, Zen mode, Timer, Submit */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Auto-Save & Sync Status Indicator */}
                    <div className="hidden sm:flex items-center text-xs">
                        {autoSaving ? (
                            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                                Menyimpan...
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium" title="Jawaban aman tersimpan di cloud">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Tersimpan</span>
                            </span>
                        )}
                    </div>

                    {/* Font Size Scaler [ A- | A | A+ ] */}
                    {onChangeFontSize && (
                        <div className="hidden sm:flex items-center bg-muted/60 border border-border/80 rounded-lg p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => onChangeFontSize("sm")}
                                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${fontSize === "sm" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                                title="Ukuran Font Kecil"
                            >
                                A-
                            </button>
                            <button
                                type="button"
                                onClick={() => onChangeFontSize("base")}
                                className={`px-1.5 py-0.5 rounded text-xs font-semibold transition-colors ${fontSize === "base" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                                title="Ukuran Font Standar"
                            >
                                A
                            </button>
                            <button
                                type="button"
                                onClick={() => onChangeFontSize("lg")}
                                className={`px-1.5 py-0.5 rounded text-xs font-bold transition-colors ${fontSize === "lg" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                                title="Ukuran Font Besar"
                            >
                                A+
                            </button>
                        </div>
                    )}

                    {/* Zen / Focus Mode Toggle */}
                    {onToggleZenMode && (
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hidden md:flex"
                                        onClick={onToggleZenMode}
                                        aria-label="Mode Fokus"
                                    >
                                        {isZenMode ? (
                                            <Minimize2 className="h-4 w-4" />
                                        ) : (
                                            <Maximize2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p className="text-xs">{isZenMode ? "Keluar Mode Fokus" : "Mode Fokus (Zen Mode)"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {/* Timer Badge with Soft Transition */}
                    <div
                        className={`
                            flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full font-mono font-bold transition-colors
                            ${isNearEnd
                                ? "text-destructive bg-destructive/10 border border-red-300 dark:border-red-800 animate-pulse ring-2 ring-red-400/20"
                                : isWarningTime
                                    ? "text-primary bg-amber-500/10 dark:text-amber-400 border border-amber-300 dark:border-amber-700"
                                    : "text-primary bg-primary/10 border border-primary/20"}
                        `}
                        title="Sisa Waktu Ujian"
                    >
                        <Clock className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isNearEnd ? "text-destructive" : "text-primary"}`} />
                        <span className="text-sm sm:text-base tracking-tight">{formatTime(timeRemaining)}</span>
                    </div>

                    {/* Submit Button */}
                    <Button
                        onClick={onShowSubmit}
                        size="sm"
                        className="shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 px-3 sm:px-4 cursor-pointer"
                    >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        <span className="text-xs sm:text-sm">Kumpulkan</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
