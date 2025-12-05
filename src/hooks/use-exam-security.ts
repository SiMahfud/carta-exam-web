"use client";

import { useEffect, useCallback, useRef } from "react";

interface ViolationLog {
    type: string;
    timestamp: Date;
    details?: string;
}

interface UseExamSecurityOptions {
    onViolation?: (violation: ViolationLog) => void;
    disableCopyPaste?: boolean;
    disableRightClick?: boolean;
    detectTabSwitch?: boolean;
    detectWindowBlur?: boolean;
    enabled?: boolean;
    cooldownMs?: number;
}

export function useExamSecurity(options: UseExamSecurityOptions = {}) {
    const {
        onViolation,
        disableCopyPaste = true,
        disableRightClick = true,
        detectTabSwitch = true,
        detectWindowBlur = false, // Disabled by default to avoid double counting
        enabled = true,
        cooldownMs = 5000 // 5 second cooldown between same violation types
    } = options;

    const violations = useRef<ViolationLog[]>([]);
    const lastViolationTime = useRef<Record<string, number>>({});

    const logViolation = useCallback((type: string, details?: string) => {
        const now = Date.now();
        const lastTime = lastViolationTime.current[type] || 0;

        // Debounce: Skip if same violation type occurred within cooldown period
        if (now - lastTime < cooldownMs) {
            console.log(`[Security] Skipped ${type} - within cooldown period`);
            return;
        }

        lastViolationTime.current[type] = now;

        const violation: ViolationLog = {
            type,
            timestamp: new Date(),
            details
        };
        violations.current.push(violation);
        onViolation?.(violation);
    }, [onViolation, cooldownMs]);

    useEffect(() => {
        if (!enabled) return;

        // Detect tab switching (most reliable way)
        const handleVisibilityChange = () => {
            if (detectTabSwitch && document.hidden) {
                logViolation("TAB_SWITCH", "User switched to another tab");
            }
        };

        // Detect window blur (optional - can cause double counting)
        const handleBlur = () => {
            if (detectWindowBlur) {
                logViolation("WINDOW_BLUR", "Window lost focus");
            }
        };

        // Disable right-click
        const handleContextMenu = (e: MouseEvent) => {
            if (disableRightClick) {
                e.preventDefault();
                logViolation("RIGHT_CLICK", "Right-click attempted");
            }
        };

        // Disable copy/paste keyboard shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            if (disableCopyPaste && (e.ctrlKey || e.metaKey)) {
                const key = e.key.toLowerCase();
                if (["c", "v", "x", "a"].includes(key)) {
                    e.preventDefault();
                    logViolation("KEYBOARD_SHORTCUT", `Ctrl+${key.toUpperCase()} attempted`);
                }
                // Prevent print
                if (key === "p") {
                    e.preventDefault();
                    logViolation("PRINT_ATTEMPT", "Print attempted");
                }
            }
            // Prevent F12 (DevTools)
            if (e.key === "F12") {
                e.preventDefault();
                logViolation("DEVTOOLS", "F12 DevTools attempted");
            }
            // Prevent screenshot shortcuts
            if (e.key === "PrintScreen") {
                e.preventDefault();
                logViolation("SCREENSHOT", "PrintScreen attempted");
            }
            // Windows Snipping Tool
            if (e.shiftKey && e.key === "S" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                logViolation("SCREENSHOT", "Snipping tool shortcut attempted");
            }
        };

        // Disable text selection (optional)
        const handleSelectStart = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
                return;
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("selectstart", handleSelectStart);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("selectstart", handleSelectStart);
        };
    }, [enabled, disableCopyPaste, disableRightClick, detectTabSwitch, detectWindowBlur, logViolation]);

    return {
        violations: violations.current,
        getViolationCount: () => violations.current.length,
        clearViolations: () => {
            violations.current = [];
            lastViolationTime.current = {};
        }
    };
}
