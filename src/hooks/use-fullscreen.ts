"use client";

import { useState, useCallback, useEffect } from "react";

interface VendorElement extends HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
}

interface VendorDocument extends Document {
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
    webkitFullscreenElement?: Element;
    mozFullScreenElement?: Element;
    msFullscreenElement?: Element;
}

interface UseFullscreenReturn {
    isFullscreen: boolean;
    enterFullscreen: () => Promise<void>;
    exitFullscreen: () => Promise<void>;
    toggleFullscreen: () => Promise<void>;
    isSupported: boolean;
}

export function useFullscreen(): UseFullscreenReturn {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const isSupported = typeof document !== "undefined" &&
        !!(document.documentElement.requestFullscreen ||
            (document.documentElement as unknown as VendorElement).webkitRequestFullscreen ||
            (document.documentElement as unknown as VendorElement).mozRequestFullScreen ||
            (document.documentElement as unknown as VendorElement).msRequestFullscreen);

    const enterFullscreen = useCallback(async () => {
        try {
            const elem = document.documentElement as unknown as VendorElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                await elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
        } catch (error) {
            console.error("Failed to enter fullscreen:", error);
        }
    }, []);

    const exitFullscreen = useCallback(async () => {
        try {
            const doc = document as unknown as VendorDocument;
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (doc.webkitExitFullscreen) {
                await doc.webkitExitFullscreen();
            } else if (doc.mozCancelFullScreen) {
                await doc.mozCancelFullScreen();
            } else if (doc.msExitFullscreen) {
                await doc.msExitFullscreen();
            }
        } catch (error) {
            console.error("Failed to exit fullscreen:", error);
        }
    }, []);

    const toggleFullscreen = useCallback(async () => {
        if (isFullscreen) {
            await exitFullscreen();
        } else {
            await enterFullscreen();
        }
    }, [isFullscreen, enterFullscreen, exitFullscreen]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const doc = document as unknown as VendorDocument;
            setIsFullscreen(
                !!(document.fullscreenElement ||
                    doc.webkitFullscreenElement ||
                    doc.mozFullScreenElement ||
                    doc.msFullscreenElement)
            );
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("mozfullscreenchange", handleFullscreenChange);
        document.addEventListener("MSFullscreenChange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
            document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
        };
    }, []);

    return {
        isFullscreen,
        enterFullscreen,
        exitFullscreen,
        toggleFullscreen,
        isSupported
    };
}
