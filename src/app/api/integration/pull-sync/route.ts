import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { syncMasterDataBundle } from "@/lib/sync-engine";

export async function POST() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized. Sesi login tidak ditemukan. Silakan login ulang." },
                { status: 401 }
            );
        }

        // Izinkan peran admin atau guru/staf yang memiliki akses ke panel
        if (user.role !== "admin" && user.role !== "teacher") {
            return NextResponse.json(
                { success: false, message: "Unauthorized. Hanya admin/staf yang dapat memicu sinkronisasi." },
                { status: 403 }
            );
        }

        const portoCartaUrl = (process.env.PORTOCARTA_URL || "http://localhost:3777").replace(/\/+$/, "");
        const apiKey = process.env.PORTOCARTA_API_KEY || "pc_cartaexam_secret_key_2026_smancarta";

        // 1. Ambil bundle data master dari PortoCarta API
        const fetchRes = await fetch(`${portoCartaUrl}/api/v1/integration/sync-bundle`, {
            headers: {
                "X-API-Key": apiKey,
                "User-Agent": "CartaExam-Pull-Sync/2.0"
            },
            cache: "no-store"
        });

        if (!fetchRes.ok) {
            const errBody = await fetchRes.text();
            throw new Error(`PortoCarta HTTP ${fetchRes.status}: ${errBody}`);
        }

        const bundleData = await fetchRes.json();

        // 2. Eksekusi sinkronisasi database lokal secara langsung (tanpa loopback HTTP call)
        const syncResult = await syncMasterDataBundle(bundleData);

        return NextResponse.json(syncResult);
    } catch (error: any) {
        console.error("Pull Sync Error in CartaExam:", error);
        return NextResponse.json(
            { success: false, message: "Gagal menarik data dari PortoCarta: " + error.message },
            { status: 500 }
        );
    }
}
