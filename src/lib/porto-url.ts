/**
 * Helper untuk mendapatkan URL PortoCarta secara dinamis
 * Mendukung akses Online (https://porto.sman1campurdarat.sch.id),
 * LAN (http://<IP_LAN>:3777), dan Localhost (http://localhost:3777).
 */
export function getPortoCartaUrl(path: string = ""): string {
    const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";

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

        if (isLocalOrLan) {
            // Port default PortoCarta adalah 3777
            return `${protocol}//${hostname}:3777${cleanPath}`;
        }
    }

    const onlineBase = process.env.NEXT_PUBLIC_PORTOCARTA_URL || "https://porto.sman1campurdarat.sch.id";
    return `${onlineBase.replace(/\/+$/, "")}${cleanPath}`;
}

