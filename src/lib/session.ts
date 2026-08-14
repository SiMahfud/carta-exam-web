import { cookies } from "next/headers";

export type UserRole = "admin" | "teacher" | "student";

export interface SessionPayload {
    id: string;
    role: UserRole;
    name: string;
    exp?: number;
}

const DEFAULT_SECRET = "carta-exam-secret-key-min-32-chars-for-hmac-sha256";

function getSecret(): string {
    const secret = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
        console.warn("[SECURITY WARNING] SESSION_SECRET is not set in environment variables! Using default secret.");
    }
    return secret || DEFAULT_SECRET;
}

/**
 * Base64 URL encode a string
 */
function base64UrlEncode(str: string): string {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(str, "utf-8")
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }
    // Browser / Edge fallback
    return btoa(unescape(encodeURIComponent(str)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

/**
 * Base64 URL decode a string
 */
function base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
        base64 += "=";
    }
    if (typeof Buffer !== "undefined") {
        return Buffer.from(base64, "base64").toString("utf-8");
    }
    // Browser / Edge fallback
    return decodeURIComponent(escape(atob(base64)));
}

/**
 * Convert ArrayBuffer to Hex String
 */
function bufferToHex(buffer: ArrayBuffer): string {
    const byteArray = new Uint8Array(buffer);
    let hexString = "";
    for (let i = 0; i < byteArray.length; i++) {
        const hex = byteArray[i].toString(16).padStart(2, "0");
        hexString += hex;
    }
    return hexString;
}

/**
 * Get CryptoKey from secret for HMAC-SHA256
 */
async function getCryptoKey(secret: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    return await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
}

/**
 * Sign a session payload and return signed token
 * Format: `<base64UrlPayload>.<signatureHex>`
 */
export async function signSession(
    payload: Omit<SessionPayload, "exp">,
    maxAgeSeconds: number = 60 * 60 * 24 // 1 day default
): Promise<string> {
    const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
    const fullPayload: SessionPayload = { ...payload, exp };
    const payloadStr = JSON.stringify(fullPayload);
    const encodedPayload = base64UrlEncode(payloadStr);

    const key = await getCryptoKey(getSecret());
    const encoder = new TextEncoder();
    const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(encodedPayload)
    );

    const signatureHex = bufferToHex(signatureBuffer);
    return `${encodedPayload}.${signatureHex}`;
}

/**
 * Verify a signed session token and return the payload if valid
 */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
    if (!token || typeof token !== "string") {
        return null;
    }

    const parts = token.split(".");
    if (parts.length !== 2) {
        return null;
    }

    const [encodedPayload, signatureHex] = parts;
    if (!encodedPayload || !signatureHex) {
        return null;
    }

    try {
        const key = await getCryptoKey(getSecret());
        const encoder = new TextEncoder();
        const expectedSignatureBuffer = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(encodedPayload)
        );
        const expectedHex = bufferToHex(expectedSignatureBuffer);

        // Constant time comparison
        if (signatureHex.length !== expectedHex.length) {
            return null;
        }

        let mismatch = 0;
        for (let i = 0; i < signatureHex.length; i++) {
            mismatch |= signatureHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
        }

        if (mismatch !== 0) {
            return null;
        }

        const decodedStr = base64UrlDecode(encodedPayload);
        const payload: SessionPayload = JSON.parse(decodedStr);

        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        if (!payload.id || !payload.role || !payload.name) {
            return null;
        }

        return {
            id: payload.id,
            role: payload.role,
            name: payload.name,
            exp: payload.exp,
        };
    } catch {
        return null;
    }
}

/**
 * Helper to get the current authenticated user from cookies in Server Components / Actions / Route Handlers
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("user_session");

        if (!sessionCookie || !sessionCookie.value) {
            return null;
        }

        return await verifySession(sessionCookie.value);
    } catch {
        return null;
    }
}
