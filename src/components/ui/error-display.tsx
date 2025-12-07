"use client";

import { AlertCircle, RotateCcw, ArrowLeft, Home } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ErrorDisplayProps {
    title?: string;
    description?: string;
    variant?: "inline" | "card" | "fullpage";
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
    showHomeButton?: boolean;
    showBackButton?: boolean;
    className?: string;
}

export function ErrorDisplay({
    title = "Terjadi Kesalahan",
    description = "Silakan coba lagi.",
    variant = "card",
    action,
    showHomeButton = false,
    showBackButton = false,
    className
}: ErrorDisplayProps) {
    const isFullPage = variant === "fullpage";
    const isInline = variant === "inline";

    const content = (
        <>
            <div className={cn(
                "flex items-center justify-center rounded-full",
                isFullPage ? "h-20 w-20 bg-red-100" : isInline ? "h-8 w-8 bg-red-100" : "h-14 w-14 bg-red-100"
            )}>
                <AlertCircle className={cn(
                    "text-red-500",
                    isFullPage ? "h-10 w-10" : isInline ? "h-4 w-4" : "h-7 w-7"
                )} />
            </div>
            <div className={cn("text-center", isInline && "text-left flex-1")}>
                <h3 className={cn(
                    "font-semibold text-slate-900",
                    isFullPage ? "text-2xl" : isInline ? "text-sm" : "text-lg"
                )}>
                    {title}
                </h3>
                <p className={cn(
                    "text-slate-600",
                    isFullPage ? "text-base mt-2" : isInline ? "text-xs" : "text-sm mt-1"
                )}>
                    {description}
                </p>
            </div>
            <div className={cn(
                "flex gap-2",
                isFullPage ? "flex-row mt-6" : isInline ? "flex-row" : "flex-col mt-4 w-full"
            )}>
                {action && (
                    action.href ? (
                        <Button asChild variant={isFullPage ? "default" : "outline"} size={isInline ? "sm" : "default"}>
                            <Link href={action.href}>{action.label}</Link>
                        </Button>
                    ) : (
                        <Button
                            onClick={action.onClick}
                            variant={isFullPage ? "default" : "outline"}
                            size={isInline ? "sm" : "default"}
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {action.label}
                        </Button>
                    )
                )}
                {showBackButton && (
                    <Button
                        variant="outline"
                        size={isInline ? "sm" : "default"}
                        onClick={() => window.history.back()}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Kembali
                    </Button>
                )}
                {showHomeButton && (
                    <Button asChild variant="ghost" size={isInline ? "sm" : "default"}>
                        <Link href="/admin">
                            <Home className="h-4 w-4 mr-2" />
                            Dashboard
                        </Link>
                    </Button>
                )}
            </div>
        </>
    );

    if (isInline) {
        return (
            <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200",
                className
            )}>
                {content}
            </div>
        );
    }

    if (isFullPage) {
        return (
            <div className={cn(
                "flex flex-col items-center justify-center min-h-[400px] p-8",
                className
            )}>
                {content}
            </div>
        );
    }

    // Card variant (default)
    return (
        <div className={cn(
            "flex flex-col items-center gap-4 p-6 rounded-xl bg-white border border-slate-200 shadow-sm",
            className
        )}>
            {content}
        </div>
    );
}
