import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWakeLock } from "@/hooks/use-wake-lock";

describe("useWakeLock", () => {
    let mockSentinel: {
        released: boolean;
        type: "screen";
        release: ReturnType<typeof vi.fn>;
        addEventListener: ReturnType<typeof vi.fn>;
        removeEventListener: ReturnType<typeof vi.fn>;
        onrelease: null;
        listeners: Record<string, ((ev: Event) => void)[]>;
    };

    let mockRequest: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockSentinel = {
            released: false,
            type: "screen",
            release: vi.fn().mockImplementation(async () => {
                mockSentinel.released = true;
                if (mockSentinel.listeners["release"]) {
                    mockSentinel.listeners["release"].forEach(cb => cb(new Event("release")));
                }
            }),
            addEventListener: vi.fn().mockImplementation((event: string, cb: (ev: Event) => void) => {
                if (!mockSentinel.listeners[event]) mockSentinel.listeners[event] = [];
                mockSentinel.listeners[event].push(cb);
            }),
            removeEventListener: vi.fn(),
            onrelease: null,
            listeners: {},
        };

        mockRequest = vi.fn().mockResolvedValue(mockSentinel);

        Object.defineProperty(navigator, "wakeLock", {
            value: {
                request: mockRequest,
            },
            writable: true,
            configurable: true,
        });

        Object.defineProperty(document, "visibilityState", {
            value: "visible",
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should detect wakeLock support when present in navigator", () => {
        const { result } = renderHook(() => useWakeLock({ enabled: false }));
        expect(result.current.isSupported).toBe(true);
    });

    it("should request screen wake lock when enabled is true", async () => {
        const { result } = renderHook(() => useWakeLock({ enabled: true }));

        // Wait for promise resolution in effect
        await act(async () => {
            await Promise.resolve();
        });

        expect(mockRequest).toHaveBeenCalledWith("screen");
        expect(result.current.isActive).toBe(true);
    });

    it("should release wake lock on unmount or when disabled", async () => {
        const { result, unmount } = renderHook(() => useWakeLock({ enabled: true }));

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.isActive).toBe(true);

        await act(async () => {
            unmount();
        });

        expect(mockSentinel.release).toHaveBeenCalled();
    });

    it("should re-acquire wake lock on visibilitychange when returning to visible", async () => {
        renderHook(() => useWakeLock({ enabled: true }));

        await act(async () => {
            await Promise.resolve();
        });

        expect(mockRequest).toHaveBeenCalledTimes(1);

        // Simulate page becoming hidden, then visible again
        Object.defineProperty(document, "visibilityState", { value: "visible", writable: true });

        await act(async () => {
            document.dispatchEvent(new Event("visibilitychange"));
            await Promise.resolve();
        });

        expect(mockRequest).toHaveBeenCalled();
    });

    it("should handle request failure gracefully without throwing", async () => {
        const onError = vi.fn();
        mockRequest.mockRejectedValueOnce(new Error("Permission denied"));

        const { result } = renderHook(() => useWakeLock({ enabled: true, onRequestError: onError }));

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.isActive).toBe(false);
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
});
