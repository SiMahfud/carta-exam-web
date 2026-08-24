"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calculator as CalcIcon, X, Delete, RotateCcw } from "lucide-react";

interface MiniCalculatorProps {
    open: boolean;
    onClose: () => void;
}

export function MiniCalculator({ open, onClose }: MiniCalculatorProps) {
    const [display, setDisplay] = useState("0");
    const [equation, setEquation] = useState("");
    const [resetNext, setResetNext] = useState(false);

    if (!open) return null;

    const handleDigit = (d: string) => {
        if (display === "0" || resetNext) {
            setDisplay(d);
            setResetNext(false);
        } else {
            if (display.length < 12) {
                setDisplay(display + d);
            }
        }
    };

    const handleDot = () => {
        if (resetNext) {
            setDisplay("0.");
            setResetNext(false);
            return;
        }
        if (!display.includes(".")) {
            setDisplay(display + ".");
        }
    };

    const handleOp = (op: string) => {
        setEquation(`${display} ${op}`);
        setResetNext(true);
    };

    const handleCalculate = () => {
        if (!equation) return;
        try {
            const fullExpr = `${equation} ${display}`
                .replace(/×/g, "*")
                .replace(/÷/g, "/");
            
            // Safe evaluation of basic math expressions
            // Only allow numbers and valid arithmetic operators
            if (!/^[0-9+\-*/. ()]+$/.test(fullExpr)) {
                setDisplay("Error");
                setResetNext(true);
                return;
            }

            // eslint-disable-next-line no-new-func
            const result = Function(`'use strict'; return (${fullExpr})`)();
            const formatted = Number.isFinite(result)
                ? String(Math.round(result * 100000000) / 100000000)
                : "Error";
            setDisplay(formatted);
            setEquation("");
            setResetNext(true);
        } catch {
            setDisplay("Error");
            setResetNext(true);
        }
    };

    const handleClear = () => {
        setDisplay("0");
        setEquation("");
        setResetNext(false);
    };

    const handleBackspace = () => {
        if (resetNext) return;
        if (display.length > 1) {
            setDisplay(display.slice(0, -1));
        } else {
            setDisplay("0");
        }
    };

    const handleSqrt = () => {
        const val = parseFloat(display);
        if (val >= 0) {
            const res = Math.sqrt(val);
            setDisplay(String(Math.round(res * 100000000) / 100000000));
            setResetNext(true);
        } else {
            setDisplay("Error");
            setResetNext(true);
        }
    };

    const handlePercent = () => {
        const val = parseFloat(display);
        setDisplay(String(val / 100));
        setResetNext(true);
    };

    return (
        <Card className="fixed bottom-20 right-4 z-40 w-72 sm:w-80 shadow-2xl border-2 border-primary/20 bg-background/95 backdrop-blur-md rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="p-3 bg-muted/60 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <CalcIcon className="w-4 h-4 text-primary" />
                    <span>Kalkulator Siswa</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={onClose}>
                    <X className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* Display screen */}
            <div className="p-3 bg-muted/20 border-b text-right">
                <div className="text-[11px] text-muted-foreground font-mono h-4 overflow-hidden">
                    {equation}
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-foreground truncate tracking-tight">
                    {display}
                </div>
            </div>

            {/* Keypad */}
            <div className="p-3 grid grid-cols-4 gap-1.5 text-sm">
                <Button variant="outline" size="sm" onClick={handleClear} className="font-semibold text-destructive hover:bg-destructive/10">
                    <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleSqrt} className="font-semibold">
                    √
                </Button>
                <Button variant="outline" size="sm" onClick={handlePercent} className="font-semibold">
                    %
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleOp("÷")} className="font-bold text-primary">
                    ÷
                </Button>

                <Button variant="outline" size="sm" onClick={() => handleDigit("7")} className="font-semibold">7</Button>
                <Button variant="outline" size="sm" onClick={() => handleDigit("8")} className="font-semibold">8</Button>
                <Button variant="outline" size="sm" onClick={() => handleDigit("9")} className="font-semibold">9</Button>
                <Button variant="secondary" size="sm" onClick={() => handleOp("×")} className="font-bold text-primary">×</Button>

                <Button variant="outline" size="sm" onClick={() => handleDigit("4")} className="font-semibold">4</Button>
                <Button variant="outline" size="sm" onClick={() => handleDigit("5")} className="font-semibold">5</Button>
                <Button variant="outline" size="sm" onClick={() => handleDigit("6")} className="font-semibold">6</Button>
                <Button variant="secondary" size="sm" onClick={() => handleOp("-")} className="font-bold text-primary">-</Button>

                <Button variant="outline" size="sm" onClick={() => handleDigit("1")} className="font-semibold">1</Button>
                <Button variant="outline" size="sm" onClick={() => handleDigit("2")} className="font-semibold">2</Button>
                <Button variant="outline" size="sm" onClick={() => handleDigit("3")} className="font-semibold">3</Button>
                <Button variant="secondary" size="sm" onClick={() => handleOp("+")} className="font-bold text-primary">+</Button>

                <Button variant="outline" size="sm" onClick={() => handleDigit("0")} className="font-semibold">0</Button>
                <Button variant="outline" size="sm" onClick={handleDot} className="font-bold">.</Button>
                <Button variant="outline" size="sm" onClick={handleBackspace} className="text-muted-foreground">
                    <Delete className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" onClick={handleCalculate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-sm">
                    =
                </Button>
            </div>
        </Card>
    );
}
