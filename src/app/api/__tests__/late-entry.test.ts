import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as startPOST } from "../student/exams/[sessionId]/start/route";
import { POST as actionPOST } from "../exam-sessions/[id]/monitor/action/route";
import * as authGuardModule from "@/lib/auth-guard";
import * as activityLoggerModule from "@/lib/activity-logger";
import * as proctoringEventsModule from "@/lib/proctoring-events";
import { db } from "@/lib/db";

describe("Late Entry Auto-Block and Proctor Lock/Unlock", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(activityLoggerModule.ActivityLogger.examSession, "updated").mockResolvedValue(undefined as any);
        vi.spyOn(proctoringEventsModule, "publishStudentStartEvent").mockReturnValue();
        vi.spyOn(proctoringEventsModule, "publishViolationEvent").mockReturnValue();
        vi.spyOn(proctoringEventsModule, "publishProctorActionEvent").mockReturnValue();
    });

    it("should block and terminate student who starts exam after lateToleranceMinutes", async () => {
        vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
            id: "student-1",
            role: "student",
            name: "Siswa Terlambat",
        } as any);

        const now = new Date();
        // Session started 15 minutes ago, tolerance is 10 minutes
        const startTime = new Date(now.getTime() - 15 * 60 * 1000);
        const endTime = new Date(now.getTime() + 60 * 60 * 1000);

        const mockSession = [{
            templateId: "tmpl-1",
            startTime,
            endTime,
            status: "active",
            accessToken: null,
        }];

        const mockTemplate = [{
            id: "tmpl-1",
            violationSettings: JSON.stringify({
                lateToleranceMinutes: 10,
                mode: "strict",
            }),
            requireToken: false,
            bankIds: JSON.stringify(["bank-1"]),
            questionComposition: JSON.stringify({ mc: 1 }),
            randomizeQuestions: false,
        }];

        const mockBankQuestions = [{
            id: "q-1",
            bankId: "bank-1",
            type: "mc",
            questionNumber: 1,
            defaultPoints: 10,
        }];

        const insertSpy = vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue({}),
        });

        let selectCallCount = 0;
        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockImplementation(() => ({
                where: vi.fn().mockImplementation(() => {
                    selectCallCount++;
                    const promise = selectCallCount === 5
                        ? Promise.resolve(mockBankQuestions)
                        : Promise.resolve([]);
                    return Object.assign(promise, {
                        limit: vi.fn().mockImplementation(() => {
                            if (selectCallCount === 1) return Promise.resolve([]); // no existing submission
                            if (selectCallCount === 2) return Promise.resolve(mockSession);
                            if (selectCallCount === 3) return Promise.resolve(mockTemplate);
                            if (selectCallCount === 4) return Promise.resolve([]); // student clearances
                            return Promise.resolve(mockBankQuestions);
                        }),
                    });
                }),
            })),
        })) as any);

        vi.spyOn(db, "insert").mockImplementation((() => ({
            values: insertSpy,
        })) as any);

        const req = new Request("http://localhost:3000/api/student/exams/session-1/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId: "student-1" }),
        });

        const res = await startPOST(req as any, { params: { sessionId: "session-1" } });
        expect(res.status).toBe(403);

        const json = await res.json();
        expect(json.error).toBe("LATE_ENTRY");
        expect(json.terminated).toBe(true);
        expect(json.lateBlocked).toBe(true);
        expect(json.message).toContain("10 menit");

        // Verify it inserted a terminated submission with LATE_ENTRY
        expect(insertSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "student-1",
                sessionId: "session-1",
                status: "terminated",
                violationCount: 1,
                violationLog: expect.arrayContaining([
                    expect.objectContaining({
                        type: "LATE_ENTRY",
                    }),
                ]),
            })
        );
    });

    it("should allow teacher to lock student who has not started yet (action: lock_session)", async () => {
        vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
            id: "teacher-1",
            role: "teacher",
            name: "Guru",
        } as any);

        const mockSession = [{ id: "session-1" }];
        const insertSpy = vi.fn().mockResolvedValue({});

        let selectCallCount = 0;
        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockImplementation(() => ({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockImplementation(() => {
                        selectCallCount++;
                        if (selectCallCount === 1) return Promise.resolve(mockSession);
                        return Promise.resolve([]); // no submission found (student hasn't started)
                    }),
                }),
            })),
        })) as any);

        vi.spyOn(db, "insert").mockImplementation((() => ({
            values: insertSpy,
        })) as any);

        const req = new Request("http://localhost:3000/api/exam-sessions/session-1/monitor/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                studentId: "student-2",
                action: "lock_session",
                reason: "Membuka browser sebelum memulai ujian",
            }),
        });

        const res = await actionPOST(req as any, { params: { id: "session-1" } });
        expect(res.status).toBe(200);

        const json = await res.json();
        expect(json.success).toBe(true);

        expect(insertSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "student-2",
                sessionId: "session-1",
                status: "terminated",
                violationCount: 1,
                violationLog: expect.arrayContaining([
                    expect.objectContaining({
                        type: "PROCTOR_LOCK",
                        details: "Membuka browser sebelum memulai ujian",
                    }),
                ]),
            })
        );
    });
});
