import { NextRequest, NextResponse } from "next/server";
import { testAIConnection } from "@/lib/ai-provider";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { provider, apiKey, model, baseUrl } = body;

        if (!provider || !apiKey) {
            return NextResponse.json(
                { success: false, message: "Provider dan API Key wajib diisi." },
                { status: 400 }
            );
        }

        if (provider !== 'gemini' && provider !== 'openrouter' && provider !== 'openai_compatible') {
            return NextResponse.json(
                { success: false, message: "Provider tidak valid." },
                { status: 400 }
            );
        }

        const result = await testAIConnection(provider, apiKey, model || '', baseUrl);

        return NextResponse.json(result);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("AI Test Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Gagal menguji koneksi." },
            { status: 500 }
        );
    }
}
