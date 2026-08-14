import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../users/bulk-export/route";
import * as authGuard from "@/lib/auth-guard";
import { NextRequest } from "next/server";

describe("GET /api/users/bulk-export", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should reject non-admin requests", async () => {
        vi.spyOn(authGuard, "requireAuth").mockRejectedValue({
            message: "Unauthorized",
            status: 403,
        });

        const req = new NextRequest("http://localhost/api/users/bulk-export?type=template");
        const res = await GET(req);
        expect(res.status).toBe(403);
    });

    it("should export Excel template when type is template", async () => {
        vi.spyOn(authGuard, "requireAuth").mockResolvedValue({
            id: "u-admin",
            role: "admin",
            name: "Administrator",
        });

        const req = new NextRequest("http://localhost/api/users/bulk-export?type=template");
        const res = await GET(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("spreadsheetml.sheet");
        expect(res.headers.get("Content-Disposition")).toContain("template_import_users.xlsx");
    });
});
