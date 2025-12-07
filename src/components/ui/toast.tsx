"use client";

import * as React from "react";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toast as ToastType, ToastVariant } from "@/lib/toast-store";

interface ToastProps extends ToastType {
    onDismiss: (id: string) => void;
}

const variantStyles: Record<ToastVariant, string> = {
    default: "bg-white border-slate-200 text-slate-900",
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
    destructive: "bg-red-50 border-red-200 text-red-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
    default: <Info className="h-5 w-5 text-slate-500" />,
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    destructive: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
};

export function Toast({ id, title, description, variant = "default", onDismiss }: ToastProps) {
    return (
        <div
            className={cn(
                "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all",
                "animate-in slide-in-from-right-full duration-300",
                variantStyles[variant]
            )}
            role="alert"
        >
            <div className="flex-shrink-0 mt-0.5">
                {variantIcons[variant]}
            </div>
            <div className="flex-1 min-w-0">
                {title && (
                    <p className="text-sm font-semibold leading-none tracking-tight">
                        {title}
                    </p>
                )}
                {description && (
                    <p className={cn("text-sm opacity-90", title && "mt-1")}>
                        {description}
                    </p>
                )}
            </div>
            <button
                onClick={() => onDismiss(id)}
                className="flex-shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </button>
        </div>
    );
}
