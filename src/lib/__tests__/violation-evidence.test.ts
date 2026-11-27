import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
    extractEvidenceUrlsFromLog,
    deleteEvidenceFiles,
    deleteSessionEvidenceFolder,
} from "../violation-evidence";

describe("violation-evidence helper", () => {
    const testSession = "test-cleanup-session";
    const sessionDir = path.join(process.cwd(), "public", "uploads", "violations", testSession);

    afterEach(() => {
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
    });

    it("should extract evidenceUrl and evidenceUrls from array or JSON string", () => {
        const rawLog = JSON.stringify([
            {
                type: "APP_SWITCH",
                evidenceUrl: `/uploads/violations/${testSession}/a.jpg`,
                evidenceUrls: [
                    `/uploads/violations/${testSession}/a.jpg`,
                    `/uploads/violations/${testSession}/b.jpg`,
                ],
            },
            {
                type: "WINDOW_BLUR",
                evidenceUrl: "/uploads/questions/ignore-non-violation.jpg",
            },
        ]);

        const extracted = extractEvidenceUrlsFromLog(rawLog);
        expect(extracted).toEqual([
            `/uploads/violations/${testSession}/a.jpg`,
            `/uploads/violations/${testSession}/b.jpg`,
        ]);
    });

    it("should delete screenshot files inside public/uploads/violations and ignore traversal", async () => {
        fs.mkdirSync(sessionDir, { recursive: true });
        const fileA = path.join(sessionDir, "a.jpg");
        const fileB = path.join(sessionDir, "b.jpg");
        fs.writeFileSync(fileA, "img-a");
        fs.writeFileSync(fileB, "img-b");

        const deleted = await deleteEvidenceFiles([
            `/uploads/violations/${testSession}/a.jpg`,
            `/uploads/violations/${testSession}/b.jpg`,
            "/uploads/violations/../../package.json",
            `/uploads/violations/${testSession}/missing.jpg`,
        ]);

        expect(deleted).toBe(2);
        expect(fs.existsSync(fileA)).toBe(false);
        expect(fs.existsSync(fileB)).toBe(false);
    });

    it("should remove session evidence folder completely", async () => {
        fs.mkdirSync(sessionDir, { recursive: true });
        fs.writeFileSync(path.join(sessionDir, "shot.jpg"), "img");

        await deleteSessionEvidenceFolder(testSession);
        expect(fs.existsSync(sessionDir)).toBe(false);
    });
});
