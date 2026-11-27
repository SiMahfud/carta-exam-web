import crypto from "crypto";
import fs from "fs";
import path from "path";
import { z } from "zod";

export const exambroVersionConfigSchema = z.object({
    versionCode: z.number().int().positive().default(2),
    versionName: z.string().min(1).default("1.1.0"),
    minSupportedVersionCode: z.number().int().positive().default(1),
    forceUpdate: z.boolean().default(false),
    changelog: z.string().default(""),
});

export type ExambroVersionConfig = z.infer<typeof exambroVersionConfigSchema>;

export interface ExambroVersionPayload extends ExambroVersionConfig {
    available: boolean;
    fileName: string;
    fileSize: number;
    sha256: string;
    downloadPath: string;
    downloadUrl: string;
}

const DEFAULT_VERSION_CONFIG: ExambroVersionConfig = {
    versionCode: 2,
    versionName: "1.1.0",
    minSupportedVersionCode: 1,
    forceUpdate: false,
    changelog: "",
};

interface CachedApkDigest {
    key: string;
    fileSize: number;
    sha256: string;
}

let cachedDigest: CachedApkDigest | null = null;

export function resolveExambroApkPath(): string | null {
    const candidates = [
        path.join(
            process.cwd(),
            "carta-exambro",
            "app",
            "build",
            "outputs",
            "apk",
            "release",
            "app-release.apk"
        ),
        path.join(process.cwd(), "public", "downloads", "CartaExambro.apk"),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

export function getExambroReleaseFilename(versionName: string): string {
    const safeVersion = (versionName || "1.0.0").replace(/[^0-9A-Za-z._-]/g, "");
    return `CartaExambro-v${safeVersion || "1.0.0"}.apk`;
}

function readGradleFallbackConfig(): Partial<ExambroVersionConfig> | null {
    try {
        const gradlePath = path.join(process.cwd(), "carta-exambro", "app", "build.gradle.kts");
        if (!fs.existsSync(gradlePath)) {
            return null;
        }
        const content = fs.readFileSync(gradlePath, "utf-8");
        const codeMatch = content.match(/versionCode\s*=\s*(\d+)/);
        const nameMatch = content.match(/versionName\s*=\s*"([^"]+)"/);
        const result: Partial<ExambroVersionConfig> = {};
        if (codeMatch) {
            result.versionCode = Number.parseInt(codeMatch[1], 10);
        }
        if (nameMatch) {
            result.versionName = nameMatch[1];
        }
        return result;
    } catch {
        return null;
    }
}

export function loadExambroVersionConfig(): ExambroVersionConfig {
    const versionFile = path.join(process.cwd(), "public", "downloads", "exambro-version.json");
    let rawConfig: Record<string, unknown> = {};

    try {
        if (fs.existsSync(versionFile)) {
            const raw = fs.readFileSync(versionFile, "utf-8");
            rawConfig = JSON.parse(raw) as Record<string, unknown>;
        } else {
            const gradleFallback = readGradleFallbackConfig();
            if (gradleFallback) {
                rawConfig = gradleFallback;
            }
        }
    } catch {
        // Fallback to defaults when file cannot be parsed
    }

    const parsed = exambroVersionConfigSchema.safeParse({
        ...DEFAULT_VERSION_CONFIG,
        ...rawConfig,
    });

    const base = parsed.success ? parsed.data : DEFAULT_VERSION_CONFIG;

    const envForceUpdate = process.env.EXAMBRO_FORCE_UPDATE;
    const envMinVersion = process.env.EXAMBRO_MIN_VERSION_CODE;

    return {
        ...base,
        forceUpdate:
            envForceUpdate !== undefined
                ? envForceUpdate.toLowerCase() === "true" || envForceUpdate === "1"
                : base.forceUpdate,
        minSupportedVersionCode:
            envMinVersion && Number.isInteger(Number(envMinVersion)) && Number(envMinVersion) > 0
                ? Number(envMinVersion)
                : base.minSupportedVersionCode,
    };
}

async function computeApkDigest(apkPath: string): Promise<{ fileSize: number; sha256: string }> {
    const stat = await fs.promises.stat(apkPath);
    const cacheKey = `${apkPath}:${stat.size}:${stat.mtimeMs ?? 0}`;
    if (cachedDigest && cachedDigest.key === cacheKey) {
        return { fileSize: cachedDigest.fileSize, sha256: cachedDigest.sha256 };
    }

    const fileBuffer = await fs.promises.readFile(apkPath);
    const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex").toLowerCase();
    cachedDigest = { key: cacheKey, fileSize: stat.size, sha256 };
    return { fileSize: stat.size, sha256 };
}

export async function getExambroVersionPayload(origin?: string): Promise<ExambroVersionPayload> {
    const config = loadExambroVersionConfig();
    const apkPath = resolveExambroApkPath();
    const downloadPath = "/api/exambro/download";
    const cleanOrigin = (origin || "").trim().replace(/\/+$/, "");
    const downloadUrl = cleanOrigin ? `${cleanOrigin}${downloadPath}` : downloadPath;

    let fileSize = 0;
    let sha256 = "";

    if (apkPath) {
        try {
            const digest = await computeApkDigest(apkPath);
            fileSize = digest.fileSize;
            sha256 = digest.sha256;
        } catch {
            // Keep zero size / empty hash if stat/read fails
        }
    }

    return {
        ...config,
        available: Boolean(apkPath),
        fileName: getExambroReleaseFilename(config.versionName),
        fileSize,
        sha256,
        downloadPath,
        downloadUrl,
    };
}
