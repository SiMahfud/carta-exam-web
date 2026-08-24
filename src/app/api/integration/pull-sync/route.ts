import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function POST() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== "admin") {
            return NextResponse.json({ success: false, message: "Unauthorized. Hanya admin yang dapat memicu sinkronisasi." }, { status: 403 });
        }

        const portoCartaUrl = process.env.PORTOCARTA_URL || "http://localhost:3777";
        const apiKey = process.env.PORTOCARTA_API_KEY || "pc_cartaexam_secret_key_2026_smancarta";

        // 1. Ambil data bundle dari PortoCarta
        const fetchRes = await fetch(`${portoCartaUrl}/api/v1/integration/sync-bundle`, {
            headers: {
                "X-API-Key": apiKey,
                "User-Agent": "CartaExam-Pull-Sync/1.0"
            },
            cache: "no-store"
        });

        if (!fetchRes.ok) {
            const errBody = await fetchRes.text();
            throw new Error(`PortoCarta HTTP ${fetchRes.status}: ${errBody}`);
        }

        const bundleData = await fetchRes.json();

        // 2. Teruskan ke sync-receive internal CartaExam
        const appUrl = process.env.APP_URL || "http://localhost:3333";
        const syncRes = await fetch(`${appUrl}/api/integration/sync-receive`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey
            },
            body: JSON.stringify(bundleData)
        });

        const syncResult = await syncRes.json();
        return NextResponse.json(syncResult);
    } catch (error: any) {
        console.error("Pull Sync Error:", error);
        return NextResponse.json({ success: false, message: "Gagal menarik data dari PortoCarta: " + error.message }, { status: 500 });
    }
}
