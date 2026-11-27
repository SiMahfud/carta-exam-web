import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import { GET } from "../exambro/download/route";

describe("GET /api/exambro/download", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should return 404 when APK does not exist", async () => {
        vi.spyOn(fs, "existsSync").mockReturnValue(false);

        const res = await GET();
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toContain("belum tersedia");
    });

    it("should serve the signed APK with android package-archive headers", async () => {
        vi.spyOn(fs, "existsSync").mockReturnValue(true);
        vi.spyOn(fs.promises, "stat").mockResolvedValue({ size: 1234 } as never);
        vi.spyOn(fs.promises, "readFile").mockResolvedValue(Buffer.from("PK-apk-bytes") as never);

        const res = await GET();
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("application/vnd.android.package-archive");
        expect(res.headers.get("Content-Disposition")).toContain("CartaExambro-v1.1.0.apk");
        expect(res.headers.get("Content-Length")).toBe("1234");
        expect(res.headers.get("X-Exambro-Version-Code")).toBe("2");
        expect(res.headers.get("X-Exambro-Version-Name")).toBe("1.1.0");
    });
});
