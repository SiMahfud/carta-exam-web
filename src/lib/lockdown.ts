'use client'

import { useEffect, useRef } from 'react'

export type ViolationType =
    | 'tab_switch'
    | 'window_blur'
    | 'context_menu'
    | 'copy'
    | 'paste'
    | 'cut'
    | 'screenshot_attempt'
    | 'watermark_tampering'

export interface ViolationEvent {
    type: ViolationType
    timestamp: number
    details?: string
}

/**
 * Hook to detect tab switching and window blur events
 * Returns violation count and violation history
 */
export function useTabSwitchDetector(
    onViolation: (event: ViolationEvent) => void,
    enabled: boolean = true
) {
    const violationCount = useRef(0)

    useEffect(() => {
        if (!enabled) return

        const handleVisibilityChange = () => {
            if (document.hidden) {
                violationCount.current++
                onViolation({
                    type: 'tab_switch',
                    timestamp: Date.now(),
                    details: 'User switched to another tab'
                })
            }
        }

        const handleWindowBlur = () => {
            violationCount.current++
            onViolation({
                type: 'window_blur',
                timestamp: Date.now(),
                details: 'Window lost focus'
            })
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('blur', handleWindowBlur)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('blur', handleWindowBlur)
        }
    }, [onViolation, enabled])

    return violationCount.current
}

/**
 * Hook to disable copy, paste, cut, and right-click
 */
export function useAntiCopyPaste(
    onViolation: (event: ViolationEvent) => void,
    enabled: boolean = true
) {
    useEffect(() => {
        if (!enabled) return

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault()
            onViolation({
                type: 'copy',
                timestamp: Date.now(),
                details: 'Copy attempt blocked'
            })
        }

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault()
            onViolation({
                type: 'paste',
                timestamp: Date.now(),
                details: 'Paste attempt blocked'
            })
        }

        const handleCut = (e: ClipboardEvent) => {
            e.preventDefault()
            onViolation({
                type: 'cut',
                timestamp: Date.now(),
                details: 'Cut attempt blocked'
            })
        }

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
            onViolation({
                type: 'context_menu',
                timestamp: Date.now(),
                details: 'Right-click blocked'
            })
        }

        document.addEventListener('copy', handleCopy)
        document.addEventListener('paste', handlePaste)
        document.addEventListener('cut', handleCut)
        document.addEventListener('contextmenu', handleContextMenu)

        return () => {
            document.removeEventListener('copy', handleCopy)
            document.removeEventListener('paste', handlePaste)
            document.removeEventListener('cut', handleCut)
            document.removeEventListener('contextmenu', handleContextMenu)
        }
    }, [onViolation, enabled])
}

/**
 * Hook to detect screenshot attempts (keyboard shortcuts)
 * Note: This is limited in browsers but catches common shortcuts
 */
export function useScreenshotDetector(
    onViolation: (event: ViolationEvent) => void,
    enabled: boolean = true
) {
    useEffect(() => {
        if (!enabled) return

        const handleKeyDown = (e: KeyboardEvent) => {
            // Windows: PrtScn, Alt+PrtScn, Win+Shift+S
            // Mac: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
            const isPrintScreen = e.key === 'PrintScreen'
            const isWindowsSnip = e.shiftKey && e.key === 'S' && (e.metaKey || e.ctrlKey)
            const isMacScreenshot = e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)

            if (isPrintScreen || isWindowsSnip || isMacScreenshot) {
                e.preventDefault()
                onViolation({
                    type: 'screenshot_attempt',
                    timestamp: Date.now(),
                    details: 'Screenshot shortcut detected'
                })
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [onViolation, enabled])
}

/**
 * Hook to add watermark overlay (student name + timestamp) with anti-tampering protection.
 * If the watermark element is removed or hidden via styles/attributes, it automatically
 * recreates it and triggers a security violation.
 */
export function useWatermark(
    studentName: string,
    onViolation?: (event: ViolationEvent) => void,
    enabled: boolean = true
) {
    useEffect(() => {
        if (!enabled) return

        let isCleanedUp = false

        const createWatermark = () => {
            if (isCleanedUp) return null

            // Remove existing if any
            const existing = document.getElementById('exam-watermark')
            if (existing) existing.remove()

            const watermark = document.createElement('div')
            watermark.id = 'exam-watermark'
            watermark.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                pointer-events: none !important;
                z-index: 9999 !important;
                font-size: 24px !important;
                color: rgba(0, 0, 0, 0.08) !important;
                font-weight: bold !important;
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 50px !important;
                padding: 50px !important;
                transform: rotate(-45deg) !important;
                user-select: none !important;
                visibility: visible !important;
                opacity: 1 !important;
            `

            // Create repeating watermark pattern
            for (let i = 0; i < 20; i++) {
                const text = document.createElement('div')
                text.textContent = `${studentName} - ${new Date().toLocaleString('id-ID')}`
                text.style.cssText = 'white-space: nowrap; opacity: 0.5;'
                watermark.appendChild(text)
            }

            document.body.appendChild(watermark)
            return watermark
        }

        let watermarkEl = createWatermark()

        // MutationObserver to detect deletion or attribute tampering
        const observer = new MutationObserver((mutations) => {
            if (isCleanedUp) return

            let tampered = false

            for (const mutation of mutations) {
                // Check if watermark was removed
                if (mutation.type === 'childList') {
                    mutation.removedNodes.forEach((node) => {
                        if (node instanceof HTMLElement && (node.id === 'exam-watermark' || node.contains(watermarkEl))) {
                            tampered = true
                        }
                    })
                }

                // Check if watermark attributes / styles were tampered
                if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
                    if (mutation.target.id === 'exam-watermark') {
                        const style = mutation.target.getAttribute('style') || ''
                        if (
                            style.includes('display: none') ||
                            style.includes('opacity: 0') ||
                            style.includes('visibility: hidden') ||
                            style.includes('height: 0')
                        ) {
                            tampered = true
                        }
                    }
                }
            }

            if (tampered) {
                // Re-create watermark immediately
                watermarkEl = createWatermark()
                onViolation?.({
                    type: 'watermark_tampering',
                    timestamp: Date.now(),
                    details: 'Upaya manipulasi atau penghapusan watermark terdeteksi'
                })
            }
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'hidden']
        })

        return () => {
            isCleanedUp = true
            observer.disconnect()
            const el = document.getElementById('exam-watermark')
            if (el) el.remove()
        }
    }, [studentName, onViolation, enabled])
}

/**
 * Composite hook that combines all lockdown features
 */
export function useLockdownMode(
    studentName: string,
    onViolation: (event: ViolationEvent) => void,
    enabled: boolean = true
) {
    useTabSwitchDetector(onViolation, enabled)
    useAntiCopyPaste(onViolation, enabled)
    useScreenshotDetector(onViolation, enabled)
    useWatermark(studentName, onViolation, enabled)
}
