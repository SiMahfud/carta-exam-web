import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getTokenGET } from "../exam-sessions/[id]/token/route";
import { POST as startPOST } from "../student/exams/[sessionId]/start/route";
import * as authGuardModule from "@/lib/auth-guard";
import * as proctoringEventsModule from "@/lib/proctoring-events";
import { db } from "@/lib/db";

describe("Exam Token & Administrative Clearance Flow", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(proctoringEventsModule, "publishStudentStartEvent").mockReturnValue();
        vi.spyOn(proctoringEventsModule, "publishViolationEvent").mockReturnValue();
    });

    describe("GET /api/exam-sessions/[id]/token", () => {
        it("rejects unauthorized or student access", async () => {
            const authErr = Object.assign(new Error("Forbidden"), { status: 403 });
            vi.spyOn(authGuardModule, "requireAuth").mockRejectedValue(authErr);

            const req = new Request("http://localhost:3000/api/exam-sessions/sess-1/token");
            const res = await getTokenGET(req, { params: { id: "sess-1" } });

            expect(res.status).toBe(403);
        });

        it("rejects teacher who does not own the session", async () => {
            vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
                id: "teacher-other",
                role: "teacher",
                name: "Guru Lain",
            } as any);

            vi.spyOn(db, "select").mockImplementation((() => ({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([
                            { accessToken: "ABC123", templateId: "tmpl-1", createdBy: "teacher-owner" },
                        ]),
                    }),
                }),
            })) as any);

            const req = new Request("http://localhost:3000/api/exam-sessions/sess-1/token");
            const res = await getTokenGET(req, { params: { id: "sess-1" } });

            expect(res.status).toBe(403);
        });

        it("returns token for admin or owning teacher", async () => {
            vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
                id: "teacher-owner",
                role: "teacher",
                name: "Guru Pembuat",
            } as any);

            let callCount = 0;
            vi.spyOn(db, "select").mockImplementation((() => ({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockImplementation(() => {
                            callCount++;
                            if (callCount === 1) {
                                return Promise.resolve([
                                    { accessToken: "ABC123", templateId: "tmpl-1", createdBy: "teacher-owner" },
                                ]);
                            }
                            return Promise.resolve([{ requireToken: true }]);
                        }),
                    }),
                }),
            })) as any);

            const req = new Request("http://localhost:3000/api/exam-sessions/sess-1/token");
            const res = await getTokenGET(req, { params: { id: "sess-1" } });

            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.accessToken).toBe("ABC123");
            expect(json.requireToken).toBe(true);
        });
    });

    describe("POST /api/student/exams/[sessionId]/start with requireToken and adminToken", () => {
        const makeActiveSession = (accessToken: string | null = "EXAM99") => {
            const now = new Date();
            return [{
                templateId: "tmpl-1",
                startTime: new Date(now.getTime() - 2 * 60 * 1000),
                endTime: new Date(now.getTime() + 60 * 60 * 1000),
                status: "active",
                accessToken,
            }];
        };

        const makeTemplate = (requireToken = true) => [{
            id: "tmpl-1",
            violationSettings: JSON.stringify({ lateToleranceMinutes: 10, mode: "strict" }),
            requireToken,
            bankIds: JSON.stringify(["bank-1"]),
            questionComposition: JSON.stringify({ mc: 1 }),
            randomizeQuestions: false,
        }];

        it("returns clear error when requireToken is true but accessToken has not been generated", async () => {
            vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
                id: "student-1",
                role: "student",
                name: "Siswa 1",
            } as any);

            let selectCallCount = 0;
            vi.spyOn(db, "select").mockImplementation((() => ({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockImplementation(() => {
                            selectCallCount++;
                            if (selectCallCount === 1) return Promise.resolve([]); // no submission
                            if (selectCallCount === 2) return Promise.resolve(makeActiveSession(null));
                            if (selectCallCount === 3) return Promise.resolve(makeTemplate(true));
                            return Promise.resolve([]); // no clearance block
                        }),
                    }),
                }),
            })) as any);

            const req = new Request("http://localhost:3000/api/student/exams/sess-1/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId: "student-1", token: "ANY123" }),
            });

            const res = await startPOST(req, { params: { sessionId: "sess-1" } });
            expect(res.status).toBe(403);
            const json = await res.json();
            expect(json.requireToken).toBe(true);
            expect(json.error).toContain("belum dibuat");
        });

        it("does not consume session-scoped adminToken until exam token also passes", async () => {
            vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
                id: "student-1",
                role: "student",
                name: "Siswa Terkunci",
            } as any);

            const lockedClearance = [{
                id: "clr-1",
                studentId: "student-1",
                status: "locked",
                notes: "Belum lunas administrasi",
                validUntil: null,
            }];

            const validAdminToken = [{
                id: "adm-tok-1",
                token: "ADM777",
                scope: "session",
                studentId: "student-1",
                expiresAt: new Date(Date.now() + 3600_000),
                isUsed: false,
            }];

            const mockBankQuestions = [{
                id: "q-1",
                bankId: "bank-1",
                type: "mc",
                questionNumber: 1,
                defaultPoints: 10,
            }];

            const updateSetSpy = vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue({}),
            });
            vi.spyOn(db, "update").mockImplementation((() => ({
                set: updateSetSpy,
            })) as any);

            const insertSpy = vi.fn().mockReturnValue({
                values: vi.fn().mockResolvedValue({}),
            });
            vi.spyOn(db, "insert").mockImplementation((() => ({
                values: insertSpy,
            })) as any);

            // Step 1: student submits adminToken without exam token
            let selectCallCount = 0;
            vi.spyOn(db, "select").mockImplementation((() => ({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockImplementation(() => {
                        selectCallCount++;
                        const promise = selectCallCount === 6
                            ? Promise.resolve(mockBankQuestions)
                            : Promise.resolve([]);
                        return Object.assign(promise, {
                            limit: vi.fn().mockImplementation(() => {
                                if (selectCallCount === 1) return Promise.resolve([]); // no submission
                                if (selectCallCount === 2) return Promise.resolve(makeActiveSession("EXAM99"));
                                if (selectCallCount === 3) return Promise.resolve(makeTemplate(true));
                                if (selectCallCount === 4) return Promise.resolve(lockedClearance);
                                if (selectCallCount === 5) return Promise.resolve(validAdminToken);
                                return Promise.resolve(mockBankQuestions);
                            }),
                        });
                    }),
                }),
            })) as any);

            const req1 = new Request("http://localhost:3000/api/student/exams/sess-1/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId: "student-1", adminToken: "adm777" }),
            });

            const res1 = await startPOST(req1, { params: { sessionId: "sess-1" } });
            expect(res1.status).toBe(403);
            const json1 = await res1.json();
            expect(json1.requireToken).toBe(true);
            // Critical check: admin token must NOT be consumed yet!
            expect(updateSetSpy).not.toHaveBeenCalled();

            // Step 2: student submits both exam token (lowercase with whitespace) and pending adminToken
            selectCallCount = 0;
            const req2 = new Request("http://localhost:3000/api/student/exams/sess-1/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId: "student-1",
                    token: " exam99 ",
                    adminToken: "ADM777",
                }),
            });

            const res2 = await startPOST(req2, { params: { sessionId: "sess-1" } });
            expect(res2.status).toBe(201);
            expect(insertSpy).toHaveBeenCalled();
            // Now admin token is marked used and clearance stays locked for session scope
            expect(updateSetSpy).toHaveBeenCalledWith(expect.objectContaining({ isUsed: true }));
            expect(updateSetSpy).toHaveBeenCalledWith(expect.objectContaining({ status: "locked" }));
        });
    });
});
