import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../admin/backup/route";
import * as authGuard from "@/lib/auth-guard";
import { db } from "@/lib/db";

describe("GET /api/admin/backup", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should reject non-admin users", async () => {
        vi.spyOn(authGuard, "requireAuth").mockRejectedValue({
            message: "Unauthorized",
            status: 403,
        });

        const res = await GET();
        expect(res.status).toBe(403);
    });

    it("should export database backup JSON with attachment header", async () => {
        vi.spyOn(authGuard, "requireAuth").mockResolvedValue({
            id: "admin-1",
            role: "admin",
            name: "Admin SMAN 1",
        });

        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockResolvedValue([]),
        })) as any);

        const res = await GET();
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("application/json");
        expect(res.headers.get("Content-Disposition")).toContain("attachment; filename=");

        const json = await res.json();
        expect(json.appName).toBe("CartaExam");
        expect(json.version).toBe("1.0.0");
        expect(json.data).toHaveProperty("subjects");
        expect(json.data).toHaveProperty("questionBanks");
    });
});
