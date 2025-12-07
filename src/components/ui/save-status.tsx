"use client";

import { SaveStatus as SaveStatusType, formatLastSaved } from "@/hooks/use-auto-save";
import { cn } from "@/lib/utils";
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from "lucide-react";

interface SaveStatusProps {
    status: SaveStatusType;
    lastSaved: Date | null;
    className?: string;
}

const statusConfig: Record<SaveStatusType, {
    icon: typeof Cloud;
    text: string;
    className: string;
}> = {
    idle: {
        icon: Cloud,
        text: "",
        className: "text-slate-400",
    },
    saving: {
        icon: Loader2,
        text: "Menyimpan...",
        className: "text-blue-500",
    },
    saved: {
        icon: Check,
        text: "Tersimpan",
        className: "text-emerald-500",
    },
    unsaved: {
        icon: CloudOff,
        text: "Belum tersimpan",
        className: "text-amber-500",
    },
    error: {
        icon: AlertCircle,
        text: "Gagal menyimpan",
        className: "text-red-500",
    },
};

export function SaveStatusIndicator({ status, lastSaved, className }: SaveStatusProps) {
    const config = statusConfig[status];
    const Icon = config.icon;
    const isAnimating = status === "saving";

    // Don't show anything in idle state
    if (status === "idle") {
        return null;
    }

    return (
        <div className={cn(
            "flex items-center gap-1.5 text-xs",
            config.className,
            className
        )}>
            <Icon className={cn(
                "h-3.5 w-3.5",
                isAnimating && "animate-spin"
            )} />
            <span className="font-medium">{config.text}</span>
            {status === "saved" && lastSaved && (
                <span className="text-slate-400 ml-1">
                    {formatLastSaved(lastSaved)}
                </span>
            )}
        </div>
    );
}
