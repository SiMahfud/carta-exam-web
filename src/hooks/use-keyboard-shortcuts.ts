"use client";

import { useEffect, useCallback, useRef } from "react";

export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
    description: string;
    category: string;
    action: () => void;
}

interface UseKeyboardShortcutsOptions {
    shortcuts: KeyboardShortcut[];
    enabled?: boolean;
}

/**
 * Check if the target is an input element
 */
function isInputElement(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target.isContentEditable
    );
}

/**
 * Normalize key for comparison
 */
function normalizeKey(key: string): string {
    return key.toLowerCase();
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
    const sequenceRef = useRef<string[]>([]);
    const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        // Skip if typing in an input
        if (isInputElement(e.target)) return;

        const pressedKey = normalizeKey(e.key);

        // Handle single key shortcuts with modifiers
        for (const shortcut of shortcuts) {
            const keys = shortcut.key.toLowerCase().split('+');

            // Check for modifier key shortcuts (e.g., "ctrl+k")
            if (keys.length > 1) {
                const mainKey = keys[keys.length - 1];
                const needsCtrl = keys.includes('ctrl') || shortcut.ctrl;
                const needsAlt = keys.includes('alt') || shortcut.alt;
                const needsShift = keys.includes('shift') || shortcut.shift;
                const needsMeta = keys.includes('meta') || shortcut.meta;

                if (
                    pressedKey === mainKey &&
                    (!needsCtrl || e.ctrlKey) &&
                    (!needsAlt || e.altKey) &&
                    (!needsShift || e.shiftKey) &&
                    (!needsMeta || e.metaKey)
                ) {
                    e.preventDefault();
                    shortcut.action();
                    return;
                }
            }
        }

        // Handle sequence shortcuts (e.g., "g d")
        sequenceRef.current.push(pressedKey);

        // Clear sequence after 1 second
        if (sequenceTimeoutRef.current) {
            clearTimeout(sequenceTimeoutRef.current);
        }
        sequenceTimeoutRef.current = setTimeout(() => {
            sequenceRef.current = [];
        }, 1000);

        // Check for sequence matches
        const currentSequence = sequenceRef.current.join(' ');

        for (const shortcut of shortcuts) {
            const shortcutKey = shortcut.key.toLowerCase();

            // Skip modifier shortcuts
            if (shortcutKey.includes('+')) continue;

            // Check if sequence matches
            if (shortcutKey === currentSequence) {
                e.preventDefault();
                shortcut.action();
                sequenceRef.current = [];
                return;
            }

            // Check if we're on track for a longer sequence
            if (shortcutKey.startsWith(currentSequence + ' ')) {
                // Still building the sequence
                return;
            }
        }

        // If no match and sequence is longer than 1, reset
        if (sequenceRef.current.length > 2) {
            sequenceRef.current = [];
        }
    }, [shortcuts, enabled]);

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            if (sequenceTimeoutRef.current) {
                clearTimeout(sequenceTimeoutRef.current);
            }
        };
    }, [handleKeyDown]);
}

/**
 * Default admin shortcuts configuration
 */
export function getAdminShortcuts(router: { push: (path: string) => void }, callbacks?: {
    openSearch?: () => void;
    openShortcutsHelp?: () => void;
}): KeyboardShortcut[] {
    return [
        // Navigation shortcuts
        {
            key: "g d",
            description: "Pergi ke Dashboard",
            category: "Navigasi",
            action: () => router.push("/admin"),
        },
        {
            key: "g s",
            description: "Pergi ke Mata Pelajaran",
            category: "Navigasi",
            action: () => router.push("/admin/subjects"),
        },
        {
            key: "g c",
            description: "Pergi ke Kelas",
            category: "Navigasi",
            action: () => router.push("/admin/classes"),
        },
        {
            key: "g q",
            description: "Pergi ke Bank Soal",
            category: "Navigasi",
            action: () => router.push("/admin/question-banks"),
        },
        {
            key: "g t",
            description: "Pergi ke Template Ujian",
            category: "Navigasi",
            action: () => router.push("/admin/exam-templates"),
        },
        {
            key: "g e",
            description: "Pergi ke Sesi Ujian",
            category: "Navigasi",
            action: () => router.push("/admin/exam-sessions"),
        },
        {
            key: "g g",
            description: "Pergi ke Penilaian",
            category: "Navigasi",
            action: () => router.push("/admin/grading"),
        },
        {
            key: "g u",
            description: "Pergi ke Manajemen User",
            category: "Navigasi",
            action: () => router.push("/admin/users"),
        },
        // Search
        {
            key: "ctrl+k",
            ctrl: true,
            description: "Buka pencarian global",
            category: "Umum",
            action: () => callbacks?.openSearch?.(),
        },
        // Help
        {
            key: "?",
            shift: true,
            description: "Tampilkan bantuan shortcut",
            category: "Umum",
            action: () => callbacks?.openShortcutsHelp?.(),
        },
    ];
}
