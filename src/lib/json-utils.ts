/**
 * JSON utility helper for safely parsing possibly double-encoded or malformed JSON data.
 */

/**
 * Safely parse JSON that may be single- or double-encoded by database/ORM serialization.
 * If data is already an object/array, it is returned as-is (unless null).
 * If parsing fails, the fallback value is returned.
 *
 * @param data - The value to parse (string, object, null, undefined, etc.)
 * @param fallback - The default value to return if parsing fails or data is null/undefined
 */
export function safeJsonParse<T>(data: unknown, fallback: T): T {
    if (data === null || data === undefined) {
        return fallback;
    }

    if (typeof data === "object") {
        return data as T;
    }

    if (typeof data !== "string") {
        return fallback;
    }

    const trimmed = data.trim();
    if (!trimmed) {
        return fallback;
    }

    try {
        let parsed = JSON.parse(trimmed);

        // Handle double-encoded JSON strings (e.g. "\"{\\\"key\\\": \\\"value\\\"}\"")
        if (typeof parsed === "string") {
            const nestedTrimmed = parsed.trim();
            if (
                (nestedTrimmed.startsWith("{") && nestedTrimmed.endsWith("}")) ||
                (nestedTrimmed.startsWith("[") && nestedTrimmed.endsWith("]"))
            ) {
                try {
                    parsed = JSON.parse(nestedTrimmed);
                } catch {
                    // Retain first parsed result if second parse fails
                }
            }
        }

        return (parsed !== null && parsed !== undefined) ? (parsed as T) : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Safely stringifies a value to JSON, returning empty string or fallback on failure (e.g., circular ref).
 */
export function safeJsonStringify(data: unknown, fallback = ""): string {
    try {
        return JSON.stringify(data);
    } catch {
        return fallback;
    }
}
