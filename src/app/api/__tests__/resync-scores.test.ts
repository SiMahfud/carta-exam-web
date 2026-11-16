import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../exam-sessions/[id]/resync-scores/route";
import * as authGuardModule from "@/lib/auth-guard";
import * as activityLoggerModule from "@/lib/activity-logger";
import { db } from "@/lib/db";

describe("POST /api/exam-sessions/[id]/resync-scores", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(activityLoggerModule, "logActivity").mockResolvedValue();
    });

    it("should return 404 if session not found", async () => {
        vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
            id: "admin-1",
            role: "admin",
            name: "Admin",
        } as any);

        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([]),
                }),
            }),
        })) as any);

        const req = new Request("http://localhost:3000/api/exam-sessions/session-1/resync-scores", {
            method: "POST",
        });
        const res = await POST(req, { params: { id: "session-1" } });
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.error).toBe("Sesi ujian tidak ditemukan");
    });

    it("should recalculate submission score correctly when short answer points change to 0", async () => {
        vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
            id: "teacher-1",
            role: "teacher",
            name: "Guru",
        } as any);

        const mockSession = {
            id: "session-1",
            sessionName: "Ulangan Harian",
            status: "active",
            createdBy: "teacher-1",
        };

        const mockSubmissions = [
            {
                id: "sub-1",
                userId: "student-1",
                status: "completed",
                questionOrder: JSON.stringify(["q-mc-1", "q-short-1"]),
                gradingStatus: "completed",
            },
        ];

        const mockAnswers = [
            {
                id: "ans-1",
                submissionId: "sub-1",
                bankQuestionId: "q-mc-1",
                questionId: null,
                studentAnswer: "A",
                isCorrect: true,
                score: 1,
                partialPoints: 1,
                maxPoints: 1,
                gradingStatus: "auto",
            },
            {
                id: "ans-2",
                submissionId: "sub-1",
                bankQuestionId: "q-short-1",
                questionId: null,
                studentAnswer: "Jawaban",
                isCorrect: true,
                score: 2,
                partialPoints: 2,
                maxPoints: 2,
                gradingStatus: "auto",
            },
        ];

        // In bank questions, q-short-1 now has defaultPoints: 0
        const mockBankQuestions = [
            {
                id: "q-mc-1",
                type: "mc",
                content: JSON.stringify({ question: "MC Question" }),
                answerKey: JSON.stringify({ correct: 0 }),
                defaultPoints: 1,
            },
            {
                id: "q-short-1",
                type: "short",
                content: JSON.stringify({ question: "Short Question" }),
                answerKey: JSON.stringify({ acceptedAnswers: ["jawaban"] }),
                defaultPoints: 0, // Changed to 0!
            },
        ];

        let selectCall = 0;
        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockImplementation(() => {
                    selectCall++;
                    if (selectCall === 1) {
                        // Session query
                        return {
                            limit: vi.fn().mockResolvedValue([mockSession]),
                        };
                    }
                    if (selectCall === 2) {
                        // Submissions query
                        return Promise.resolve(mockSubmissions);
                    }
                    if (selectCall === 3) {
                        // Answers query
                        return Promise.resolve(mockAnswers);
                    }
                    if (selectCall === 4) {
                        // Bank questions query
                        return Promise.resolve(mockBankQuestions);
                    }
                    return Promise.resolve([]);
                }),
            }),
        })) as any);

        const updateSetCalls: any[] = [];
        vi.spyOn(db, "update").mockImplementation((() => ({
            set: vi.fn().mockImplementation((val) => {
                updateSetCalls.push(val);
                return {
                    where: vi.fn().mockResolvedValue({}),
                };
            }),
        })) as any);

        const req = new Request("http://localhost:3000/api/exam-sessions/session-1/resync-scores", {
            method: "POST",
        });
        const res = await POST(req, { params: { id: "session-1" } });
        expect(res.status).toBe(200);

        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.updatedSubmissions).toBe(1);

        // Verify that answers and submission were updated with new points
        // Total max points is now 1 (q-mc-1: 1, q-short-1: 0)
        // Earned points is 1 (q-mc-1: 1, q-short-1: 0)
        // Final score: (1/1) * 100 = 100
        const submissionUpdate = updateSetCalls.find((c) => c.totalPoints !== undefined);
        expect(submissionUpdate).toBeDefined();
        expect(submissionUpdate.totalPoints).toBe(1);
        expect(submissionUpdate.earnedPoints).toBe(1);
        expect(submissionUpdate.score).toBe(100);
    });
});
