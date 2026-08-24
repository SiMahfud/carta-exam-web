"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Layers } from "lucide-react";
import { Question, Answer } from "./types";

interface ExamSidebarProps {
    questions: Question[];
    answers: Map<string, Answer>;
    currentQuestionIndex: number;
    setCurrentQuestionIndex: (index: number) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
}

type FilterType = "all" | "unanswered" | "flagged" | "answered";

export function ExamSidebar({
    questions,
    answers,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    isSidebarOpen,
    setIsSidebarOpen,
}: ExamSidebarProps) {
    const [filter, setFilter] = useState<FilterType>("all");

    const totalQuestions = questions.length;
    const answeredCount = Array.from(answers.values()).filter(a => a.answer !== undefined && a.answer !== null && a.answer !== "").length;
    const flaggedCount = Array.from(answers.values()).filter(a => a.isFlagged).length;
    const unansweredCount = totalQuestions - answeredCount;
    const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

    // Filter questions list
    const filteredQuestions = questions.map((q, originalIdx) => {
        const ans = answers.get(q.id);
        const isAnswered = ans?.answer !== undefined && ans?.answer !== null && ans?.answer !== "";
        const isFlagged = !!ans?.isFlagged;

        let visible = true;
        if (filter === "unanswered") visible = !isAnswered;
        if (filter === "flagged") visible = isFlagged;
        if (filter === "answered") visible = isAnswered && !isFlagged;

        return {
            question: q,
            originalIndex: originalIdx,
            isAnswered,
            isFlagged,
            visible,
        };
    });

    return (
        <>
            <aside
                className={`
                    fixed inset-y-0 left-0 z-30 w-72 sm:w-80 bg-background border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block lg:w-80 lg:bg-transparent lg:border-none shrink-0
                    ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
                `}
            >
                <div className="h-full flex flex-col p-4 lg:p-0">
                    {/* Mobile Header */}
                    <div className="flex justify-between items-center mb-4 lg:hidden">
                        <div className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-primary" />
                            <h3 className="font-bold text-base">Lembar Navigasi Soal</h3>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsSidebarOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <Card className="flex-1 flex flex-col overflow-hidden border shadow-sm bg-card/70 backdrop-blur-md rounded-2xl">
                        {/* Progress Overview */}
                        <div className="p-4 border-b bg-muted/20 space-y-3">
                            <div className="flex justify-between items-center text-xs font-semibold">
                                <span className="text-muted-foreground">Progres Pengerjaan</span>
                                <span className="text-primary font-bold">{progressPercent}% ({answeredCount}/{totalQuestions})</span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-primary to-emerald-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>

                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                                <div className="bg-background p-1.5 rounded-lg border border-border/60">
                                    <div className="text-[10px] text-muted-foreground">Terjawab</div>
                                    <div className="font-bold text-emerald-600 text-sm">{answeredCount}</div>
                                </div>
                                <div className="bg-background p-1.5 rounded-lg border border-border/60">
                                    <div className="text-[10px] text-muted-foreground">Ragu-ragu</div>
                                    <div className="font-bold text-amber-500 text-sm">{flaggedCount}</div>
                                </div>
                                <div className="bg-background p-1.5 rounded-lg border border-border/60">
                                    <div className="text-[10px] text-muted-foreground">Belum</div>
                                    <div className="font-bold text-muted-foreground text-sm">{unansweredCount}</div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Filter Tabs */}
                        <div className="px-3 pt-3 flex flex-wrap gap-1 border-b pb-2 bg-muted/10">
                            <button
                                type="button"
                                onClick={() => setFilter("all")}
                                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                            >
                                Semua ({totalQuestions})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter("unanswered")}
                                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${filter === "unanswered" ? "bg-muted-foreground text-background font-semibold" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                            >
                                Belum ({unansweredCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter("flagged")}
                                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${filter === "flagged" ? "bg-amber-500 text-white font-semibold" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                            >
                                Ragu ({flaggedCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter("answered")}
                                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${filter === "answered" ? "bg-emerald-600 text-white font-semibold" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                            >
                                Yakin ({answeredCount - flaggedCount > 0 ? answeredCount - flaggedCount : 0})
                            </button>
                        </div>

                        {/* Question Grid */}
                        <div className="flex-1 overflow-y-auto p-3.5">
                            <div className="grid grid-cols-5 gap-2">
                                {filteredQuestions.map(({ question: q, originalIndex: idx, isAnswered, isFlagged, visible }) => {
                                    if (!visible) return null;
                                    const isCurrent = idx === currentQuestionIndex;

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => {
                                                setCurrentQuestionIndex(idx);
                                                setIsSidebarOpen(false);
                                            }}
                                            className={`
                                                relative aspect-square rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-200 cursor-pointer
                                                ${isCurrent
                                                    ? "bg-primary text-primary-foreground shadow-md scale-105 ring-2 ring-primary ring-offset-2 z-10 font-bold"
                                                    : isFlagged
                                                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-2 border-amber-400 hover:border-amber-500"
                                                        : isAnswered
                                                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-400/80 hover:border-emerald-500"
                                                            : "bg-background hover:bg-muted border border-border/80 text-foreground/80 hover:border-primary/50"}
                                            `}
                                        >
                                            {idx + 1}

                                            {/* Flag dot */}
                                            {isFlagged && (
                                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-background" />
                                            )}

                                            {/* Answered check icon */}
                                            {isAnswered && !isFlagged && !isCurrent && (
                                                <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-background" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Legend Footer */}
                        <div className="p-3 border-t bg-muted/20 text-[11px] text-muted-foreground flex flex-wrap items-center justify-around gap-2">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400 inline-block"></span>
                                <span>Terjawab</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400 inline-block"></span>
                                <span>Ragu-ragu</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-background border border-border inline-block"></span>
                                <span>Belum</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs z-20 lg:hidden animate-in fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </>
    );
}
