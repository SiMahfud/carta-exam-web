import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../notifications/route";
import * as sessionModule from "@/lib/session";
import { db } from "@/lib/db";

describe("GET /api/notifications", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should return empty notifications if not authenticated", async () => {
        vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(null);

        const res = await GET();
        const json = await res.json();
        expect(json.notifications).toEqual([]);
        expect(json.unreadCount).toBe(0);
    });

    it("should return student notifications when logged in as student", async () => {
        vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue({
            id: "student-1",
            role: "student",
            name: "Budi",
        });

        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue([
                        {
                            id: "sess-1",
                            name: "Ujian Harian MTK",
                            startTime: Date.now(),
                            status: "active",
                        },
                    ]),
                }),
                innerJoin: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue([]),
                    }),
                }),
            }),
        })) as any);

        const res = await GET();
        const json = await res.json();
        expect(json.notifications.length).toBeGreaterThanOrEqual(1);
        expect(json.notifications[0].title).toBe("Ujian Sedang Berlangsung");
        expect(json.userId).toBe("student-1");
    });
});
