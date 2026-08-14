import { describe, it, expect } from "vitest";
import { signSession, verifySession, SessionPayload } from "../session";

describe("Session Module (HMAC-SHA256 Signed Cookies)", () => {
    const mockPayload: Omit<SessionPayload, "exp"> = {
        id: "user-123",
        role: "admin",
        name: "Administrator",
    };

    it("should correctly sign and verify a valid session", async () => {
        const token = await signSession(mockPayload);
        expect(token).toBeDefined();
        expect(token.includes(".")).toBe(true);

        const verified = await verifySession(token);
        expect(verified).not.toBeNull();
        expect(verified?.id).toBe(mockPayload.id);
        expect(verified?.role).toBe(mockPayload.role);
        expect(verified?.name).toBe(mockPayload.name);
        expect(verified?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("should reject tampered session payload (e.g. privilege escalation attempt)", async () => {
        const token = await signSession({
            id: "student-456",
            role: "student",
            name: "Student User",
        });

        const [payload, signature] = token.split(".");

        // Tamper payload: change role from student to admin
        const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
        decoded.role = "admin";
        const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        const tamperedToken = `${tamperedPayload}.${signature}`;

        const verified = await verifySession(tamperedToken);
        expect(verified).toBeNull(); // Must reject tampered signature!
    });

    it("should reject tampered signature", async () => {
        const token = await signSession(mockPayload);
        const [payload, signature] = token.split(".");

        // Tamper one byte of signature
        const tamperedSig = signature.slice(0, -1) + (signature.endsWith("0") ? "1" : "0");
        const tamperedToken = `${payload}.${tamperedSig}`;

        const verified = await verifySession(tamperedToken);
        expect(verified).toBeNull();
    });

    it("should reject expired session token", async () => {
        // Sign with negative maxAge to simulate expiration
        const token = await signSession(mockPayload, -10);
        const verified = await verifySession(token);
        expect(verified).toBeNull();
    });

    it("should reject malformed or empty token", async () => {
        expect(await verifySession("")).toBeNull();
        expect(await verifySession("invalid-token-without-dot")).toBeNull();
        expect(await verifySession(null)).toBeNull();
        expect(await verifySession(undefined)).toBeNull();
        expect(await verifySession("a.b.c")).toBeNull();
    });
});
