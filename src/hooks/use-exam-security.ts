"use client";

import { useEffect, useCallback, useRef } from "react";
import { checkSplitOrFloatingScreen, isTypingActive } from "@/lib/mobile-security";

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
    detectSplitScreen?: boolean;
    detectFloatingWindow?: boolean;
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
        detectSplitScreen = true, // Enable mobile split-screen detection
        detectFloatingWindow = true, // Enable mobile floating window / focus loss detection
        enabled = true,
        cooldownMs = 5000 // 5 second cooldown between same violation types
    } = options;

    const violations = useRef<ViolationLog[]>([]);
    const lastViolationTime = useRef<Record<string, number>>({});
    const lastGlobalViolationTime = useRef<number>(0);
    const lastHiddenTime = useRef<number>(0);
    const screenDimensions = useRef({ width: 0, height: 0 });

    const logViolation = useCallback((type: string, details?: string) => {
        const now = Date.now();
        const lastTime = lastViolationTime.current[type] || 0;
        const lastGlobal = lastGlobalViolationTime.current || 0;

        // Debounce: Skip if same violation type occurred within cooldown period
        if (now - lastTime < cooldownMs) {
            console.log(`[Security] Skipped ${type} - within per-type cooldown period`);
            return;
        }

        // Global cooldown protection to prevent multi-event bursts (e.g., tab switch + window blur)
        const burstWindow = Math.min(cooldownMs, 2000);
        if (now - lastGlobal < burstWindow) {
            console.log(`[Security] Skipped ${type} - within global burst window (${now - lastGlobal}ms < ${burstWindow}ms)`);
            return;
        }

        lastViolationTime.current[type] = now;
        lastGlobalViolationTime.current = now;

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

        // Check for split screen or floating windows on mobile
        const runDimensionCheck = () => {
            if (!detectSplitScreen && !detectFloatingWindow) return;
            const result = checkSplitOrFloatingScreen();
            if (result.isSplitScreen && detectSplitScreen) {
                logViolation("SPLIT_SCREEN", result.details || "Layar terbelah (Split Screen) terdeteksi");
            } else if (result.isFloatingWindow && detectFloatingWindow) {
                logViolation("FLOATING_WINDOW", result.details || "Jendela mengambang (Floating Window) terdeteksi");
            }
        };

        // Run dimension check immediately on mount
        runDimensionCheck();
        const dimensionInterval = setInterval(runDimensionCheck, 1500);

        // Detect tab switching
        const handleVisibilityChange = () => {
            if (document.hidden) {
                lastHiddenTime.current = Date.now();

                if (detectTabSwitch) {
                    logViolation("TAB_SWITCH", "User switched to another tab");
                }
            } else {
                lastHiddenTime.current = 0;
            }
        };

        // Detect window blur or floating window interaction
        const handleBlur = () => {
            // On mobile devices, interacting with soft keyboards, speech-to-text, or text selection handles
            // can fire transient window blur events. Do not falsely trigger if typing was active.
            if (isTypingActive()) {
                return;
            }

            // When document is NOT hidden, but window lost focus, user is interacting with an external floating app or companion split window
            if (!document.hidden && detectFloatingWindow) {
                logViolation("FLOATING_WINDOW", "Jendela mengambang (Floating Window) atau aplikasi luar mengambil fokus");
            } else if (detectWindowBlur) {
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
            const target = e.target as HTMLElement | null;
            const isInputOrTextarea = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

            if (disableCopyPaste && (e.ctrlKey || e.metaKey)) {
                const key = e.key.toLowerCase();

                // Allow Ctrl+A (select all) inside input/textarea so students can edit their essay answers
                if (key === "a" && isInputOrTextarea) {
                    return;
                }

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
        window.addEventListener("resize", runDimensionCheck);
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("selectstart", handleSelectStart);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("resize", runDimensionCheck);
            clearInterval(dimensionInterval);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("selectstart", handleSelectStart);
        };
    }, [enabled, disableCopyPaste, disableRightClick, detectTabSwitch, detectWindowBlur, detectScreenshot, detectSplitScreen, detectFloatingWindow, logViolation]);

    return {
        violations: violations.current,
        getViolationCount: () => violations.current.length,
        clearViolations: () => {
            violations.current = [];
            lastViolationTime.current = {};
            lastGlobalViolationTime.current = 0;
        }
    };
}
