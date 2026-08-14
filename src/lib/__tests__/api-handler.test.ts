import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiHandler, ApiError } from "@/lib/api-handler";

describe("apiHandler", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("should wrap handler result in { data } envelope", async () => {
        const response = await apiHandler(async () => {
            return { id: "1", name: "Test" };
        });

        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json).toEqual({ data: { id: "1", name: "Test" } });
    });

    it("should preserve { data, metadata } structure when returned by handler", async () => {
        const response = await apiHandler(async () => {
            return {
                data: [{ id: "1" }],
                metadata: { total: 1, page: 1 },
            };
        });

        const json = await response.json();
        expect(json.data).toEqual([{ id: "1" }]);
        expect(json.metadata).toEqual({ total: 1, page: 1 });
    });

    it("should handle ApiError with custom status", async () => {
        const response = await apiHandler(async () => {
            throw new ApiError("Not found", 404);
        });

        const json = await response.json();
        expect(response.status).toBe(404);
        expect(json.error).toBe("Not found");
    });

    it("should handle ApiError with default 500 status", async () => {
        const response = await apiHandler(async () => {
            throw new ApiError("Server error");
        });

        const json = await response.json();
        expect(response.status).toBe(500);
        expect(json.error).toBe("Server error");
    });

    it("should handle generic errors with 500 status", async () => {
        const response = await apiHandler(async () => {
            throw new Error("Something went wrong");
        });

        const json = await response.json();
        expect(response.status).toBe(500);
        expect(json.error).toBe("Something went wrong");
    });

    it("should handle array data correctly", async () => {
        const response = await apiHandler(async () => {
            return [
                { id: "1", name: "A" },
                { id: "2", name: "B" },
            ];
        });

        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json.data).toHaveLength(2);
    });

    it("should handle null/undefined return", async () => {
        const response = await apiHandler(async () => {
            return null;
        });

        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json.data).toBeNull();
    });
});

describe("ApiError", () => {
    it("should be an instance of Error", () => {
        const error = new ApiError("test", 400);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("test");
        expect(error.status).toBe(400);
    });

    it("should default to status 500", () => {
        const error = new ApiError("internal error");
        expect(error.status).toBe(500);
    });
});
