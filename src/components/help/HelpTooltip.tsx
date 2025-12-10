"use client"

import * as React from "react"
import { HelpCircle } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface HelpTooltipProps {
    content: React.ReactNode
    side?: "top" | "right" | "bottom" | "left"
    className?: string
    iconClassName?: string
}

export function HelpTooltip({
    content,
    side = "top",
    className,
    iconClassName,
}: HelpTooltipProps) {
    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
                            className
                        )}
                        aria-label="Bantuan"
                    >
                        <HelpCircle className={cn("h-4 w-4", iconClassName)} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side={side} className="max-w-xs">
                    {content}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
