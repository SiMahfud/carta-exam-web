import { describe, it, expect } from "vitest";
import { validateDeviceId } from "../device";

describe("device helper", () => {
    describe("validateDeviceId", () => {
        it("should permit when no deviceId was stored yet (first connection)", () => {
            const result = validateDeviceId(null, "dev-uuid-123");
            expect(result.valid).toBe(true);
        });

        it("should permit when stored deviceId matches current deviceId", () => {
            const result = validateDeviceId("dev-uuid-123", "dev-uuid-123");
            expect(result.valid).toBe(true);
        });

        it("should block when current deviceId differs from stored deviceId", () => {
            const result = validateDeviceId("dev-uuid-laptop", "dev-uuid-phone");
            expect(result.valid).toBe(false);
            expect(result.reason).toContain("perangkat lain");
        });

        it("should block when no current deviceId is provided but submission has stored deviceId", () => {
            const result = validateDeviceId("dev-uuid-laptop", null);
            expect(result.valid).toBe(false);
            expect(result.reason).toContain("Device ID tidak ditemukan");
        });
    });
});
