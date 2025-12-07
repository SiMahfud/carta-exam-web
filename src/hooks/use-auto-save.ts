"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "unsaved";

interface UseAutoSaveOptions<T> {
    /** Data to save */
    data: T;
    /** Save function */
    onSave: (data: T) => Promise<void>;
    /** Debounce delay in ms */
    delay?: number;
    /** Whether auto-save is enabled */
    enabled?: boolean;
    /** Callback after successful save */
    onSuccess?: () => void;
    /** Callback on error */
    onError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
    status: SaveStatus;
    lastSaved: Date | null;
    save: () => Promise<void>;
    isSaving: boolean;
}

export function useAutoSave<T>({
    data,
    onSave,
    delay = 2000,
    enabled = true,
    onSuccess,
    onError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
    const [status, setStatus] = useState<SaveStatus>("idle");
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const dataRef = useRef(data);
    const initialDataRef = useRef(data);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    // Update data ref when data changes
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Track mount status
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Save function
    const save = useCallback(async () => {
        if (!isMountedRef.current) return;

        setIsSaving(true);
        setStatus("saving");

        try {
            await onSave(dataRef.current);
            if (isMountedRef.current) {
                setStatus("saved");
                setLastSaved(new Date());
                initialDataRef.current = dataRef.current;
                onSuccess?.();
            }
        } catch (error) {
            if (isMountedRef.current) {
                setStatus("error");
                onError?.(error instanceof Error ? error : new Error("Save failed"));
            }
        } finally {
            if (isMountedRef.current) {
                setIsSaving(false);
            }
        }
    }, [onSave, onSuccess, onError]);

    // Debounced auto-save on data change
    useEffect(() => {
        if (!enabled) return;

        // Check if data has changed from initial
        const hasChanged = JSON.stringify(data) !== JSON.stringify(initialDataRef.current);

        if (hasChanged) {
            setStatus("unsaved");

            // Clear existing timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Set new timeout
            timeoutRef.current = setTimeout(() => {
                save();
            }, delay);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, delay, enabled, save]);

    return {
        status,
        lastSaved,
        save,
        isSaving,
    };
}

/**
 * Format relative time for last saved display
 */
export function formatLastSaved(date: Date | null): string {
    if (!date) return "";

    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 5) return "Baru saja";
    if (diff < 60) return `${diff} detik lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}
