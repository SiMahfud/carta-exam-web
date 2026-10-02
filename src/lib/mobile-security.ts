/**
 * Mobile security utilities for detecting Split Screen, Floating Windows,
 * and Viewport Tampering on Android & mobile browsers.
 */

export function isMobileDevice(): boolean {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    const isMobileUa = /android|iphone|ipad|ipod|mobile/i.test(ua);
    // Modern iPadOS (13+) reports userAgent as Macintosh with touch points
    const isIPadOS = navigator.maxTouchPoints > 1 && /macintosh/i.test(ua);
    const isTouchTabletOrMobile = navigator.maxTouchPoints > 1 &&
        (typeof window.screen !== "undefined" && Math.min(window.screen.width, window.screen.height) <= 1024);
    return isMobileUa || isIPadOS || isTouchTabletOrMobile;
}

export function isTypingActive(): boolean {
    if (typeof document === "undefined") return false;
    const activeEl = document.activeElement;
    if (activeEl) {
        const tagName = activeEl.tagName.toUpperCase();
        if (
            tagName === "INPUT" ||
            tagName === "TEXTAREA" ||
            activeEl.getAttribute("contenteditable") === "true" ||
            (activeEl as HTMLElement).isContentEditable === true
        ) {
            return true;
        }
    }

    // Check visualViewport vs innerHeight for active virtual keyboard (especially during iOS Safari transitions)
    if (typeof window !== "undefined" && window.visualViewport) {
        if (window.visualViewport.height < window.innerHeight * 0.8) {
            return true;
        }
    }

    return false;
}

export interface ScreenCheckResult {
    isSplitScreen: boolean;
    isFloatingWindow: boolean;
    heightRatio: number;
    widthRatio: number;
    details?: string;
}

/**
 * Checks if the browser window on mobile is in Split Screen or Floating Window mode
 * by analyzing viewport dimensions against the device's physical screen dimensions.
 */
export function checkSplitOrFloatingScreen(): ScreenCheckResult {
    if (typeof window === "undefined" || !isMobileDevice()) {
        return { isSplitScreen: false, isFloatingWindow: false, heightRatio: 1, widthRatio: 1 };
    }

    const screenW = window.screen.width || window.screen.availWidth;
    const screenH = window.screen.height || window.screen.availHeight;
    const innerW = window.innerWidth;
    const innerH = window.innerHeight;

    if (!screenW || !screenH) {
        return { isSplitScreen: false, isFloatingWindow: false, heightRatio: 1, widthRatio: 1 };
    }

    const heightRatio = innerH / screenH;
    const widthRatio = innerW / screenW;
    const typing = isTypingActive();

    // Check device physical orientation (screen orientation, not just viewport)
    const isDeviceLandscape = (typeof window.screen !== "undefined" && window.screen.orientation)
        ? window.screen.orientation.type.includes("landscape")
        : screenW > screenH;

    // Floating Window / Pop-up box: both dimensions significantly constrained
    if (!typing && heightRatio < 0.75 && widthRatio < 0.75) {
        return {
            isSplitScreen: false,
            isFloatingWindow: true,
            heightRatio,
            widthRatio,
            details: `Ukuran jendela tidak penuh (${Math.round(widthRatio * 100)}% x ${Math.round(heightRatio * 100)}% dari layar)`
        };
    }

    // Split Screen / Slide Over:
    // - In portrait: height is constrained (< 70%). Ignored while soft-keyboard is open.
    // - In portrait & landscape: width is constrained (< 70%) when running in split-screen or iPad Slide Over.
    // - On iPhone in landscape, Safari UI + safe area insets reduce height naturally,
    //   so heightRatio < 0.70 only applies in portrait mode.
    const isPortraitSplit = !isDeviceLandscape && !typing && heightRatio < 0.70;
    const isWidthConstrained = widthRatio < 0.70;
    const isLandscapeHeightSplit = isDeviceLandscape && !typing && heightRatio < 0.50;

    if (isPortraitSplit || isWidthConstrained || isLandscapeHeightSplit) {
        return {
            isSplitScreen: true,
            isFloatingWindow: false,
            heightRatio,
            widthRatio,
            details: `Layar terbelah (Tinggi: ${Math.round(heightRatio * 100)}%, Lebar: ${Math.round(widthRatio * 100)}%)`
        };
    }

    return { isSplitScreen: false, isFloatingWindow: false, heightRatio, widthRatio };
}
