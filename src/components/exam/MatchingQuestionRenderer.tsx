"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";

interface MatchingQuestionRendererProps {
    question: {
        id: string;
        questionText: string;
        leftItems?: (string | { id: string; text: string })[];
        rightItems?: (string | { id: string; text: string })[];
    };
    answer: { left: string; right: string }[] | null;
    onChange: (answer: { left: string; right: string }[]) => void;
}

export function MatchingQuestionRenderer({ question, answer, onChange }: MatchingQuestionRendererProps) {
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string }[]>([]);

    // Memoize these arrays to prevent infinite loops in useEffect
    // When answer is null/undefined, 'answer || []' creates a new array reference every render
    const connections = useMemo(() => answer || [], [answer]);
    const leftItems = useMemo(() => question.leftItems || [], [question.leftItems]);
    const rightItems = useMemo(() => question.rightItems || [], [question.rightItems]);

    // Colors for connections to make them distinct
    const colors = [
        "#ef4444", // red
        "#f97316", // orange
        "#eab308", // yellow
    ];

    const getColor = (index: number) => colors[index % colors.length];

    const getItemId = (item: string | { id: string; text: string }) => {
        if (typeof item === 'string') return item;
        return item.id || item.text; // Fallback to text if id is missing
    };

    const getItemText = (item: string | { id: string; text: string }) => {
        if (typeof item === 'string') return item;
        return item.text;
    };

    // Calculate line positions
    useEffect(() => {
        if (!containerRef.current) return;

        const calculateLines = () => {
            const newLines: typeof lines = [];
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (!containerRect) return;

            connections.forEach((conn, idx) => {
                // Sanitize IDs for DOM selection to handle special characters if using text as ID
                const leftId = `left-${question.id}-${conn.left}`.replace(/[^a-zA-Z0-9-_]/g, '_');
                const rightId = `right-${question.id}-${conn.right}`.replace(/[^a-zA-Z0-9-_]/g, '_');

                const leftEl = document.getElementById(leftId);
                const rightEl = document.getElementById(rightId);

                if (leftEl && rightEl) {
                    const leftRect = leftEl.getBoundingClientRect();
                    const rightRect = rightEl.getBoundingClientRect();

                    // Calculate coordinates relative to the container
                    // Since containerRef is now on the relative parent of the SVG,
                    // we can directly subtract containerRect.left/top
                    const x1 = leftRect.right - containerRect.left;
                    const y1 = leftRect.top + leftRect.height / 2 - containerRect.top;
                    const x2 = rightRect.left - containerRect.left;
                    const y2 = rightRect.top + rightRect.height / 2 - containerRect.top;

                    // Find index of left item to assign consistent color
                    const leftIndex = leftItems.findIndex(item => getItemId(item) === conn.left);

                    newLines.push({
                        x1, y1, x2, y2,
                        color: getColor(leftIndex >= 0 ? leftIndex : idx)
                    });
                }
            });
            setLines(newLines);
        };

        // Calculate initially and on window resize
        calculateLines();
        window.addEventListener("resize", calculateLines);

        // Also recalculate after a short delay to ensure DOM is fully rendered
        const timeout = setTimeout(calculateLines, 100);

        return () => {
            window.removeEventListener("resize", calculateLines);
            clearTimeout(timeout);
        };
    }, [connections, question.id, leftItems]);

    const handleLeftClick = (item: string) => {
        if (selectedLeft === item) {
            setSelectedLeft(null); // Deselect
        } else {
            setSelectedLeft(item);
        }
    };

    const handleRightClick = (item: string) => {
        if (!selectedLeft) return;

        // Check if connection already exists
        const exists = connections.some(c => c.left === selectedLeft && c.right === item);

        if (exists) {
            // Remove connection if clicked again
            const newConnections = connections.filter(c => !(c.left === selectedLeft && c.right === item));
            onChange(newConnections);
        } else {
            // Add new connection
            // Note: We allow one-to-many (one left to multiple right)
            const newConnections = [...connections, { left: selectedLeft, right: item }];
            onChange(newConnections);
            setSelectedLeft(null); // Reset selection after connecting
        }
    };

    const removeConnection = (left: string, right: string) => {
        const newConnections = connections.filter(c => !(c.left === left && c.right === right));
        onChange(newConnections);
    };

    return (
        <div className="space-y-6 select-none">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 p-3 rounded-md w-fit">
                <div className="bg-primary/10 p-1 rounded-full">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <span>Klik item di <strong>kiri</strong>, lalu klik pasangannya di <strong>kanan</strong>.</span>
            </div>

            {/* ContainerRef moved here to the relative parent of SVG */}
            <div className="relative flex justify-between gap-8 md:gap-16 min-h-[300px]" ref={containerRef}>
                {/* SVG Layer for Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                    {lines.map((line, i) => (
                        <g key={i}>
                            {/* Line shadow/border for better visibility */}
                            <line
                                x1={line.x1} y1={line.y1}
                                x2={line.x2} y2={line.y2}
                                stroke="white"
                                strokeWidth="6"
                                strokeLinecap="round"
                                className="opacity-50"
                            />
                            {/* Actual colored line */}
                            <line
                                x1={line.x1} y1={line.y1}
                                x2={line.x2} y2={line.y2}
                                stroke={line.color}
                                strokeWidth="3"
                                strokeLinecap="round"
                                className="transition-all duration-300 ease-out"
                            />
                            {/* Dot at start */}
                            <circle cx={line.x1} cy={line.y1} r="4" fill={line.color} />
                            {/* Dot at end */}
                            <circle cx={line.x2} cy={line.y2} r="4" fill={line.color} />
                        </g>
                    ))}
                </svg>

                {/* Left Column */}
                <div className="flex-1 space-y-4 z-20">
                    <h3 className="font-semibold text-center mb-4 text-muted-foreground text-sm uppercase tracking-wider">Pernyataan</h3>
                    {leftItems.map((item, idx) => {
                        const itemId = getItemId(item);
                        const itemText = getItemText(item);
                        const isSelected = selectedLeft === itemId;
                        const isConnected = connections.some(c => c.left === itemId);
                        const color = getColor(idx);

                        // Sanitize ID for DOM
                        const domId = `left-${question.id}-${itemId}`.replace(/[^a-zA-Z0-9-_]/g, '_');

                        return (
                            <div
                                id={domId}
                                key={idx}
                                onClick={() => handleLeftClick(itemId)}
                                className={`
                                    relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                                    flex items-center justify-between group hover:shadow-md
                                    ${isSelected
                                        ? `border-[${color}] ring-2 ring-[${color}]/20 bg-[${color}]/5`
                                        : isConnected
                                            ? `border-[${color}]/50 bg-background`
                                            : "border-muted bg-background hover:border-primary/30"}
                                `}
                                style={{ borderColor: isSelected || isConnected ? color : undefined }}
                            >
                                <div className="font-medium text-foreground/90 w-full">
                                    <MathHtmlRenderer html={itemText} />
                                </div>

                                {/* Connection indicator dot */}
                                <div className={`
                                    w-3 h-3 rounded-full border transition-colors
                                    ${isSelected || isConnected ? `bg-[${color}] border-[${color}]` : "bg-muted border-muted-foreground/30"}
                                `}
                                    style={{ backgroundColor: isSelected || isConnected ? color : undefined, borderColor: isSelected || isConnected ? color : undefined }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Right Column */}
                <div className="flex-1 space-y-4 z-20">
                    <h3 className="font-semibold text-center mb-4 text-muted-foreground text-sm uppercase tracking-wider">Pasangan</h3>
                    {rightItems.map((item, idx) => {
                        const itemId = getItemId(item);
                        const itemText = getItemText(item);

                        // Find all connections to this right item
                        const itemConnections = connections.filter(c => c.right === itemId);
                        const isConnected = itemConnections.length > 0;

                        // Sanitize ID for DOM
                        const domId = `right-${question.id}-${itemId}`.replace(/[^a-zA-Z0-9-_]/g, '_');

                        return (
                            <div
                                id={domId}
                                key={idx}
                                onClick={() => handleRightClick(itemId)}
                                className={`
                                    relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                                    flex items-center gap-3 group hover:shadow-md
                                    ${isConnected
                                        ? "border-primary/50 bg-background"
                                        : "border-muted bg-background hover:border-primary/30"}
                                    ${selectedLeft ? "hover:ring-2 hover:ring-primary/20 hover:bg-primary/5" : ""}
                                `}
                            >
                                {/* Connection indicator dot */}
                                <div className={`
                                    w-3 h-3 rounded-full border transition-colors shrink-0
                                    ${isConnected ? "bg-primary border-primary" : "bg-muted border-muted-foreground/30"}
                                `} />

                                <div className="font-medium text-foreground/90 flex-1">
                                    <MathHtmlRenderer html={itemText} />
                                </div>

                                {/* Remove buttons for connections */}
                                {isConnected && (
                                    <div className="flex -space-x-1">
                                        {itemConnections.map((conn, i) => {
                                            const leftIndex = leftItems.findIndex(l => getItemId(l) === conn.left);
                                            const color = getColor(leftIndex);
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeConnection(conn.left, itemId);
                                                    }}
                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] hover:scale-110 transition-transform shadow-sm z-30"
                                                    style={{ backgroundColor: color }}
                                                    title={`Hapus hubungan`}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
