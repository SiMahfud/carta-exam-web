"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface MatchingResultViewerProps {
    question: {
        id: string;
        questionText: string;
        leftItems?: string[];
        rightItems?: string[];
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    studentPairs: any[]; // Can be { left: number, right: number } or { left: string, right: string }
    correctPairs: { [key: number]: number | number[] }; // Left Index -> Right Index(es)
}

export function MatchingResultViewer({ question, studentPairs, correctPairs }: MatchingResultViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string; isCorrect: boolean }[]>([]);

    const leftItems = useMemo(() => question.leftItems || [], [question.leftItems]);
    const rightItems = useMemo(() => question.rightItems || [], [question.rightItems]);

    // Colors for connections to make them distinct (matching student view)
    const colors = [
        "#ef4444", // red
        "#f97316", // orange
        "#eab308", // yellow
        "#22c55e", // green
        "#06b6d4", // cyan
        "#3b82f6", // blue
        "#8b5cf6", // violet
        "#d946ef", // fuchsia
    ];

    const getColor = (index: number) => colors[index % colors.length];

    // Helper to get text from item (string or object)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getItemText = (item: any) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null && 'text' in item) return item.text;
        return "";
    };

    // Helper to get ID from item (if object) or use index/value
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getItemId = (item: any) => {
        if (typeof item === 'object' && item !== null && 'id' in item) return item.id;
        return item; // fallback for string
    };

    // Calculate line positions
    useEffect(() => {
        if (!containerRef.current) return;

        const calculateLines = () => {
            const newLines: typeof lines = [];
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (!containerRect) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            studentPairs.forEach((pair: any) => {
                // Determine if pair uses indices or values
                let leftIndex = -1;
                let rightIndex = -1;

                if (typeof pair.left === 'number') {
                    leftIndex = pair.left;
                } else {
                    // Try to find by value (string) or ID
                    leftIndex = leftItems.findIndex((item) => {
                        const itemVal = getItemId(item);
                        return itemVal === pair.left || getItemText(item) === pair.left;
                    });
                    // specific fix for older logic if needed:
                    if (leftIndex === -1 && typeof pair.left === 'string') {
                        leftIndex = leftItems.findIndex((item) => String(item) === pair.left);
                    }
                }

                if (typeof pair.right === 'number') {
                    rightIndex = pair.right;
                } else {
                    rightIndex = rightItems.findIndex((item) => {
                        const itemVal = getItemId(item);
                        return itemVal === pair.right || getItemText(item) === pair.right;
                    });
                    // specific fix for older logic if needed:
                    if (rightIndex === -1 && typeof pair.right === 'string') {
                        rightIndex = rightItems.findIndex((item) => String(item) === pair.right);
                    }
                }

                if (leftIndex === -1 || rightIndex === -1) return;

                const leftEl = document.getElementById(`res-left-${question.id}-${leftIndex}`);
                const rightEl = document.getElementById(`res-right-${question.id}-${rightIndex}`);

                if (leftEl && rightEl) {
                    const leftRect = leftEl.getBoundingClientRect();
                    const rightRect = rightEl.getBoundingClientRect();

                    const x1 = leftRect.right - containerRect.left;
                    const y1 = leftRect.top + leftRect.height / 2 - containerRect.top;
                    const x2 = rightRect.left - containerRect.left;
                    const y2 = rightRect.top + rightRect.height / 2 - containerRect.top;

                    // Check correctness
                    // Use loose comparison or string conversion for keys
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const correctRightIndices = correctPairs[leftIndex] ?? correctPairs[String(leftIndex) as any];

                    let isCorrect = false;
                    if (Array.isArray(correctRightIndices)) {
                        isCorrect = correctRightIndices.some(idx => String(idx) === String(rightIndex));
                    } else if (correctRightIndices !== undefined) {
                        isCorrect = String(correctRightIndices) === String(rightIndex);
                    }

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
    }, [studentPairs, correctPairs, question.id, leftItems, rightItems]);

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
                            {/* Dots at ends */}
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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const hasConnection = studentPairs.some((p: any) => {
                            if (typeof p.left === 'number') return p.left === idx;

                            const itemText = getItemText(item);
                            const itemId = getItemId(item);

                            return p.left === itemText || p.left === itemId || p.left === item;
                        });
                        const color = getColor(idx);

                        return (
                            <div
                                id={`res-left-${question.id}-${idx}`}
                                key={idx}
                                className={`
                                    relative p-4 rounded-xl border-2 bg-background
                                    flex items-center justify-between
                                    ${hasConnection ? `border-[${color}]/50` : "border-muted text-muted-foreground"}
                                `}
                                style={{ borderColor: hasConnection ? color : undefined }}
                            >
                                <span className="font-medium text-sm">{getItemText(item)}</span>
                                {/* Connection indicator dot */}
                                <div className={`
                                    w-3 h-3 rounded-full border transition-colors
                                    ${hasConnection ? `bg-[${color}] border-[${color}]` : "bg-muted border-muted-foreground/30"}
                                `}
                                    style={{ backgroundColor: hasConnection ? color : undefined, borderColor: hasConnection ? color : undefined }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Right Column */}
                <div className="flex-1 space-y-4 z-20">
                    <h3 className="font-semibold text-center mb-4 text-muted-foreground text-sm uppercase tracking-wider">Pasangan</h3>
                    {rightItems.map((item, idx) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const hasConnection = studentPairs.some((p: any) => {
                            if (typeof p.right === 'number') return p.right === idx;

                            const itemText = getItemText(item);
                            const itemId = getItemId(item);

                            return p.right === itemText || p.right === itemId || p.right === item;
                        });

                        return (
                            <div
                                id={`res-right-${question.id}-${idx}`}
                                key={idx}
                                className={`
                                    relative p-4 rounded-xl border-2 bg-background
                                    flex items-center gap-3
                                    ${hasConnection ? "border-primary/50" : "border-muted text-muted-foreground"}
                                `}
                            >
                                {/* Connection indicator dot */}
                                <div className={`
                                    w-3 h-3 rounded-full border transition-colors shrink-0
                                    ${hasConnection ? "bg-primary border-primary" : "bg-muted border-muted-foreground/30"}
                                `} />
                                <span className="font-medium text-sm flex-1 text-right">{getItemText(item)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
