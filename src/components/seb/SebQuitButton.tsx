"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectClientEnvironment } from "@/lib/browser-detection";

interface SebQuitButtonProps {
    variant?: "default" | "outline" | "destructive" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    label?: string;
}

/**
 * Renders a self-exit button when the user is running inside Safe Exam Browser (SEB)
 * on non-exam pages (/login, /student/exams, or completed exam view).
 * Navigating to SEB's configured quitURL lets SEB close cleanly without prompting for Quit Password.
 */
export function SebQuitButton({
    variant = "outline",
    size = "sm",
    className = "",
    label = "Keluar dari SEB",
}: SebQuitButtonProps) {
    const [isSeb, setIsSeb] = useState(false);
    const [quitUrl, setQuitUrl] = useState("/seb-quit");
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        const env = detectClientEnvironment();
        if (!env.isSeb) return;
        setIsSeb(true);

        let cancelled = false;
        fetch("/api/seb/quit-info")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && data?.success && typeof data.quitUrl === "string" && data.quitUrl.trim()) {
                    setQuitUrl(data.quitUrl.trim());
                }
            })
            .catch(() => {
                // Keep relative /seb-quit fallback if offline or fetch fails
            });

        return () => {
            cancelled = true;
        };
    }, []);

    if (!isSeb) return null;

    const handleClick = () => {
        if (!confirming) {
            setConfirming(true);
            setTimeout(() => setConfirming(false), 4000);
            return;
        }
        window.location.assign(quitUrl);
    };

    return (
        <Button
            type="button"
            variant={confirming ? "destructive" : variant}
            size={size}
            onClick={handleClick}
            className={className}
        >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            {confirming ? "Klik lagi untuk Keluar SEB" : label}
        </Button>
    );
}
