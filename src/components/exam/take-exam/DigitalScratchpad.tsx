"use client";

import React, { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit3, Eraser, Trash2, X, Undo2 } from "lucide-react";

interface DigitalScratchpadProps {
    open: boolean;
    onClose: () => void;
}

export function DigitalScratchpad({ open, onClose }: DigitalScratchpadProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [mode, setMode] = useState<"pen" | "eraser">("pen");
    const [color, setColor] = useState("#2563eb");
    const [brushSize, setBrushSize] = useState(3);
    const [history, setHistory] = useState<ImageData[]>([]);

    useEffect(() => {
        if (!open) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas resolution
        canvas.width = canvas.parentElement?.clientWidth || 360;
        canvas.height = 320;

        // Fill background white
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }, [open]);

    if (!open) return null;

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

        ctx.lineWidth = mode === "eraser" ? brushSize * 4 : brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = mode === "eraser" ? "#ffffff" : color;

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (history.length < 15) {
            setHistory([...history, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        } else {
            setHistory([...history.slice(1), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        }
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHistory([...history, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };

    const handleUndo = () => {
        if (history.length <= 1) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const newHistory = [...history];
        newHistory.pop();
        const previousState = newHistory[newHistory.length - 1];
        ctx.putImageData(previousState, 0, 0);
        setHistory(newHistory);
    };

    return (
        <Card className="fixed bottom-20 left-4 z-40 w-80 sm:w-96 shadow-2xl border-2 border-indigo-500/20 bg-background/95 backdrop-blur-md rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="p-3 bg-muted/60 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Edit3 className="w-4 h-4 text-indigo-500" />
                    <span>Papan Coret-coretan Digital</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleUndo} title="Urungkan">
                        <Undo2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={handleClear} title="Bersihkan">
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onClose}>
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="p-2 bg-slate-100 dark:bg-slate-900 border-b relative">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-64 bg-white rounded-lg cursor-crosshair touch-none shadow-inner border border-slate-200 dark:border-slate-800"
                />
            </div>

            {/* Tools footer */}
            <div className="p-2.5 bg-background flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1">
                    <Button
                        variant={mode === "pen" ? "default" : "outline"}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setMode("pen")}
                    >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Pena
                    </Button>
                    <Button
                        variant={mode === "eraser" ? "default" : "outline"}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setMode("eraser")}
                    >
                        <Eraser className="w-3 h-3 mr-1" />
                        Hapus
                    </Button>
                </div>

                {/* Color swatches */}
                {mode === "pen" && (
                    <div className="flex items-center gap-1.5">
                        {[
                            { color: "#2563eb", name: "Biru" },
                            { color: "#dc2626", name: "Merah" },
                            { color: "#16a34a", name: "Hijau" },
                            { color: "#000000", name: "Hitam" },
                        ].map((c) => (
                            <button
                                key={c.color}
                                type="button"
                                onClick={() => setColor(c.color)}
                                className={`w-5 h-5 rounded-full border transition-transform ${color === c.color ? "scale-125 ring-2 ring-primary ring-offset-1" : "hover:scale-110"}`}
                                style={{ backgroundColor: c.color }}
                                title={c.name}
                            />
                        ))}
                    </div>
                )}

                {/* Brush size */}
                <div className="flex items-center gap-1">
                    {[2, 4, 7].map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setBrushSize(s)}
                            className={`w-6 h-6 rounded flex items-center justify-center border text-[10px] ${brushSize === s ? "bg-primary text-primary-foreground font-bold" : "bg-muted"}`}
                        >
                            {s === 2 ? "S" : s === 4 ? "M" : "L"}
                        </button>
                    ))}
                </div>
            </div>
        </Card>
    );
}
