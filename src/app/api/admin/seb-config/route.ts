import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import {
    buildSebLaunchUrls,
    buildUrlFilterRules,
    computeSebConfigKey,
    loadSebConfig,
    saveSebConfig,
} from "@/lib/seb-config";

const updateSebSchema = z.object({
    examUrl: z.string().url("URL CartaExam tidak valid"),
    portoCartaUrl: z.string().url("URL PortoCarta tidak valid"),
    startPath: z.string().min(1).default("/login"),
    allowSsoPortoCarta: z.boolean().default(true),
    portoAllowedMode: z.enum(["full_domain", "sso_only"]).default("full_domain"),
    allowQuit: z.boolean().default(true),
    quitPassword: z.string().max(128).optional(),
    clearQuitPassword: z.boolean().optional(),
    quitURL: z.string().max(500).optional(),
    enableUrlFilter: z.boolean().default(true),
    sendBrowserExamKey: z.boolean().default(true),
    allowScreenCapture: z.boolean().default(false),
    clearCookiesOnEnd: z.boolean().default(true),
    showTaskBar: z.boolean().default(true),
    showReloadButton: z.boolean().default(true),
    allowPopupsForSso: z.boolean().default(true),
});

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

function buildPublicPayload(config: Awaited<ReturnType<typeof loadSebConfig>>) {
    const { hashedQuitPassword, ...rest } = config;
    return {
        ...rest,
        hasQuitPassword: Boolean(hashedQuitPassword),
        configKey: computeSebConfigKey(config),
        launchUrls: buildSebLaunchUrls(config.examUrl),
        urlFilterPreview: config.enableUrlFilter ? buildUrlFilterRules(config) : [],
    };
}

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        if (user.role !== "admin") {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const origin = resolveRequestOrigin(request);
        const config = await loadSebConfig(origin);

        return NextResponse.json({
            success: true,
            data: buildPublicPayload(config),
        });
    } catch (error) {
        console.error("Failed to load SEB config:", error);
        return NextResponse.json(
            { success: false, error: "Gagal memuat konfigurasi SEB" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        if (user.role !== "admin") {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const parsed = updateSebSchema.parse(body);
        const origin = resolveRequestOrigin(request);

        const saved = await saveSebConfig(parsed, origin);

        return NextResponse.json({
            success: true,
            message: "Konfigurasi Safe Exam Browser berhasil disimpan",
            data: buildPublicPayload(saved),
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.issues[0]?.message || "Input tidak valid" },
                { status: 400 }
            );
        }
        console.error("Failed to save SEB config:", error);
        return NextResponse.json(
            { success: false, error: "Gagal menyimpan konfigurasi SEB" },
            { status: 500 }
        );
    }
}
