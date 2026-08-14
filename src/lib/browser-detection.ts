/**
 * Browser Detection Utility
 * 
 * Detects Safe Exam Browser (SEB) and Exambro Android client
 * based on User-Agent strings and custom request headers.
 */

export interface BrowserDetectionResult {
    isSeb: boolean
    isExambro: boolean
    isStandardBrowser: boolean
    browserName: string
    details?: string
}

/**
 * Detect the browser type from request headers (server-side)
 */
export function detectBrowser(headers: Headers): BrowserDetectionResult {
    const userAgent = headers.get('user-agent') || ''
    const sebHeader = headers.get('x-safeexambrowser-requesthash') || headers.get('x-safeexambrowser-configkeyhash')
    const exambroHeader = headers.get('x-exambro-app') || headers.get('x-cartaexambro')

    const isSeb = detectSEB(userAgent, sebHeader)
    const isExambro = detectExambro(userAgent, exambroHeader)

    let browserName = 'Standard Browser'
    if (isSeb) browserName = 'Safe Exam Browser'
    else if (isExambro) browserName = 'Exambro'

    return {
        isSeb,
        isExambro,
        isStandardBrowser: !isSeb && !isExambro,
        browserName,
    }
}

/**
 * Detect Safe Exam Browser (SEB)
 * SEB identifies itself via User-Agent and/or custom request headers
 */
function detectSEB(userAgent: string, sebHeader: string | null): boolean {
    // Check User-Agent for SEB identifiers
    const uaLower = userAgent.toLowerCase()
    if (uaLower.includes('seb/') || uaLower.includes('safeexambrowser')) {
        return true
    }

    // Check for SEB-specific request headers
    if (sebHeader) {
        return true
    }

    return false
}

/**
 * Detect Exambro / CartaExambro Android app
 */
function detectExambro(userAgent: string, exambroHeader: string | null): boolean {
    const uaLower = userAgent.toLowerCase()

    // Check User-Agent for Exambro identifiers
    if (uaLower.includes('exambro') || uaLower.includes('cartaexambro')) {
        return true
    }

    // Check for Exambro-specific request headers
    if (exambroHeader) {
        return true
    }

    return false
}

/**
 * Validate browser requirements for an exam session (server-side)
 * 
 * @returns null if browser is allowed, or an error message string if blocked
 */
export function validateBrowserRequirements(
    headers: Headers,
    settings: {
        requireSeb?: boolean
        requireExambro?: boolean
    }
): string | null {
    if (!settings.requireSeb && !settings.requireExambro) {
        return null // No browser restrictions
    }

    const detection = detectBrowser(headers)

    // If SEB is required
    if (settings.requireSeb && !settings.requireExambro) {
        if (!detection.isSeb) {
            return 'Ujian ini memerlukan Safe Exam Browser (SEB). Silakan buka ujian menggunakan aplikasi SEB.'
        }
        return null
    }

    // If Exambro is required
    if (settings.requireExambro && !settings.requireSeb) {
        if (!detection.isExambro) {
            return 'Ujian ini memerlukan aplikasi Exambro. Silakan buka ujian menggunakan aplikasi Exambro di perangkat Android Anda.'
        }
        return null
    }

    // If both are allowed (either one is acceptable)
    if (settings.requireSeb && settings.requireExambro) {
        if (!detection.isSeb && !detection.isExambro) {
            return 'Ujian ini memerlukan Safe Exam Browser (SEB) atau aplikasi Exambro. Silakan gunakan salah satu aplikasi tersebut.'
        }
        return null
    }

    return null
}
