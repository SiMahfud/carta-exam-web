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
    detectScreenshot?: boolean;
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
        detectScreenshot = true, // Enable mobile screenshot detection by default
        enabled = true,
        cooldownMs = 5000 // 5 second cooldown between same violation types
    } = options;

    const violations = useRef<ViolationLog[]>([]);
    const lastViolationTime = useRef<Record<string, number>>({});

    // For mobile screenshot detection
    const lastHiddenTime = useRef<number>(0);
    const screenDimensions = useRef({ width: 0, height: 0 });

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

        // Store initial screen dimensions for comparison
        screenDimensions.current = {
            width: window.screen.width,
            height: window.screen.height
        };

        // Detect tab switching and mobile screenshot pattern
        const handleVisibilityChange = () => {
            const now = Date.now();

            if (document.hidden) {
                // Record when page became hidden
                lastHiddenTime.current = now;

                if (detectTabSwitch) {
                    logViolation("TAB_SWITCH", "User switched to another tab");
                }
            } else if (detectScreenshot && lastHiddenTime.current > 0) {
                // Page became visible again
                const hiddenDuration = now - lastHiddenTime.current;

                // Android screenshot pattern: very brief visibility change (< 1500ms)
                // This happens when power+volume is pressed for screenshot
                if (hiddenDuration < 1500 && hiddenDuration > 50) {
                    logViolation("SCREENSHOT", `Screenshot detected (mobile) - pola singkat ${hiddenDuration}ms`);
                }

                lastHiddenTime.current = 0;
            }
        };

        // Detect window blur (optional - can cause double counting)
        const handleBlur = () => {
            if (detectWindowBlur) {
                logViolation("WINDOW_BLUR", "Window lost focus");
            }
        };

        // Detect touch + visibility pattern (power+volume button on Android)
        let touchStartTime = 0;
        const handleTouchStart = () => {
            touchStartTime = Date.now();
        };

        const handleTouchEnd = () => {
            if (detectScreenshot && touchStartTime > 0) {
                const touchDuration = Date.now() - touchStartTime;
                // Power+Volume buttons are usually held for 100-500ms for screenshot
                if (touchDuration >= 100 && touchDuration <= 500) {
                    // Check if visibility will change soon (screenshot indicator)
                    setTimeout(() => {
                        if (document.hidden) {
                            logViolation("SCREENSHOT", "Screenshot detected (touch pattern)");
                        }
                    }, 100);
                }
            }
            touchStartTime = 0;
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
            // Prevent screenshot shortcuts (Desktop)
            if (detectScreenshot) {
                if (e.key === "PrintScreen") {
                    e.preventDefault();
                    logViolation("SCREENSHOT", "PrintScreen attempted");
                }
                // Windows Snipping Tool
                if (e.shiftKey && e.key === "S" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    logViolation("SCREENSHOT", "Snipping tool shortcut attempted");
                }
                // Mac screenshot shortcuts (Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5)
                if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
                    e.preventDefault();
                    logViolation("SCREENSHOT", `Mac screenshot (Cmd+Shift+${e.key}) attempted`);
                }
                // Alt+PrintScreen (Windows active window screenshot)
                if (e.altKey && e.key === "PrintScreen") {
                    e.preventDefault();
                    logViolation("SCREENSHOT", "Alt+PrintScreen (window capture) attempted");
                }
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

        // Mobile-specific listeners
        if (detectScreenshot) {
            document.addEventListener("touchstart", handleTouchStart, { passive: true });
            document.addEventListener("touchend", handleTouchEnd, { passive: true });
        }

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("selectstart", handleSelectStart);

            if (detectScreenshot) {
                document.removeEventListener("touchstart", handleTouchStart);
                document.removeEventListener("touchend", handleTouchEnd);
            }
        };
    }, [enabled, disableCopyPaste, disableRightClick, detectTabSwitch, detectWindowBlur, detectScreenshot, logViolation]);

    return {
        violations: violations.current,
        getViolationCount: () => violations.current.length,
        clearViolations: () => {
            violations.current = [];
            lastViolationTime.current = {};
        }
    };
}
