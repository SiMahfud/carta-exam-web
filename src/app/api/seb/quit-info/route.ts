import { NextRequest, NextResponse } from "next/server";
import { loadSebConfig } from "@/lib/seb-config";

export async function GET(request: NextRequest) {
    try {
        const origin = request.nextUrl.origin;
        const config = await loadSebConfig(origin);
        const fallbackQuitUrl = `${config.examUrl.replace(/\/+$/, "")}/seb-quit`;

        return NextResponse.json({
            success: true,
            quitUrl: (config.quitURL || "").trim() || fallbackQuitUrl,
            hasQuitPassword: Boolean(config.hashedQuitPassword),
        });
    } catch (error) {
        console.error("Failed to fetch SEB quit info:", error);
        return NextResponse.json(
            { success: false, error: "Failed to load SEB quit info" },
            { status: 500 }
        );
    }
}
