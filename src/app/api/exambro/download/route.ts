import { NextResponse } from "next/server";
import fs from "fs";
import {
    getExambroReleaseFilename,
    loadExambroVersionConfig,
    resolveExambroApkPath,
} from "@/lib/exambro-version";

// GET /api/exambro/download - Download signed CartaExambro Android APK
export async function GET() {
    try {
        const apkPath = resolveExambroApkPath();
        if (!apkPath) {
            return NextResponse.json(
                { error: "File APK CartaExambro belum tersedia di server." },
                { status: 404 }
            );
        }

        const versionConfig = loadExambroVersionConfig();
        const apkFilename = getExambroReleaseFilename(versionConfig.versionName);

        const stat = await fs.promises.stat(apkPath);
        const fileBuffer = await fs.promises.readFile(apkPath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.android.package-archive",
                "Content-Disposition": `attachment; filename="${apkFilename}"`,
                "Content-Length": stat.size.toString(),
                "X-Exambro-Version-Code": versionConfig.versionCode.toString(),
                "X-Exambro-Version-Name": versionConfig.versionName,
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
