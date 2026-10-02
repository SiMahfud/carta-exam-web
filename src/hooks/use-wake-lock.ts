"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Types for Screen Wake Lock API
export interface WakeLockSentinel extends EventTarget {
    readonly released: boolean;
    readonly type: "screen";
    release(): Promise<void>;
    addEventListener(type: "release", listener: (this: WakeLockSentinel, ev: Event) => any): void;
    removeEventListener(type: "release", listener: (this: WakeLockSentinel, ev: Event) => any): void;
    onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null;
}

export interface UseWakeLockOptions {
    enabled?: boolean;
    onRequestSuccess?: () => void;
    onRequestError?: (error: Error) => void;
    onRelease?: () => void;
}

export interface UseWakeLockReturn {
    isSupported: boolean;
    isActive: boolean;
    requestWakeLock: () => Promise<boolean>;
    releaseWakeLock: () => Promise<void>;
}

/**
 * Hook to manage the Screen Wake Lock API.
 * Prevents mobile and desktop screens from dimming or locking/sleeping automatically during exams.
 */
export function useWakeLock(options: UseWakeLockOptions = {}): UseWakeLockReturn {
    const {
        enabled = true,
        onRequestSuccess,
        onRequestError,
        onRelease,
    } = options;

    const [isSupported, setIsSupported] = useState(false);
    const [isActive, setIsActive] = useState(false);

    const sentinelRef = useRef<WakeLockSentinel | null>(null);
    const isRequestingRef = useRef(false);

    // Check support on mount
    useEffect(() => {
        const supported = typeof window !== "undefined" &&
            typeof navigator !== "undefined" &&
            "wakeLock" in navigator;
        setIsSupported(supported);
    }, []);

    // Release active wake lock
    const releaseWakeLock = useCallback(async () => {
        if (sentinelRef.current) {
            try {
                if (!sentinelRef.current.released) {
                    await sentinelRef.current.release();
                }
            } catch (err) {
                console.warn("[WakeLock] Failed to release wake lock:", err);
            } finally {
                sentinelRef.current = null;
                setIsActive(false);
                onRelease?.();
            }
        }
    }, [onRelease]);

    // Request screen wake lock
    const requestWakeLock = useCallback(async (): Promise<boolean> => {
        if (typeof window === "undefined" || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
            return false;
        }

        // Avoid requesting if document is hidden or request in progress
        if (typeof document !== "undefined" && document.visibilityState !== "visible") {
            return false;
        }

        // If already active and not released, reuse
        if (sentinelRef.current && !sentinelRef.current.released) {
            setIsActive(true);
            return true;
        }

        if (isRequestingRef.current) {
            return false;
        }

        isRequestingRef.current = true;

        try {
            const nav = navigator as Navigator & {
                wakeLock: { request(type: "screen"): Promise<WakeLockSentinel> };
            };

            const sentinel = await nav.wakeLock.request("screen");

            sentinel.addEventListener("release", () => {
                setIsActive(false);
                sentinelRef.current = null;
                onRelease?.();
            });

            sentinelRef.current = sentinel;
            setIsActive(true);
            onRequestSuccess?.();
            return true;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            // Only log if not AbortError / intentional cancellation
            if (error.name !== "AbortError") {
                console.warn("[WakeLock] Could not acquire screen wake lock:", error.message);
            }
            onRequestError?.(error);
            setIsActive(false);
            return false;
        } finally {
            isRequestingRef.current = false;
        }
    }, [onRequestSuccess, onRequestError, onRelease]);

    // Automatically request or release based on enabled state
    useEffect(() => {
        if (!isSupported) return;

        if (enabled) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        return () => {
            releaseWakeLock();
        };
    }, [enabled, isSupported, requestWakeLock, releaseWakeLock]);

    // Re-acquire wake lock on visibilitychange when tab returns to visible
    useEffect(() => {
        if (!isSupported || !enabled) return;

        const handleVisibilityChange = async () => {
            if (document.visibilityState === "visible" && enabled) {
                // When page becomes visible again, wake lock needs to be re-acquired
                await requestWakeLock();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [enabled, isSupported, requestWakeLock]);

    return {
        isSupported,
        isActive,
        requestWakeLock,
        releaseWakeLock,
    };
}
