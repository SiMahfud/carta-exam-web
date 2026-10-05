import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExamSecurity } from '@/hooks/use-exam-security';

describe('useExamSecurity', () => {
    const originalUA = navigator.userAgent;

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        Object.defineProperty(navigator, 'userAgent', { value: originalUA, writable: true, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true, configurable: true });
        Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true, configurable: true });
        Object.defineProperty(window.screen, 'height', { value: 1080, writable: true, configurable: true });
        Object.defineProperty(window.screen, 'width', { value: 1920, writable: true, configurable: true });
    });

    it('should trigger TAB_SWITCH violation when document becomes hidden', () => {
        const onViolation = vi.fn();
        renderHook(() => useExamSecurity({ onViolation, detectTabSwitch: true, detectScreenshot: true }));

        // Simulate document.hidden = true
        Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        expect(onViolation).toHaveBeenCalledTimes(1);
        expect(onViolation).toHaveBeenCalledWith(expect.objectContaining({
            type: 'TAB_SWITCH',
        }));
    });

    it('should NOT trigger false-positive SCREENSHOT violation when document becomes visible again', () => {
        const onViolation = vi.fn();
        renderHook(() => useExamSecurity({ onViolation, detectTabSwitch: true, detectScreenshot: true }));

        // 1. User leaves tab
        Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
        act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
        });
        expect(onViolation).toHaveBeenCalledTimes(1);
        expect(onViolation).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'TAB_SWITCH' }));

        // 2. User comes back 500ms later
        act(() => {
            vi.advanceTimersByTime(500);
            Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
        });

        // Should NOT have triggered a second violation (no SCREENSHOT violation)
        expect(onViolation).toHaveBeenCalledTimes(1);
    });

    it('should enforce cooldown debounce and skip rapid repeat violations', () => {
        const onViolation = vi.fn();
        renderHook(() => useExamSecurity({ onViolation, cooldownMs: 5000, disableCopyPaste: true }));

        // Trigger Ctrl+C
        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
        });
        expect(onViolation).toHaveBeenCalledTimes(1);

        // Repeat Ctrl+C after 1 second (within 5s cooldown)
        act(() => {
            vi.advanceTimersByTime(1000);
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
        });
        // Still 1 call because it is within cooldown
        expect(onViolation).toHaveBeenCalledTimes(1);

        // Advance past 5s cooldown
        act(() => {
            vi.advanceTimersByTime(5000);
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
        });
        // Now allowed, total 2 calls
        expect(onViolation).toHaveBeenCalledTimes(2);
    });

    it('should detect legitimate PrintScreen shortcuts', () => {
        const onViolation = vi.fn();
        renderHook(() => useExamSecurity({ onViolation, detectScreenshot: true }));

        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'PrintScreen' }));
        });

        expect(onViolation).toHaveBeenCalledWith(expect.objectContaining({
            type: 'SCREENSHOT',
            details: 'PrintScreen attempted'
        }));
    });

    it('should trigger FLOATING_WINDOW when window loses focus while document is still visible', () => {
        const onViolation = vi.fn();
        renderHook(() => useExamSecurity({ onViolation, detectFloatingWindow: true }));

        // Document is visible (not hidden), but window blurs (e.g. user taps floating WhatsApp window)
        Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
        act(() => {
            window.dispatchEvent(new Event('blur'));
        });

        expect(onViolation).toHaveBeenCalledTimes(1);
        expect(onViolation).toHaveBeenCalledWith(expect.objectContaining({
            type: 'FLOATING_WINDOW',
        }));
    });

    it('should trigger SPLIT_SCREEN on mobile when viewport height is halved', () => {
        const onViolation = vi.fn();

        // Mock mobile user agent
        Object.defineProperty(navigator, 'userAgent', {
            value: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
            writable: true,
            configurable: true
        });

        // Set screen dimensions: 400x800, but innerHeight only 350 (< 70% of 800)
        Object.defineProperty(window.screen, 'height', { value: 800, writable: true, configurable: true });
        Object.defineProperty(window.screen, 'width', { value: 400, writable: true, configurable: true });
        Object.defineProperty(window.screen, 'availHeight', { value: 800, writable: true, configurable: true });
        Object.defineProperty(window.screen, 'availWidth', { value: 400, writable: true, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 350, writable: true, configurable: true });
        Object.defineProperty(window, 'innerWidth', { value: 400, writable: true, configurable: true });

        renderHook(() => useExamSecurity({ onViolation, detectSplitScreen: true }));

        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        expect(onViolation).toHaveBeenCalledWith(expect.objectContaining({
            type: 'SPLIT_SCREEN',
        }));
    });

    it('should allow Ctrl+A inside textarea or input without triggering violation', () => {
        const onViolation = vi.fn();
        renderHook(() => useExamSecurity({ onViolation, disableCopyPaste: true }));

        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.focus();

        const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true });
        act(() => {
            textarea.dispatchEvent(event);
        });

        expect(onViolation).not.toHaveBeenCalled();
        document.body.removeChild(textarea);
    });

    it('should trigger KEYBOARD_SHORTCUT for Ctrl+A when target is outside editable elements', () => {
        const onViolation = vi.fn();
        renderHook(() => useExamSecurity({ onViolation, disableCopyPaste: true }));

        act(() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
        });

        expect(onViolation).toHaveBeenCalledTimes(1);
        expect(onViolation).toHaveBeenCalledWith(expect.objectContaining({
            type: 'KEYBOARD_SHORTCUT',
        }));
    });

    it('should ignore window blur when typing is active in textarea', () => {
        const onViolation = vi.fn();
        renderHook(() => useExamSecurity({ onViolation, detectFloatingWindow: true }));

        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.focus();

        act(() => {
            textarea.dispatchEvent(new Event('focusin', { bubbles: true }));
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            window.dispatchEvent(new Event('blur'));
        });

        expect(onViolation).not.toHaveBeenCalled();
        document.body.removeChild(textarea);
    });
});
