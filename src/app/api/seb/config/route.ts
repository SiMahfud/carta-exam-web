import { NextRequest, NextResponse } from "next/server";
import { generateSebPlistXml, loadSebConfig } from "@/lib/seb-config";

function resolveRequestOrigin(request: NextRequest): string {
    const proto =
        request.headers.get("x-forwarded-proto") ||
        (request.url.startsWith("https") ? "https" : "http");
    const host =
        request.headers.get("x-forwarded-host") ||
        request.headers.get("host") ||
        request.nextUrl.host;
    return host ? `${proto}://${host}` : request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
    try {
        const origin = resolveRequestOrigin(request);
        const config = await loadSebConfig(origin);
        const xml = generateSebPlistXml(config);

        return new NextResponse(xml, {
            status: 200,
            headers: {
                "Content-Type": "application/seb; charset=utf-8",
                "Content-Disposition": 'attachment; filename="cartaexam.seb"',
                "Cache-Control": "no-store, no-cache, must-revalidate",
            },
        });
    } catch (error) {
        console.error("Failed to generate SEB config:", error);
        return NextResponse.json(
            { success: false, error: "Gagal membuat file konfigurasi SEB" },
            { status: 500 }
        );
    }
}
