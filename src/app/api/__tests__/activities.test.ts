import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../admin/activities/route";
import * as authGuard from "@/lib/auth-guard";
import { db } from "@/lib/db";

describe("GET /api/admin/activities", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should reject unauthorized requests", async () => {
        vi.spyOn(authGuard, "requireAuth").mockRejectedValue({
            message: "Unauthorized",
            status: 401,
        });

        const req = new Request("http://localhost/api/admin/activities");
        const res = await GET(req);
        expect(res.status).toBe(401);
    });

    it("should return formatted activity logs for admin", async () => {
        vi.spyOn(authGuard, "requireAuth").mockResolvedValue({
            id: "u-admin",
            role: "admin",
            name: "Administrator",
        });

        const mockLogs = [
            {
                id: "log-1",
                action: "created",
                entityType: "exam_session",
                entityId: "sess-1",
                details: { sessionName: "UTS Matematika" },
                createdAt: new Date().toISOString(),
                userName: "Pak Budi",
                userRole: "teacher",
            },
        ];

        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockReturnValue({
                leftJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockReturnValue({
                            limit: vi.fn().mockResolvedValue(mockLogs),
                        }),
                    }),
                    orderBy: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue(mockLogs),
                    }),
                }),
            }),
        })) as any);

        const req = new Request("http://localhost/api/admin/activities?limit=10");
        const res = await GET(req);
        expect(res.status).toBe(200);

        const json = await res.json();
        expect(Array.isArray(json)).toBe(true);
        expect(json.length).toBe(1);
        expect(json[0].description).toContain("Sesi Ujian \"UTS Matematika\" dibuat");
    });
});
