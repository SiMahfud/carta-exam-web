import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../auth/session/route";
import * as authAction from "@/actions/auth";

describe("GET /api/auth/session", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should return 401 when not authenticated", async () => {
        vi.spyOn(authAction, "getCurrentUser").mockResolvedValue(null);

        const response = await GET();
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json).toEqual({ error: "Not authenticated" });
    });

    it("should return user session with 200 when authenticated", async () => {
        const mockUser = {
            id: "u-1",
            role: "admin" as const,
            name: "Admin Test",
            username: "admin",
            createdAt: new Date(),
        };
        vi.spyOn(authAction, "getCurrentUser").mockResolvedValue(mockUser);

        const response = await GET();
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json).toEqual({
            user: {
                id: "u-1",
                name: "Admin Test",
                role: "admin",
            },
        });
    });
});
