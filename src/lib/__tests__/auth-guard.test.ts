import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth, requireStudent } from "@/lib/auth-guard";
import * as sessionModule from "@/lib/session";

describe("requireAuth", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should throw 401 when user is not authenticated", async () => {
        vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(null);

        await expect(requireAuth()).rejects.toMatchObject({
            message: expect.stringContaining("Autentikasi diperlukan"),
            status: 401,
        });
    });

    it("should return user when no roles are specified", async () => {
        const mockUser = { id: "u-1", role: "admin" as const, name: "Admin" };
        vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(mockUser);

        const result = await requireAuth();
        expect(result).toEqual(mockUser);
    });

    it("should return user when role matches allowed roles", async () => {
        const mockUser = { id: "u-1", role: "teacher" as const, name: "Teacher" };
        vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(mockUser);

        const result = await requireAuth(["admin", "teacher"]);
        expect(result).toEqual(mockUser);
    });

    it("should throw 403 when role does not match allowed roles", async () => {
        const mockUser = { id: "u-1", role: "student" as const, name: "Student" };
        vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(mockUser);

        await expect(requireAuth(["admin"])).rejects.toMatchObject({
            message: expect.stringContaining("Akses ditolak"),
            status: 403,
        });
    });

    it("should pass with empty allowed roles array", async () => {
        const mockUser = { id: "u-1", role: "student" as const, name: "Student" };
        vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(mockUser);

        const result = await requireAuth([]);
        expect(result).toEqual(mockUser);
    });
});

describe("requireStudent", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should allow student role", async () => {
        const mockUser = { id: "u-1", role: "student" as const, name: "Student" };
        vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(mockUser);

        const result = await requireStudent();
        expect(result).toEqual(mockUser);
    });

    it("should allow admin role", async () => {
        const mockUser = { id: "u-1", role: "admin" as const, name: "Admin" };
        vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(mockUser);

        const result = await requireStudent();
        expect(result).toEqual(mockUser);
    });

    it("should allow teacher role", async () => {
        const mockUser = { id: "u-1", role: "teacher" as const, name: "Teacher" };
        vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(mockUser);

        const result = await requireStudent();
        expect(result).toEqual(mockUser);
    });

    it("should reject unauthenticated user", async () => {
        vi.spyOn(sessionModule, "getCurrentUser").mockResolvedValue(null);

        await expect(requireStudent()).rejects.toMatchObject({
            status: 401,
        });
    });
});
