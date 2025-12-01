"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface MatchingResultViewerProps {
    question: {
        id: string;
        questionText: string;
        leftItems?: string[];
        rightItems?: string[];
    };
    studentPairs: { left: number; right: number }[]; // Indices
    correctPairs: { [key: number]: number | number[] }; // Left Index -> Right Index(es)
}

export function MatchingResultViewer({ question, studentPairs, correctPairs }: MatchingResultViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string; isCorrect: boolean }[]>([]);

    const leftItems = useMemo(() => question.leftItems || [], [question.leftItems]);
    const rightItems = useMemo(() => question.rightItems || [], [question.rightItems]);

    // Calculate line positions
    useEffect(() => {
        if (!containerRef.current) return;

        const calculateLines = () => {
            const newLines: typeof lines = [];
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (!containerRect) return;

            studentPairs.forEach((pair) => {
                const leftEl = document.getElementById(`res-left-${question.id}-${pair.left}`);
                const rightEl = document.getElementById(`res-right-${question.id}-${pair.right}`);

                if (leftEl && rightEl) {
                    const leftRect = leftEl.getBoundingClientRect();
                    const rightRect = rightEl.getBoundingClientRect();

                    const x1 = leftRect.right - containerRect.left;
                    const y1 = leftRect.top + leftRect.height / 2 - containerRect.top;
                    const x2 = rightRect.left - containerRect.left;
                    const y2 = rightRect.top + rightRect.height / 2 - containerRect.top;

                    // Check correctness
                    const correctRightIndices = correctPairs[pair.left];
                    const isCorrect = Array.isArray(correctRightIndices)
                        ? correctRightIndices.includes(pair.right)
                        : correctRightIndices === pair.right;

                    newLines.push({
                        x1, y1, x2, y2,
                        color: isCorrect ? "#22c55e" : "#ef4444", // Green or Red
                        isCorrect
                    });
                }
            });
            setLines(newLines);
        };

        // Calculate initially and on window resize
        calculateLines();
        window.addEventListener("resize", calculateLines);
        const timeout = setTimeout(calculateLines, 100);

        return () => {
            window.removeEventListener("resize", calculateLines);
            clearTimeout(timeout);
        };
    }, [studentPairs, correctPairs, question.id]);

    return (
        <div className="space-y-6 select-none">
            <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/20 p-3 rounded-md w-fit">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Benar</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Salah</span>
                </div>
            </div>

            <div className="relative flex justify-between gap-8 md:gap-16 min-h-[200px]" ref={containerRef}>
                {/* SVG Layer for Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                    {lines.map((line, i) => (
                        <g key={i}>
                            <line
                                x1={line.x1} y1={line.y1}
                                x2={line.x2} y2={line.y2}
                                stroke="white"
                                strokeWidth="5"
                                strokeLinecap="round"
                                className="opacity-50"
                            />
                            <line
                                x1={line.x1} y1={line.y1}
                                x2={line.x2} y2={line.y2}
                                stroke={line.color}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            />
                            <circle cx={line.x1} cy={line.y1} r="3" fill={line.color} />
                            <circle cx={line.x2} cy={line.y2} r="3" fill={line.color} />
                        </g>
                    ))}
                </svg>

                {/* Left Column */}
                <div className="flex-1 space-y-4 z-20">
                    <h3 className="font-semibold text-center mb-4 text-muted-foreground text-sm uppercase tracking-wider">Pernyataan</h3>
                    {leftItems.map((item, idx) => {
                        // Check if this item has any student connections
                        const hasConnection = studentPairs.some(p => p.left === idx);

                        return (
                            <div
                                id={`res-left-${question.id}-${idx}`}
                                key={idx}
                                className={`
                                    relative p-3 rounded-lg border bg-background
                                    flex items-center justify-between
                                    ${hasConnection ? "border-muted-foreground/30" : "border-muted text-muted-foreground"}
                                `}
                            >
                                <span className="font-medium text-sm">{item}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Right Column */}
                <div className="flex-1 space-y-4 z-20">
                    <h3 className="font-semibold text-center mb-4 text-muted-foreground text-sm uppercase tracking-wider">Pasangan</h3>
                    {rightItems.map((item, idx) => {
                        const hasConnection = studentPairs.some(p => p.right === idx);

                        return (
                            <div
                                id={`res-right-${question.id}-${idx}`}
                                key={idx}
                                className={`
                                    relative p-3 rounded-lg border bg-background
                                    flex items-center gap-3
                                    ${hasConnection ? "border-muted-foreground/30" : "border-muted text-muted-foreground"}
                                `}
                            >
                                <span className="font-medium text-sm flex-1 text-right">{item}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
