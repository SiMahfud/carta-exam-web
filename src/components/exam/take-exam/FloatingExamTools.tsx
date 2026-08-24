"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MiniCalculator } from "./MiniCalculator";
import { DigitalScratchpad } from "./DigitalScratchpad";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { Calculator, Edit3, Keyboard } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function FloatingExamTools() {
    const [calcOpen, setCalcOpen] = useState(false);
    const [scratchpadOpen, setScratchpadOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    return (
        <>
            {/* Pop-up Modals / Floating Windows */}
            <MiniCalculator open={calcOpen} onClose={() => setCalcOpen(false)} />
            <DigitalScratchpad open={scratchpadOpen} onClose={() => setScratchpadOpen(false)} />
            <KeyboardShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

            {/* Floating Toolbar in Bottom-Right */}
            <aside aria-label="Alat Bantu Ujian" className="fixed bottom-4 right-4 z-30 flex items-center gap-1.5 p-1.5 rounded-full bg-background/90 backdrop-blur-md border shadow-lg border-border/80">
                <TooltipProvider delayDuration={200}>
                    {/* Calculator Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={calcOpen ? "default" : "ghost"}
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => setCalcOpen(!calcOpen)}
                                aria-label="Kalkulator"
                            >
                                <Calculator className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p className="text-xs">Kalkulator Siswa</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Scratchpad Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={scratchpadOpen ? "default" : "ghost"}
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => setScratchpadOpen(!scratchpadOpen)}
                                aria-label="Papan Coretan"
                            >
                                <Edit3 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p className="text-xs">Papan Coretan Digital</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Keyboard Shortcuts Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hidden sm:flex"
                                onClick={() => setShortcutsOpen(true)}
                                aria-label="Bantuan Shortcut Keyboard"
                            >
                                <Keyboard className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p className="text-xs">Shortcut Keyboard (?)</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </aside>
        </>
    );
}
