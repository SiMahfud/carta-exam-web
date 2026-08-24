"use client";

import React from "react";
import { AlertCircle, Ban, Undo2 } from "lucide-react";
import { MatchingQuestionRenderer } from "@/components/exam/MatchingQuestionRenderer";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";
import { Question } from "./types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QuestionRendererProps {
    question: Question;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    answer: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (answer: any) => void;
    fontSize?: "sm" | "base" | "lg" | "xl";
    eliminatedLabels?: string[];
    onToggleEliminate?: (label: string) => void;
}

export function QuestionRenderer({
    question,
    answer,
    onChange,
    fontSize = "base",
    eliminatedLabels = [],
    onToggleEliminate,
}: QuestionRendererProps) {
    const fontClass = {
        sm: "text-sm",
        base: "text-base",
        lg: "text-lg",
        xl: "text-xl",
    }[fontSize];

    if (question.type === "mc") {
        return (
            <div className="space-y-3 max-w-3xl">
                {question.options?.map((option) => {
                    const isEliminated = eliminatedLabels.includes(option.label);
                    const isSelected = answer === option.label;

                    return (
                        <div
                            key={option.label}
                            className={`
                                relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border-2 transition-all duration-200 group
                                ${isEliminated
                                    ? "opacity-40 grayscale bg-muted/40 border-dashed border-muted-foreground/30"
                                    : isSelected
                                        ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                                        : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20"}
                            `}
                        >
                            {/* Main option selection click area */}
                            <label className="flex items-start gap-3.5 flex-1 cursor-pointer min-w-0">
                                <div
                                    className={`
                                        flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 transition-colors mt-0.5
                                        ${isSelected
                                            ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                                            : "border-muted-foreground/30 text-muted-foreground group-hover:border-primary/50 bg-background"}
                                    `}
                                >
                                    {isSelected && <div className="w-2.5 h-2.5 bg-primary-foreground rounded-full" />}
                                    {!isSelected && <span className="text-xs sm:text-sm font-bold">{option.label}</span>}
                                </div>

                                <input
                                    type="radio"
                                    name="answer"
                                    value={option.label}
                                    checked={isSelected}
                                    onChange={(e) => {
                                        if (isEliminated && onToggleEliminate) {
                                            onToggleEliminate(option.label);
                                        }
                                        onChange(e.target.value);
                                    }}
                                    className="sr-only"
                                />

                                <div className="flex-1 pt-1 min-w-0">
                                    <span
                                        className={`
                                            ${fontClass} block w-full leading-relaxed
                                            ${isSelected ? "font-semibold text-foreground" : "text-foreground/90"}
                                            ${isEliminated ? "line-through" : ""}
                                        `}
                                    >
                                        <MathHtmlRenderer html={option.text} />
                                    </span>
                                </div>
                            </label>

                            {/* Option Eliminator Strikethrough Action */}
                            {onToggleEliminate && (
                                <TooltipProvider delayDuration={300}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleEliminate(option.label);
                                                }}
                                                className={`
                                                    p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors shrink-0
                                                    ${isEliminated ? "text-destructive opacity-100 bg-destructive/10" : "opacity-0 group-hover:opacity-100 focus:opacity-100"}
                                                `}
                                                title={isEliminated ? "Batalkan coret" : "Coret pilihan ini"}
                                            >
                                                {isEliminated ? (
                                                    <Undo2 className="w-4 h-4" />
                                                ) : (
                                                    <Ban className="w-4 h-4" />
                                                )}
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">
                                            <p className="text-xs">{isEliminated ? "Batalkan coret" : "Coret opsi salah"}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    if (question.type === "complex_mc") {
        const selectedAnswers = answer || [];
        return (
            <div className="space-y-3.5 max-w-3xl">
                <div className="flex items-center gap-2 text-xs text-primary font-medium bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg w-fit">
                    <AlertCircle className="h-4 w-4" />
                    Pilih satu atau lebih jawaban yang benar (Pilihan Ganda Kompleks)
                </div>
                {question.options?.map((option) => {
                    const isSelected = selectedAnswers.includes(option.label);
                    const isEliminated = eliminatedLabels.includes(option.label);

                    return (
                        <div
                            key={option.label}
                            className={`
                                relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border-2 transition-all duration-200 group
                                ${isEliminated
                                    ? "opacity-40 grayscale bg-muted/40 border-dashed border-muted-foreground/30"
                                    : isSelected
                                        ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                                        : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20"}
                            `}
                        >
                            <label className="flex items-start gap-3.5 flex-1 cursor-pointer min-w-0">
                                <div
                                    className={`
                                        flex items-center justify-center w-6 h-6 rounded-md border-2 shrink-0 transition-colors mt-0.5
                                        ${isSelected
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-muted-foreground/40 bg-background"}
                                    `}
                                >
                                    {isSelected && (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>

                                <input
                                    type="checkbox"
                                    value={option.label}
                                    checked={isSelected}
                                    onChange={(e) => {
                                        if (isEliminated && onToggleEliminate) {
                                            onToggleEliminate(option.label);
                                        }
                                        const newAnswers = e.target.checked
                                            ? [...selectedAnswers, option.label]
                                            : selectedAnswers.filter((a: string) => a !== option.label);
                                        onChange(newAnswers);
                                    }}
                                    className="sr-only"
                                />

                                <div className="flex-1 min-w-0">
                                    <span
                                        className={`
                                            ${fontClass} block w-full leading-relaxed
                                            ${isSelected ? "font-semibold text-foreground" : "text-foreground/90"}
                                            ${isEliminated ? "line-through" : ""}
                                        `}
                                    >
                                        <MathHtmlRenderer html={option.text} />
                                    </span>
                                </div>
                            </label>

                            {onToggleEliminate && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleEliminate(option.label);
                                    }}
                                    className={`
                                        p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors shrink-0
                                        ${isEliminated ? "text-destructive opacity-100 bg-destructive/10" : "opacity-0 group-hover:opacity-100"}
                                    `}
                                    title={isEliminated ? "Batalkan coret" : "Coret pilihan ini"}
                                >
                                    {isEliminated ? <Undo2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    if (question.type === "short") {
        return (
            <div className="max-w-xl space-y-2">
                <input
                    type="text"
                    value={answer || ""}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full p-4 text-base sm:text-lg border-2 border-border/80 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all bg-card font-medium shadow-xs"
                    placeholder="Ketik jawaban singkat Anda di sini..."
                />
                <p className="text-xs text-muted-foreground">
                    Perhatikan ejaan dan format penulisan yang diminta.
                </p>
            </div>
        );
    }

    if (question.type === "essay") {
        return (
            <div className="max-w-3xl space-y-2">
                <textarea
                    value={answer || ""}
                    onChange={(e) => onChange(e.target.value)}
                    rows={10}
                    className="w-full p-4 text-base sm:text-lg border-2 border-border/80 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none resize-y transition-all bg-card leading-relaxed shadow-xs"
                    placeholder="Tuliskan uraian jawaban Anda secara jelas dan terstruktur..."
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Gunakan tanda baca dan paragraf yang rapi</span>
                    <span className="bg-muted px-2.5 py-1 rounded-md font-mono font-medium">
                        {answer ? answer.length : 0} karakter
                    </span>
                </div>
            </div>
        );
    }

    if (question.type === "matching") {
        return (
            <MatchingQuestionRenderer
                question={question}
                answer={answer}
                onChange={onChange}
            />
        );
    }

    if (question.type === "true_false") {
        return (
            <div className="space-y-3 max-w-xl">
                {[
                    { value: "true", label: "Benar" },
                    { value: "false", label: "Salah" }
                ].map((option, optIdx) => (
                    <label
                        key={option.value}
                        className={`
                            flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group
                            ${answer === option.value
                                ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                                : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20"}
                        `}
                    >
                        <div
                            className={`
                                flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 transition-colors
                                ${answer === option.value
                                    ? "border-primary bg-primary text-primary-foreground font-bold"
                                    : "border-muted-foreground/30 text-muted-foreground group-hover:border-primary/50 bg-background"}
                            `}
                        >
                            {answer === option.value ? (
                                <div className="w-2.5 h-2.5 bg-white rounded-full" />
                            ) : (
                                <span className="text-xs font-bold">{optIdx + 1}</span>
                            )}
                        </div>

                        <input
                            type="radio"
                            name="true_false_answer"
                            value={option.value}
                            checked={answer === option.value}
                            onChange={(e) => onChange(e.target.value)}
                            className="sr-only"
                        />

                        <span className={`text-base sm:text-lg font-semibold ${answer === option.value ? "text-foreground" : "text-foreground/80"}`}>
                            {option.label}
                        </span>
                    </label>
                ))}
            </div>
        );
    }

    return <div>Tipe soal tidak dikenali</div>;
}
