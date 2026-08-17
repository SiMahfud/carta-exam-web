import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../question-banks/[id]/route";
import * as authGuardModule from "@/lib/auth-guard";
import { db } from "@/lib/db";

describe("GET /api/question-banks/[id]", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should return question bank details with true_false in statistics", async () => {
        vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
            id: "teacher-1",
            role: "teacher",
            name: "Guru",
        } as any);

        const mockBank = {
            id: "bank-123",
            name: "UJIAN INFORMATIKA",
            description: "Bank Soal Informatika",
        };

        const mockStats = {
            total: 25,
            mc: 10,
            complex_mc: 5,
            matching: 3,
            short: 2,
            essay: 2,
            true_false: 3,
            easy: 10,
            medium: 10,
            hard: 5,
        };

        let callCount = 0;
        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockImplementation(() => {
                    callCount++;
                    if (callCount === 1) {
                        // First select: questionBanks
                        return {
                            limit: vi.fn().mockResolvedValue([mockBank]),
                        };
                    }
                    // Second select: stats
                    return Promise.resolve([mockStats]);
                }),
            }),
        })) as any);

        const req = new Request("http://localhost:3000/api/question-banks/bank-123");
        const res = await GET(req, { params: { id: "bank-123" } });
        const json = await res.json();

        expect(json.id).toBe("bank-123");
        expect(json.statistics).toBeDefined();
        expect(json.statistics.total).toBe(25);
        expect(json.statistics.mc).toBe(10);
        expect(json.statistics.complex_mc).toBe(5);
        expect(json.statistics.matching).toBe(3);
        expect(json.statistics.short).toBe(2);
        expect(json.statistics.essay).toBe(2);
        expect(json.statistics.true_false).toBe(3);
    });
});
