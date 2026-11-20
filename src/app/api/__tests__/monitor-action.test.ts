import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../exam-sessions/[id]/monitor/action/route";
import * as authGuardModule from "@/lib/auth-guard";
import * as activityLoggerModule from "@/lib/activity-logger";
import * as proctoringEventsModule from "@/lib/proctoring-events";
import { db } from "@/lib/db";

describe("POST /api/exam-sessions/[id]/monitor/action", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(activityLoggerModule.ActivityLogger.examSession, "updated").mockResolvedValue(undefined as any);
        vi.spyOn(proctoringEventsModule, "publishProctorActionEvent").mockReturnValue();
        vi.spyOn(proctoringEventsModule, "publishViolationEvent").mockReturnValue();
    });

    it("should lock student session with custom reason when action is lock_session", async () => {
        vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
            id: "teacher-1",
            role: "teacher",
            name: "Guru Pengawas",
        } as any);

        const mockSession = [{ id: "session-123" }];
        const mockSubmission = [{
            id: "sub-1",
            sessionId: "session-123",
            userId: "student-1",
            status: "in_progress",
            violationCount: 0,
            violationLog: [],
        }];

        const updateSetSpy = vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({}),
        });

        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockImplementation((table: any) => ({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockImplementation(() => {
                        return Promise.resolve(mockSession);
                    }),
                }),
            })),
        })) as any);

        // More specific mock for subsequent selects
        let selectCallCount = 0;
        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockImplementation(() => ({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockImplementation(() => {
                        selectCallCount++;
                        if (selectCallCount === 1) return Promise.resolve(mockSession);
                        return Promise.resolve(mockSubmission);
                    }),
                }),
            })),
        })) as any);

        vi.spyOn(db, "update").mockImplementation((() => ({
            set: updateSetSpy,
        })) as any);

        const req = new Request("http://localhost:3000/api/exam-sessions/session-123/monitor/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                studentId: "student-1",
                action: "lock_session",
                reason: "Terdeteksi membawa HP kedua untuk browsing",
            }),
        });

        const res = await POST(req as any, { params: { id: "session-123" } });
        expect(res.status).toBe(200);

        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.message).toBe("Ujian siswa berhasil dikunci sementara.");

        expect(updateSetSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "terminated",
                violationCount: 1,
                violationLog: expect.arrayContaining([
                    expect.objectContaining({
                        type: "PROCTOR_LOCK",
                        details: "Terdeteksi membawa HP kedua untuk browsing",
                    }),
                ]),
            })
        );
    });

    it("should unlock student session when action is unlock_session", async () => {
        vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
            id: "teacher-1",
            role: "teacher",
            name: "Guru Pengawas",
        } as any);

        const mockSession = [{ id: "session-123" }];
        const mockSubmission = [{
            id: "sub-1",
            sessionId: "session-123",
            userId: "student-1",
            status: "terminated",
            violationCount: 2,
        }];

        const updateSetSpy = vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({}),
        });

        let selectCallCount = 0;
        vi.spyOn(db, "select").mockImplementation((() => ({
            from: vi.fn().mockImplementation(() => ({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockImplementation(() => {
                        selectCallCount++;
                        if (selectCallCount === 1) return Promise.resolve(mockSession);
                        return Promise.resolve(mockSubmission);
                    }),
                }),
            })),
        })) as any);

        vi.spyOn(db, "update").mockImplementation((() => ({
            set: updateSetSpy,
        })) as any);

        const req = new Request("http://localhost:3000/api/exam-sessions/session-123/monitor/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                studentId: "student-1",
                action: "unlock_session",
            }),
        });

        const res = await POST(req as any, { params: { id: "session-123" } });
        expect(res.status).toBe(200);

        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.message).toBe("Sesi ujian siswa berhasil dibuka kembali.");

        expect(updateSetSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "in_progress",
                endTime: null,
            })
        );
    });
});
