import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExamSecurity } from '@/hooks/use-exam-security';

describe('useExamSecurity', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
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
});
