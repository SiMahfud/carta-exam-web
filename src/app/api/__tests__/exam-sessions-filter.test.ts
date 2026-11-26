import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../exam-sessions/route";
import * as authGuardModule from "@/lib/auth-guard";
import { db } from "@/lib/db";

describe("GET /api/exam-sessions filtering and search", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    function setupDbMock(mockSessions: Array<Record<string, unknown>>) {
        let capturedWhere: unknown = undefined;
        let callCount = 0;

        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockReturnValue({
                innerJoin: vi.fn().mockReturnValue({
                    leftJoin: vi.fn().mockReturnValue({
                        where: vi.fn().mockImplementation((whereClause) => {
                            callCount++;
                            capturedWhere = whereClause;
                            if (callCount === 1) {
                                return Promise.resolve([{ count: mockSessions.length }]);
                            }
                            return {
                                orderBy: vi.fn().mockReturnValue({
                                    limit: vi.fn().mockReturnValue({
                                        offset: vi.fn().mockResolvedValue(mockSessions),
                                    }),
                                }),
                            };
                        }),
                    }),
                }),
            }),
        })) as any);

        return () => capturedWhere;
    }

    it("computes effective live status based on startTime and endTime", async () => {
        vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
            id: "admin-1",
            role: "admin",
            name: "Admin",
        } as any);

        const now = Date.now();
        setupDbMock([
            {
                id: "s-active",
                sessionName: "Ujian Berjalan",
                status: "scheduled", // stale DB status
                startTime: new Date(now - 30 * 60 * 1000).toISOString(),
                endTime: new Date(now + 30 * 60 * 1000).toISOString(),
                targetType: "class",
                targetIds: ["c1"],
                templateName: "Template A",
                durationMinutes: 60,
                createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
                createdBy: "admin-1",
                creatorName: "Admin",
            },
            {
                id: "s-completed",
                sessionName: "Ujian Selesai",
                status: "scheduled", // stale DB status
                startTime: new Date(now - 120 * 60 * 1000).toISOString(),
                endTime: new Date(now - 60 * 60 * 1000).toISOString(),
                targetType: "class",
                targetIds: ["c1"],
                templateName: "Template B",
                durationMinutes: 60,
                createdAt: new Date(now - 180 * 60 * 1000).toISOString(),
                createdBy: "admin-1",
                creatorName: "Admin",
            },
            {
                id: "s-cancelled",
                sessionName: "Ujian Dibatalkan",
                status: "cancelled",
                startTime: new Date(now - 30 * 60 * 1000).toISOString(),
                endTime: new Date(now + 30 * 60 * 1000).toISOString(),
                targetType: "class",
                targetIds: ["c1"],
                templateName: "Template C",
                durationMinutes: 60,
                createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
                createdBy: "admin-1",
                creatorName: "Admin",
            },
        ]);

        const req = new Request("http://localhost:3000/api/exam-sessions?page=1&limit=10&status=all");
        const res = await GET(req);
        expect(res.status).toBe(200);
        const json = await res.json();

        expect(json.data).toHaveLength(3);
        expect(json.data[0].status).toBe("active");
        expect(json.data[1].status).toBe("completed");
        expect(json.data[2].status).toBe("cancelled");
    });

    it("applies status, startDate, endDate, and search filters in whereClause", async () => {
        vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
            id: "teacher-1",
            role: "teacher",
            name: "Guru",
        } as any);

        const getWhere = setupDbMock([]);

        const req = new Request(
            "http://localhost:3000/api/exam-sessions?page=1&limit=10&status=active&startDate=2026-11-20T00:00:00.000Z&endDate=2026-11-26T23:59:59.999Z&search=Matematika"
        );
        const res = await GET(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.data).toEqual([]);
        expect(json.metadata.total).toBe(0);
        expect(getWhere()).toBeDefined();
    });
});
