/**
 * Helper untuk mendapatkan URL PortoCarta secara dinamis (opsional).
 * Jika integrasi PortoCarta tidak dikonfigurasi, fungsi mengembalikan string kosong.
 */
export function isPortoCartaConfigured(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_PORTOCARTA_URL?.trim());
}

export function buildPortoCartaUrl(baseUrl: string | null | undefined, path: string = ""): string {
    const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
    const trimmedBase = (baseUrl || "").trim().replace(/\/+$/, "");
    if (!trimmedBase) return "";

    if (typeof window !== "undefined") {
        const { hostname, protocol } = window.location;
        const isLocalOrLan =
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "::1" ||
            hostname.startsWith("192.168.") ||
            hostname.startsWith("10.") ||
            hostname.startsWith("172.") ||
            hostname.endsWith(".local") ||
            hostname.endsWith(".lan");

        if (isLocalOrLan && trimmedBase.includes(":3777")) {
            return `${protocol}//${hostname}:3777${cleanPath}`;
        }
    }

    return `${trimmedBase}${cleanPath}`;
}

export function getPortoCartaUrl(path: string = ""): string {
    const onlineBase = process.env.NEXT_PUBLIC_PORTOCARTA_URL?.trim() || "";
    if (!onlineBase) return "";
    return buildPortoCartaUrl(onlineBase, path);
}
