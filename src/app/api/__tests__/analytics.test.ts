import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../admin/analytics/route";
import * as authGuard from "@/lib/auth-guard";
import { db } from "@/lib/db";

describe("GET /api/admin/analytics", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should reject unauthenticated request", async () => {
        vi.spyOn(authGuard, "requireAuth").mockRejectedValue({
            message: "Unauthorized",
            status: 401,
        });

        const res = await GET();
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe("Unauthorized");
    });

    it("should return formatted analytics when authenticated", async () => {
        vi.spyOn(authGuard, "requireAuth").mockResolvedValue({
            id: "u-admin",
            role: "admin",
            name: "Admin User",
        });

        // Mock DB calls
        const mockCompleted = [
            { score: 90 },
            { score: 80 },
            { score: 70 },
            { score: 50 },
        ];

        vi.spyOn(db, "select").mockImplementation((() => {
            return {
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue(mockCompleted),
                    groupBy: vi.fn().mockReturnValue([
                        { type: "mc", count: 10 },
                        { type: "essay", count: 5 },
                    ]),
                    innerJoin: vi.fn().mockReturnValue({
                        innerJoin: vi.fn().mockReturnValue({
                            innerJoin: vi.fn().mockReturnValue({
                                where: vi.fn().mockReturnValue({
                                    groupBy: vi.fn().mockReturnValue([
                                        {
                                            subjectId: "sub-1",
                                            subjectName: "Matematika",
                                            subjectCode: "MTK",
                                            avgScore: 82.5,
                                            submissionCount: 4,
                                        },
                                    ]),
                                }),
                            }),
                        }),
                    }),
                    leftJoin: vi.fn().mockReturnValue({
                        groupBy: vi.fn().mockReturnValue({
                            orderBy: vi.fn().mockReturnValue({
                                limit: vi.fn().mockReturnValue([]),
                            }),
                        }),
                    }),
                }),
            } as any;
        }) as any);

        const res = await GET();
        expect(res.status).toBe(200);
        const json = await res.json();

        expect(json).toHaveProperty("scoreDistribution");
        expect(json).toHaveProperty("questionTypeDistribution");
        expect(json).toHaveProperty("summary");
        expect(json.scoreDistribution.total).toBe(4);
        expect(json.scoreDistribution.excellent).toBe(1); // 90
        expect(json.scoreDistribution.good).toBe(1);      // 80
        expect(json.scoreDistribution.fair).toBe(1);      // 70
        expect(json.scoreDistribution.poor).toBe(1);      // 50
    });
});
