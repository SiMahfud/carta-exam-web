import fs from "fs";
import path from "path";

const VIOLATIONS_URL_PREFIX = "/uploads/violations/";

/**
 * Safely parse violationLog and extract all local screenshot URLs
 * from both legacy `evidenceUrl` and sequential `evidenceUrls`.
 */
export function extractEvidenceUrlsFromLog(violationLog: unknown): string[] {
    let parsed: unknown = violationLog;
    try {
        if (typeof parsed === "string") parsed = JSON.parse(parsed);
        if (typeof parsed === "string") parsed = JSON.parse(parsed);
    } catch {
        return [];
    }

    if (!Array.isArray(parsed)) return [];

    const urls = new Set<string>();
    for (const entry of parsed) {
        if (!entry || typeof entry !== "object") continue;
        const item = entry as { evidenceUrl?: unknown; evidenceUrls?: unknown };
        if (typeof item.evidenceUrl === "string" && item.evidenceUrl.startsWith(VIOLATIONS_URL_PREFIX)) {
            urls.add(item.evidenceUrl);
        }
        if (Array.isArray(item.evidenceUrls)) {
            for (const u of item.evidenceUrls) {
                if (typeof u === "string" && u.startsWith(VIOLATIONS_URL_PREFIX)) {
                    urls.add(u);
                }
            }
        }
    }
    return Array.from(urls);
}

/**
 * Delete screenshot files from disk safely, ensuring paths stay inside `public/uploads/violations`.
 */
export async function deleteEvidenceFiles(urls: string[]): Promise<number> {
    if (!urls || urls.length === 0) return 0;

    const violationsRoot = path.normalize(path.join(process.cwd(), "public", "uploads", "violations"));
    let deletedCount = 0;

    for (const rawUrl of urls) {
        if (typeof rawUrl !== "string" || !rawUrl.startsWith(VIOLATIONS_URL_PREFIX) || rawUrl.includes("..")) {
            continue;
        }
        const relPath = rawUrl.slice("/uploads/violations/".length);
        if (!relPath) continue;

        const targetPath = path.normalize(path.join(violationsRoot, relPath));
        if (!targetPath.startsWith(violationsRoot + path.sep)) {
            continue;
        }

        try {
            if (fs.existsSync(targetPath)) {
                await fs.promises.unlink(targetPath);
                deletedCount++;
            }
        } catch (err) {
            console.error("[ViolationEvidence] Failed to delete file:", targetPath, err);
        }
    }

    return deletedCount;
}

/**
 * Remove the entire screenshot directory for a deleted exam session.
 */
export async function deleteSessionEvidenceFolder(sessionId: string): Promise<void> {
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safeSessionId) return;

    const violationsRoot = path.normalize(path.join(process.cwd(), "public", "uploads", "violations"));
    const sessionDir = path.normalize(path.join(violationsRoot, safeSessionId));

    if (!sessionDir.startsWith(violationsRoot + path.sep)) {
        return;
    }

    try {
        if (fs.existsSync(sessionDir)) {
            await fs.promises.rm(sessionDir, { recursive: true, force: true });
        }
    } catch (err) {
        console.error("[ViolationEvidence] Failed to remove session directory:", sessionDir, err);
    }
}
