import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const APK_FILENAME = "CartaExambro-v1.0.0.apk";

function resolveApkPath(): string | null {
    const candidates = [
        path.join(process.cwd(), "carta-exambro", "app", "build", "outputs", "apk", "release", "app-release.apk"),
        path.join(process.cwd(), "public", "downloads", "CartaExambro.apk"),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

// GET /api/exambro/download - Download signed CartaExambro Android APK
export async function GET() {
    try {
        const apkPath = resolveApkPath();
        if (!apkPath) {
            return NextResponse.json(
                { error: "File APK CartaExambro belum tersedia di server." },
                { status: 404 }
            );
        }

        const stat = await fs.promises.stat(apkPath);
        const fileBuffer = await fs.promises.readFile(apkPath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.android.package-archive",
                "Content-Disposition": `attachment; filename="${APK_FILENAME}"`,
                "Content-Length": stat.size.toString(),
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            },
        });
    } catch (error) {
        console.error("Error serving CartaExambro APK:", error);
        return NextResponse.json(
            { error: "Gagal mengunduh APK CartaExambro." },
            { status: 500 }
        );
    }
}
