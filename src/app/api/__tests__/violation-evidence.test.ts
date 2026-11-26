import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import * as authGuard from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { POST } from "../student/exams/[sessionId]/violation-evidence/route";

describe("POST /api/student/exams/[sessionId]/violation-evidence", () => {
    const testSessionId = "test-evidence-session";

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterAll(() => {
        const testDir = path.join(process.cwd(), "public", "uploads", "violations", testSessionId);
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it("should reject unauthenticated requests", async () => {
        vi.spyOn(authGuard, "requireAuth").mockRejectedValue({
            message: "Unauthorized",
            status: 401,
        });

        const req = new NextRequest(`http://localhost:3000/api/student/exams/${testSessionId}/violation-evidence`, {
            method: "POST",
        });

        const res = await POST(req, { params: Promise.resolve({ sessionId: testSessionId }) });
        expect(res.status).toBe(401);
    });

    it("should reject non-image files", async () => {
        vi.spyOn(authGuard, "requireAuth").mockResolvedValue({
            id: "student-1",
            role: "student",
            name: "Siswa Test",
        } as never);

        const formData = new FormData();
        formData.append("file", new File(["hello"], "note.txt", { type: "text/plain" }));

        const req = new NextRequest(`http://localhost:3000/api/student/exams/${testSessionId}/violation-evidence`, {
            method: "POST",
            body: formData,
        });

        const res = await POST(req, { params: Promise.resolve({ sessionId: testSessionId }) });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain("JPG, PNG, atau WebP");
    });

    it("should reject upload when submission is not in_progress", async () => {
        vi.spyOn(authGuard, "requireAuth").mockResolvedValue({
            id: "student-1",
            role: "student",
            name: "Siswa Test",
        } as never);

        vi.spyOn(db, "select").mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([{ id: "sub-1", status: "completed" }]),
                }),
            }),
        } as never);

        const formData = new FormData();
        formData.append("file", new File([new Uint8Array([0xff, 0xd8, 0xff])], "evidence.jpg", { type: "image/jpeg" }));

        const req = new NextRequest(`http://localhost:3000/api/student/exams/${testSessionId}/violation-evidence`, {
            method: "POST",
            body: formData,
        });

        const res = await POST(req, { params: Promise.resolve({ sessionId: testSessionId }) });
        expect(res.status).toBe(409);
    });

    it("should save jpeg evidence and return evidenceUrl for active submission", async () => {
        vi.spyOn(authGuard, "requireAuth").mockResolvedValue({
            id: "student-1",
            role: "student",
            name: "Siswa Test",
        } as never);

        vi.spyOn(db, "select").mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([{ id: "sub-1", status: "in_progress" }]),
                }),
            }),
        } as never);

        const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
        const formData = new FormData();
        formData.append("file", new File([jpegBytes], "evidence.jpg", { type: "image/jpeg" }));

        const req = new NextRequest(`http://localhost:3000/api/student/exams/${testSessionId}/violation-evidence`, {
            method: "POST",
            body: formData,
        });

        const res = await POST(req, { params: Promise.resolve({ sessionId: testSessionId }) });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.evidenceUrl).toMatch(new RegExp(`^/uploads/violations/${testSessionId}/.*\\.jpg$`));

        const savedPath = path.join(process.cwd(), "public", json.evidenceUrl.replace(/^\//, ""));
        expect(fs.existsSync(savedPath)).toBe(true);
    });

    it("should append follow-up evidence to matching violationId in violationLog", async () => {
        vi.spyOn(authGuard, "requireAuth").mockResolvedValue({
            id: "student-1",
            role: "student",
            name: "Siswa Test",
        } as never);

        const violationId = "viol-uuid-123";
        vi.spyOn(db, "select").mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([
                        {
                            id: "sub-1",
                            status: "in_progress",
                            violationLog: [
                                {
                                    id: violationId,
                                    type: "APP_SWITCH",
                                    timestamp: new Date().toISOString(),
                                    evidenceUrl: "/uploads/violations/first.jpg",
                                    evidenceUrls: ["/uploads/violations/first.jpg"],
                                },
                            ],
                        },
                    ]),
                }),
            }),
        } as never);

        const setMock = vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue({}),
        });
        vi.spyOn(db, "update").mockReturnValue({ set: setMock } as never);

        const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
        const formData = new FormData();
        formData.append("file", new File([jpegBytes], "followup.jpg", { type: "image/jpeg" }));
        formData.append("violationId", violationId);

        const req = new NextRequest(`http://localhost:3000/api/student/exams/${testSessionId}/violation-evidence`, {
            method: "POST",
            body: formData,
        });

        const res = await POST(req, { params: Promise.resolve({ sessionId: testSessionId }) });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.attachedToViolationId).toBe(violationId);
        expect(setMock).toHaveBeenCalledWith({
            violationLog: [
                expect.objectContaining({
                    id: violationId,
                    evidenceUrl: "/uploads/violations/first.jpg",
                    evidenceUrls: ["/uploads/violations/first.jpg", json.evidenceUrl],
                }),
            ],
        });
    });
});
