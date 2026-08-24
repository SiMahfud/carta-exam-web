"use client";

import React, { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Flag,
    ChevronLeft,
    ChevronRight,
    Columns,
} from "lucide-react";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";
import { QuestionRenderer } from "./QuestionRenderer";
import { Question, Answer } from "./types";

interface QuestionCardProps {
    currentQuestion: Question;
    currentAnswer: Answer | null | undefined;
    currentQuestionIndex: number;
    totalQuestions: number;
    examStarted: boolean;
    isFullscreen: boolean;
    fullscreenSupported: boolean;
    enterFullscreen: () => Promise<void>;
    exitFullscreen: () => Promise<void>;
    onToggleFlag: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onAnswerChange: (questionId: string, answer: any) => void;
    onNavigate: (index: number) => void;
    fontSize?: "sm" | "base" | "lg" | "xl";
    eliminatedOptions?: Map<string, string[]>;
    onToggleEliminate?: (questionId: string, label: string) => void;
}

export function QuestionCard({
    currentQuestion,
    currentAnswer,
    currentQuestionIndex,
    totalQuestions,
    onToggleFlag,
    onAnswerChange,
    onNavigate,
    fontSize = "base",
    eliminatedOptions = new Map(),
    onToggleEliminate,
}: QuestionCardProps) {
    const [splitLayout, setSplitLayout] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    const getTypeBadgeText = (type: string) => {
        switch (type) {
            case "mc": return "Pilihan Ganda";
            case "complex_mc": return "Pilihan Ganda Kompleks";
            case "matching": return "Menjodohkan";
            case "short": return "Jawaban Singkat";
            case "true_false": return "Benar/Salah";
            default: return "Uraian / Essay";
        }
    };

    const questionTextFontClass = {
        sm: "text-base md:text-lg",
        base: "text-lg md:text-xl",
        lg: "text-xl md:text-2xl",
        xl: "text-2xl md:text-3xl",
    }[fontSize];

    // Mobile swipe handling
    const minSwipeDistance = 60;

    const onTouchStart = (e: React.TouchEvent) => {
        touchEndX.current = null;
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const distance = touchStartX.current - touchEndX.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentQuestionIndex < totalQuestions - 1) {
            onNavigate(currentQuestionIndex + 1);
        }
        if (isRightSwipe && currentQuestionIndex > 0) {
            onNavigate(currentQuestionIndex - 1);
        }
    };

    // Check if question has long text suitable for split-screen toggle
    const isLongText = (currentQuestion.questionText?.length || 0) > 300;
    const activeEliminated = eliminatedOptions.get(currentQuestion.id) || [];

    return (
        <Card
            className="h-full flex flex-col shadow-xs border bg-card/90 backdrop-blur-xs rounded-2xl overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Question Top Bar */}
            <div className="p-4 sm:p-5 border-b flex justify-between items-center gap-3 bg-muted/20">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-background text-xs font-semibold px-2.5 py-1 border-border/80">
                        {getTypeBadgeText(currentQuestion.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                        Bobot: <strong className="text-foreground">{currentQuestion.points} poin</strong>
                    </span>
                    {isLongText && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSplitLayout(!splitLayout)}
                            className="hidden lg:inline-flex h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
                        >
                            <Columns className="w-3.5 h-3.5" />
                            <span>{splitLayout ? "Tampilan 1 Kolom" : "Bagi Layar 2 Kolom"}</span>
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={currentAnswer?.isFlagged ? "default" : "outline"}
                        size="sm"
                        onClick={onToggleFlag}
                        className={`
                            h-8 sm:h-9 text-xs sm:text-sm font-semibold transition-all cursor-pointer
                            ${currentAnswer?.isFlagged
                                ? "bg-amber-500 hover:bg-amber-600 text-white border-none shadow-xs"
                                : "hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 hover:border-amber-300"}
                        `}
                    >
                        <Flag className={`mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 ${currentAnswer?.isFlagged ? "fill-current" : ""}`} />
                        <span>{currentAnswer?.isFlagged ? "Ragu-ragu (Ditandai)" : "Ragu-ragu (F)"}</span>
                    </Button>
                </div>
            </div>

            {/* Question Body with Optional Split Screen */}
            <div className="flex-1 p-5 sm:p-7 md:p-8 overflow-y-auto">
                <div className={splitLayout ? "grid grid-cols-1 lg:grid-cols-2 gap-8 h-full" : "space-y-8 max-w-4xl"}>
                    {/* Left/Main: Question text & stimulus */}
                    <div className={`${splitLayout ? "lg:pr-4 lg:border-r overflow-y-auto" : ""}`}>
                        <div className="prose dark:prose-invert max-w-none">
                            <div className={`${questionTextFontClass} leading-relaxed text-foreground font-medium`}>
                                <MathHtmlRenderer html={currentQuestion.questionText} />
                            </div>
                        </div>
                    </div>

                    {/* Right/Bottom: Answer Options */}
                    <div className="space-y-4 pt-2">
                        <QuestionRenderer
                            question={currentQuestion}
                            answer={currentAnswer?.answer}
                            onChange={(answer) => onAnswerChange(currentQuestion.id, answer)}
                            fontSize={fontSize}
                            eliminatedLabels={activeEliminated}
                            onToggleEliminate={onToggleEliminate ? (label) => onToggleEliminate(currentQuestion.id, label) : undefined}
                        />
                    </div>
                </div>
            </div>

            {/* Question Navigation Footer */}
            <div className="p-3.5 sm:p-4 border-t bg-muted/20 flex justify-between items-center gap-3">
                <Button
                    variant="outline"
                    onClick={() => onNavigate(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="w-28 sm:w-36 h-9 sm:h-10 text-xs sm:text-sm font-semibold cursor-pointer border-border/80"
                >
                    <ChevronLeft className="mr-1.5 h-4 w-4" />
                    Sebelumnya
                </Button>

                {/* Mobile swipe reminder / dot indicator */}
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                    <span className="hidden sm:inline">Nomor</span>
                    <span className="font-bold text-foreground">{currentQuestionIndex + 1}</span>
                    <span>dari</span>
                    <span className="font-bold text-foreground">{totalQuestions}</span>
                </div>

                <Button
                    onClick={() => onNavigate(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === totalQuestions - 1}
                    className="w-28 sm:w-36 h-9 sm:h-10 text-xs sm:text-sm font-semibold shadow-md shadow-primary/10 cursor-pointer"
                >
                    Selanjutnya
                    <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
            </div>
        </Card>
    );
}
