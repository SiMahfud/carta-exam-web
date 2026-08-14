'use client'

const DEVICE_ID_KEY = 'cartaexam_device_id'

/**
 * Get or generate a unique device identifier.
 * Stored in localStorage so it persists across sessions on the same browser/device.
 * Falls back to sessionStorage if localStorage is unavailable.
 */
export function getDeviceId(): string {
    if (typeof window === 'undefined') return ''

    try {
        let deviceId = localStorage.getItem(DEVICE_ID_KEY)
        if (!deviceId) {
            deviceId = generateDeviceId()
            localStorage.setItem(DEVICE_ID_KEY, deviceId)
        }
        return deviceId
    } catch {
        // localStorage may be blocked (e.g., incognito in some browsers)
        try {
            let deviceId = sessionStorage.getItem(DEVICE_ID_KEY)
            if (!deviceId) {
                deviceId = generateDeviceId()
                sessionStorage.setItem(DEVICE_ID_KEY, deviceId)
            }
            return deviceId
        } catch {
            // Fallback: generate a new one each time (least ideal)
            return generateDeviceId()
        }
    }
}

/**
 * Generate a unique device ID using crypto API + browser fingerprint hints
 */
function generateDeviceId(): string {
    const uuid = crypto.randomUUID()
    // Add a lightweight fingerprint component for extra uniqueness
    const fingerprint = [
        navigator.userAgent.length,
        navigator.language,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
    ].join('-')

    // Hash the fingerprint and combine with UUID
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash |= 0
    }

    return `${uuid}-${Math.abs(hash).toString(36)}`
}

/**
 * Server-side: Validate that a deviceId matches the stored one for a submission
 */
export function validateDeviceId(
    storedDeviceId: string | null | undefined,
    currentDeviceId: string | null | undefined
): { valid: boolean; reason?: string } {
    // If no stored device ID yet, it's the first request - allow it
    if (!storedDeviceId) {
        return { valid: true }
    }

    // If device binding is enabled but no current device ID provided
    if (!currentDeviceId) {
        return { valid: false, reason: 'Device ID tidak ditemukan. Pastikan Anda menggunakan browser yang sama.' }
    }

    // Compare
    if (storedDeviceId !== currentDeviceId) {
        return {
            valid: false,
            reason: 'Ujian ini sudah dimulai di perangkat lain. Anda hanya dapat mengerjakan ujian dari satu perangkat.'
        }
    }

    return { valid: true }
}
