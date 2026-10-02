import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT as putQuestionBank, DELETE as deleteQuestionBank } from "../question-banks/[id]/route";
import { PUT as putTemplate, DELETE as deleteTemplate } from "../exam-templates/[id]/route";
import { PATCH as patchSession, DELETE as deleteSession } from "../exam-sessions/[id]/route";
import * as authGuardModule from "@/lib/auth-guard";
import { db } from "@/lib/db";

describe("Teacher Isolation & Access Control", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe("Question Banks Authorization", () => {
        it("should prevent a teacher from modifying a question bank created by another teacher", async () => {
            vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
                id: "teacher-A",
                role: "teacher",
                name: "Guru A",
            } as any);

            // Mock DB: bank was created by teacher-B
            vi.spyOn(db, "select").mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{
                            id: "bank-1",
                            name: "Soal Biologi",
                            createdBy: "teacher-B",
                        }]),
                    }),
                }),
            } as any);

            const req = new Request("http://localhost:3000/api/question-banks/bank-1", {
                method: "PUT",
                body: JSON.stringify({ name: "Hacked Name" }),
            });

            const res = await putQuestionBank(req, { params: { id: "bank-1" } });
            expect(res.status).toBe(403);
            const json = await res.json();
            expect(json.error).toContain("Akses ditolak");
        });

        it("should prevent a teacher from deleting a question bank created by another teacher", async () => {
            vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
                id: "teacher-A",
                role: "teacher",
                name: "Guru A",
            } as any);

            vi.spyOn(db, "select").mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{
                            id: "bank-1",
                            name: "Soal Biologi",
                            createdBy: "teacher-B",
                        }]),
                    }),
                }),
            } as any);

            const req = new Request("http://localhost:3000/api/question-banks/bank-1", {
                method: "DELETE",
            });

            const res = await deleteQuestionBank(req, { params: { id: "bank-1" } });
            expect(res.status).toBe(403);
            const json = await res.json();
            expect(json.error).toContain("Akses ditolak");
        });
    });

    describe("Exam Templates Authorization", () => {
        it("should prevent a teacher from updating an official admin template or another teacher's template", async () => {
            vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
                id: "teacher-A",
                role: "teacher",
                name: "Guru A",
            } as any);

            vi.spyOn(db, "select").mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{
                            id: "tpl-admin",
                            name: "Template Standar UTS",
                            createdBy: "admin-1",
                        }]),
                    }),
                }),
            } as any);

            const req = new Request("http://localhost:3000/api/exam-templates/tpl-admin", {
                method: "PUT",
                body: JSON.stringify({ name: "Modified Template" }),
            });

            const res = await putTemplate(req, { params: { id: "tpl-admin" } });
            expect(res.status).toBe(403);
            const json = await res.json();
            expect(json.error).toContain("Akses ditolak");
        });

        it("should prevent a teacher from deleting an admin template", async () => {
            vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
                id: "teacher-A",
                role: "teacher",
                name: "Guru A",
            } as any);

            vi.spyOn(db, "select").mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{
                            id: "tpl-admin",
                            name: "Template Standar UTS",
                            createdBy: "admin-1",
                        }]),
                    }),
                }),
            } as any);

            const req = new Request("http://localhost:3000/api/exam-templates/tpl-admin", {
                method: "DELETE",
            });

            const res = await deleteTemplate(req, { params: { id: "tpl-admin" } });
            expect(res.status).toBe(403);
            const json = await res.json();
            expect(json.error).toContain("Akses ditolak");
        });
    });

    describe("Exam Sessions Authorization", () => {
        it("should prevent a teacher from modifying a session created by another teacher", async () => {
            vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
                id: "teacher-A",
                role: "teacher",
                name: "Guru A",
            } as any);

            vi.spyOn(db, "select").mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{
                            id: "session-1",
                            sessionName: "Ulangan Harian Guru B",
                            createdBy: "teacher-B",
                        }]),
                    }),
                }),
            } as any);

            const req = new Request("http://localhost:3000/api/exam-sessions/session-1", {
                method: "PATCH",
                body: JSON.stringify({ sessionName: "Hacked Session" }),
            });

            const res = await patchSession(req, { params: { id: "session-1" } });
            expect(res.status).toBe(403);
            const json = await res.json();
            expect(json.error).toContain("Akses ditolak");
        });

        it("should prevent a teacher from deleting a session created by another teacher", async () => {
            vi.spyOn(authGuardModule, "requireAuth").mockResolvedValue({
                id: "teacher-A",
                role: "teacher",
                name: "Guru A",
            } as any);

            vi.spyOn(db, "select").mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([{
                            id: "session-1",
                            sessionName: "Ulangan Harian Guru B",
                            createdBy: "teacher-B",
                        }]),
                    }),
                }),
            } as any);

            const req = new Request("http://localhost:3000/api/exam-sessions/session-1", {
                method: "DELETE",
            });

            const res = await deleteSession(req, { params: { id: "session-1" } });
            expect(res.status).toBe(403);
            const json = await res.json();
            expect(json.error).toContain("Akses ditolak");
        });
    });
});
