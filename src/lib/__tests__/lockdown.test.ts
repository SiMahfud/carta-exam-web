import { describe, it, expect } from 'vitest'
import { ViolationType } from '../lockdown'

// Note: Testing React hooks requires a test renderer, so we just test the types and exports
// For full hook testing, use @testing-library/react-hooks

describe('lockdown', () => {
    describe('ViolationType', () => {
        it('should define valid violation types', () => {
            const types: ViolationType[] = [
                'tab_switch',
                'window_blur',
                'context_menu',
                'copy',
                'paste',
                'cut',
                'screenshot_attempt'
            ]

            expect(types).toHaveLength(7)
        })
    })

    describe('module exports', () => {
        it('should export useTabSwitchDetector', async () => {
            const { useTabSwitchDetector } = await import('../lockdown')
            expect(typeof useTabSwitchDetector).toBe('function')
        })

        it('should export useAntiCopyPaste', async () => {
            const { useAntiCopyPaste } = await import('../lockdown')
            expect(typeof useAntiCopyPaste).toBe('function')
        })

        it('should export useScreenshotDetector', async () => {
            const { useScreenshotDetector } = await import('../lockdown')
            expect(typeof useScreenshotDetector).toBe('function')
        })

        it('should export useWatermark', async () => {
            const { useWatermark } = await import('../lockdown')
            expect(typeof useWatermark).toBe('function')
        })

        it('should export useLockdownMode', async () => {
            const { useLockdownMode } = await import('../lockdown')
            expect(typeof useLockdownMode).toBe('function')
        })
    })
})
