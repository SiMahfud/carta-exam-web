import { NextRequest, NextResponse } from "next/server";
import { getExambroVersionPayload } from "@/lib/exambro-version";

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

// GET /api/exambro/version - Return latest CartaExambro Android APK metadata
export async function GET(request: NextRequest) {
    try {
        const origin = resolveRequestOrigin(request);
        const payload = await getExambroVersionPayload(origin);

        return NextResponse.json(
            {
                success: true,
                data: payload,
            },
            {
                status: 200,
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                },
            }
        );
    } catch (error) {
        console.error("Error resolving CartaExambro version:", error);
        return NextResponse.json(
            { success: false, error: "Gagal memeriksa versi CartaExambro." },
            { status: 500 }
        );
    }
}
