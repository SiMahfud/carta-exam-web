import { describe, it, expect } from "vitest";
import { detectBrowser, validateBrowserRequirements } from "../browser-detection";

describe("browser-detection", () => {
    describe("detectBrowser", () => {
        it("should identify standard desktop Chrome browser", () => {
            const headers = new Headers({
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            });
            const result = detectBrowser(headers);
            expect(result.isStandardBrowser).toBe(true);
            expect(result.isSeb).toBe(false);
            expect(result.isExambro).toBe(false);
            expect(result.browserName).toBe("Standard Browser");
        });

        it("should detect Safe Exam Browser via User-Agent", () => {
            const headers = new Headers({
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) SEB/3.4.1 Chrome/108.0.5359.125 Safari/537.36",
            });
            const result = detectBrowser(headers);
            expect(result.isSeb).toBe(true);
            expect(result.isStandardBrowser).toBe(false);
            expect(result.browserName).toBe("Safe Exam Browser");
        });

        it("should detect Safe Exam Browser via custom SEB headers", () => {
            const headers = new Headers({
                "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                "x-safeexambrowser-requesthash": "abc123hash",
            });
            const result = detectBrowser(headers);
            expect(result.isSeb).toBe(true);
            expect(result.browserName).toBe("Safe Exam Browser");
        });

        it("should detect Exambro Android client via User-Agent", () => {
            const headers = new Headers({
                "user-agent": "Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 Exambro/3.0.1",
            });
            const result = detectBrowser(headers);
            expect(result.isExambro).toBe(true);
            expect(result.isStandardBrowser).toBe(false);
            expect(result.browserName).toBe("Exambro");
        });

        it("should detect Exambro via custom headers", () => {
            const headers = new Headers({
                "user-agent": "Mozilla/5.0 (Linux; Android 12)",
                "x-exambro-app": "true",
            });
            const result = detectBrowser(headers);
            expect(result.isExambro).toBe(true);
            expect(result.browserName).toBe("Exambro");
        });
    });

    describe("validateBrowserRequirements", () => {
        it("should allow any browser if no restrictions are set", () => {
            const headers = new Headers({
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
            });
            const result = validateBrowserRequirements(headers, {
                requireSeb: false,
                requireExambro: false,
            });
            expect(result).toBeNull();
        });

        it("should block standard browser when SEB is required", () => {
            const headers = new Headers({
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
            });
            const result = validateBrowserRequirements(headers, {
                requireSeb: true,
                requireExambro: false,
            });
            expect(result).toContain("Safe Exam Browser");
        });

        it("should permit SEB when SEB is required", () => {
            const headers = new Headers({
                "user-agent": "SEB/3.4.1 (Windows NT 10.0)",
            });
            const result = validateBrowserRequirements(headers, {
                requireSeb: true,
                requireExambro: false,
            });
            expect(result).toBeNull();
        });

        it("should block standard browser when Exambro is required", () => {
            const headers = new Headers({
                "user-agent": "Mozilla/5.0 (Linux; Android 13; Chrome/120)",
            });
            const result = validateBrowserRequirements(headers, {
                requireSeb: false,
                requireExambro: true,
            });
            expect(result).toContain("Exambro");
        });

        it("should permit Exambro when Exambro is required", () => {
            const headers = new Headers({
                "user-agent": "Mozilla/5.0 (Linux; Android 13) Exambro/2.1",
            });
            const result = validateBrowserRequirements(headers, {
                requireSeb: false,
                requireExambro: true,
            });
            expect(result).toBeNull();
        });
    });
});
