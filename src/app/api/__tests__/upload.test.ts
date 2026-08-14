import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../upload/route";
import { NextRequest } from "next/server";
import * as authGuard from "@/lib/auth-guard";

describe("POST /api/upload", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should reject unauthorized requests", async () => {
        vi.spyOn(authGuard, "requireAuth").mockRejectedValue({
            message: "Unauthorized - Silakan login terlebih dahulu",
            status: 401,
        });

        const req = new NextRequest("http://localhost:3000/api/upload", {
            method: "POST",
        });

        const res = await POST(req);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toContain("Unauthorized");
    });

    it("should reject missing file in formData", async () => {
        vi.spyOn(authGuard, "requireAuth").mockResolvedValue({
            id: "u-1",
            role: "admin",
            name: "Admin",
        });

        const formData = new FormData();
        const req = new NextRequest("http://localhost:3000/api/upload", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain("File tidak ditemukan");
    });

    it("should reject disallowed file types", async () => {
        vi.spyOn(authGuard, "requireAuth").mockResolvedValue({
            id: "u-1",
            role: "admin",
            name: "Admin",
        });

        const file = new File(["binary script content"], "malicious.exe", {
            type: "application/x-msdownload",
        });

        const formData = new FormData();
        formData.append("file", file);

        const req = new NextRequest("http://localhost:3000/api/upload", {
            method: "POST",
            body: formData,
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain("Tipe file tidak didukung");
    });
});
