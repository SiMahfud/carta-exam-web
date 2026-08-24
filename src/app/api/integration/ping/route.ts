import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "admin" && user.role !== "teacher")) {
            return NextResponse.json(
                { success: false, message: "Unauthorized." },
                { status: 401 }
            );
        }

        const portoCartaUrl = (process.env.PORTOCARTA_URL || "http://localhost:3777").replace(/\/+$/, "");
        const apiKey = process.env.PORTOCARTA_API_KEY || "pc_cartaexam_secret_key_2026_smancarta";

        const startTime = Date.now();
        const response = await fetch(`${portoCartaUrl}/api/v1/integration/ping`, {
            headers: {
                "X-API-Key": apiKey,
                "User-Agent": "CartaExam-Ping/1.0"
            },
            cache: "no-store",
            // 5 second timeout
            signal: AbortSignal.timeout(5000)
        });

        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
            const errText = await response.text();
            return NextResponse.json({
                success: false,
                connected: false,
                statusCode: response.status,
                message: `PortoCarta merespon dengan error HTTP ${response.status}`,
                details: errText,
                latencyMs,
                url: portoCartaUrl
            });
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            connected: true,
            message: data.message || "Koneksi ke PortoCarta Master Hub aktif.",
            app: data.app,
            latencyMs,
            url: portoCartaUrl
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            connected: false,
            message: `Gagal terhubung ke PortoCarta: ${error.message || "Timeout / Offline"}`,
            url: process.env.PORTOCARTA_URL || "http://localhost:3777"
        });
    }
}
