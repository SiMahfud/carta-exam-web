import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { buildSebLaunchUrls, loadSebConfig } from "@/lib/seb-config";

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
        const { sebUrl } = buildSebLaunchUrls(config.examUrl);
        const format = request.nextUrl.searchParams.get("format") || "svg";

        if (format === "png") {
            const pngBuffer = await QRCode.toBuffer(sebUrl, {
                type: "png",
                width: 512,
                margin: 2,
                errorCorrectionLevel: "M",
            });

            return new NextResponse(new Uint8Array(pngBuffer), {
                status: 200,
                headers: {
                    "Content-Type": "image/png",
                    "Content-Disposition": 'inline; filename="cartaexam-seb-qr.png"',
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            });
        }

        const svg = await QRCode.toString(sebUrl, {
            type: "svg",
            margin: 2,
            errorCorrectionLevel: "M",
            color: {
                dark: "#0f172a",
                light: "#ffffff",
            },
        });

        return new NextResponse(svg, {
            status: 200,
            headers: {
                "Content-Type": "image/svg+xml; charset=utf-8",
                "Cache-Control": "no-store, no-cache, must-revalidate",
            },
        });
    } catch (error) {
        console.error("Failed to generate SEB QR code:", error);
        return NextResponse.json(
            { success: false, error: "Gagal membuat QR Code SEB" },
            { status: 500 }
        );
    }
}
