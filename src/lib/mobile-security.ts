/**
 * Mobile security utilities for detecting Split Screen, Floating Windows,
 * and Viewport Tampering on Android & mobile browsers.
 */

export function isMobileDevice(): boolean {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && window.screen.width < 1024);
}

export function isTypingActive(): boolean {
    if (typeof document === "undefined") return false;
    const activeEl = document.activeElement;
    if (!activeEl) return false;
    const tagName = activeEl.tagName.toUpperCase();
    return tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        activeEl.getAttribute("contenteditable") === "true" ||
        (activeEl as HTMLElement).isContentEditable === true;
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

    // Split Screen:
    // - In portrait: height is constrained (< 70%). Ignored while soft-keyboard is open.
    // - In landscape: width is constrained (< 70%). Soft-keyboard never constrains width.
    const isPortraitSplit = !typing && heightRatio < 0.70;
    const isLandscapeSplit = widthRatio < 0.70;

    if (isPortraitSplit || isLandscapeSplit) {
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
