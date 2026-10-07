'use client'

const DEVICE_ID_KEY = 'cartaexam_device_id'

/**
 * Get or generate a unique device identifier.
 * Stored in localStorage so it persists across sessions on the same browser/device.
 * Falls back to sessionStorage if localStorage is unavailable.
 */
function safeRandomUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try {
            return crypto.randomUUID();
        } catch {
            // fallback
        }
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        try {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        } catch {
            // fallback
        }
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

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
            try {
                localStorage.setItem(DEVICE_ID_KEY, deviceId)
            } catch { }
        }
        return deviceId
    } catch {
        // localStorage may be blocked (e.g., incognito in some browsers)
        try {
            let deviceId = sessionStorage.getItem(DEVICE_ID_KEY)
            if (!deviceId) {
                deviceId = generateDeviceId()
                try {
                    sessionStorage.setItem(DEVICE_ID_KEY, deviceId)
                } catch { }
            }
            return deviceId
        } catch {
            // Fallback: generate a new one each time (least ideal)
            try {
                return generateDeviceId()
            } catch {
                return `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
            }
        }
    }
}

/**
 * Generate a unique device ID using crypto API + browser fingerprint hints
 */
function generateDeviceId(): string {
    const uuid = safeRandomUUID()
    let fingerprintStr = 'default-fingerprint'

    try {
        fingerprintStr = [
            typeof navigator !== 'undefined' ? navigator.userAgent?.length || 0 : 0,
            typeof navigator !== 'undefined' ? navigator.language || '' : '',
            typeof screen !== 'undefined' ? screen.width || 0 : 0,
            typeof screen !== 'undefined' ? screen.height || 0 : 0,
            typeof screen !== 'undefined' ? screen.colorDepth || 0 : 0,
            new Date().getTimezoneOffset(),
        ].join('-')
    } catch {
        // ignore
    }

    // Hash the fingerprint and combine with UUID
    let hash = 0
    for (let i = 0; i < fingerprintStr.length; i++) {
        const char = fingerprintStr.charCodeAt(i)
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
