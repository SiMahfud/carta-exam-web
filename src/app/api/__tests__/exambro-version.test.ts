import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { GET } from "../exambro/version/route";

describe("GET /api/exambro/version", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns version metadata with dynamic LAN origin downloadUrl and SHA-256", async () => {
        const fakeApk = Buffer.from("PK-test-apk-payload");
        const expectedHash = crypto.createHash("sha256").update(fakeApk).digest("hex");

        vi.spyOn(fs, "existsSync").mockReturnValue(true);
        vi.spyOn(fs, "readFileSync").mockReturnValue(
            JSON.stringify({
                versionCode: 2,
                versionName: "1.1.0",
                minSupportedVersionCode: 1,
                forceUpdate: false,
                changelog: "In-app self-update",
            })
        );
        vi.spyOn(fs.promises, "stat").mockResolvedValue({
            size: fakeApk.length,
            mtimeMs: 1700000000000,
        } as never);
        vi.spyOn(fs.promises, "readFile").mockResolvedValue(fakeApk as never);

        const req = new NextRequest("http://192.168.1.50:3333/api/exambro/version", {
            headers: {
                host: "192.168.1.50:3333",
            },
        });

        const res = await GET(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.versionCode).toBe(2);
        expect(json.data.versionName).toBe("1.1.0");
        expect(json.data.available).toBe(true);
        expect(json.data.fileName).toBe("CartaExambro-v1.1.0.apk");
        expect(json.data.fileSize).toBe(fakeApk.length);
        expect(json.data.sha256).toBe(expectedHash);
        expect(json.data.downloadPath).toBe("/api/exambro/download");
        expect(json.data.downloadUrl).toBe("http://192.168.1.50:3333/api/exambro/download");
    });

    it("respects x-forwarded-proto and x-forwarded-host for online HTTPS domain", async () => {
        vi.spyOn(fs, "existsSync").mockReturnValue(false);

        const req = new NextRequest("http://localhost:3333/api/exambro/version", {
            headers: {
                "x-forwarded-proto": "https",
                "x-forwarded-host": "exam.sman1campurdarat.sch.id",
            },
        });

        const res = await GET(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.available).toBe(false);
        expect(json.data.downloadUrl).toBe("https://exam.sman1campurdarat.sch.id/api/exambro/download");
    });
});
