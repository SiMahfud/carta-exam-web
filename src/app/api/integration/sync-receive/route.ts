import { NextRequest, NextResponse } from "next/server";
import { syncMasterDataBundle } from "@/lib/sync-engine";

export async function POST(request: NextRequest) {
    try {
        // Mendukung 3 format autentikasi: Header X-API-Key, Authorization Bearer, atau Query ?api_key=
        let apiKey = request.headers.get("x-api-key") || request.nextUrl.searchParams.get("api_key");
        
        const authHeader = request.headers.get("authorization");
        if (!apiKey && authHeader && authHeader.startsWith("Bearer ")) {
            apiKey = authHeader.substring(7).trim();
        }

        const validKey = process.env.PORTOCARTA_API_KEY || "pc_cartaexam_secret_key_2026_smancarta";

        if (!apiKey || apiKey !== validKey) {
            return NextResponse.json(
                { success: false, message: "Unauthorized: API Key integrasi tidak valid atau tidak disertakan." },
                { status: 401 }
            );
        }

        const body = await request.json();
        const result = await syncMasterDataBundle(body);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Sync Receive Error in CartaExam:", error);
        return NextResponse.json(
            { success: false, message: "Gagal memproses sinkronisasi: " + error.message },
            { status: 500 }
        );
    }
}
