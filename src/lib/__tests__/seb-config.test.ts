import { describe, it, expect } from "vitest";
import {
    buildSebDictionary,
    buildSebLaunchUrls,
    buildUrlFilterRules,
    computeSebConfigKey,
    generateSebPlistXml,
    getDefaultSebConfig,
    hashSebQuitPassword,
} from "../seb-config";

describe("seb-config", () => {
    it("should default to standalone config when PORTOCARTA_URL is unset", () => {
        const prevPorto = process.env.PORTOCARTA_URL;
        const prevNextPorto = process.env.NEXT_PUBLIC_PORTOCARTA_URL;
        delete process.env.PORTOCARTA_URL;
        delete process.env.NEXT_PUBLIC_PORTOCARTA_URL;

        try {
            const config = getDefaultSebConfig("https://exam.example.edu");
            expect(config.examUrl).toBe("https://exam.example.edu");
            expect(config.portoCartaUrl).toBe("");
            expect(config.startPath).toBe("/login");
            expect(config.allowSsoPortoCarta).toBe(false);
            expect(config.enableUrlFilter).toBe(true);
        } finally {
            if (prevPorto !== undefined) process.env.PORTOCARTA_URL = prevPorto;
            if (prevNextPorto !== undefined) process.env.NEXT_PUBLIC_PORTOCARTA_URL = prevNextPorto;
        }
    });

    it("should generate default config with CartaExam and PortoCarta URLs when configured", () => {
        const config = {
            ...getDefaultSebConfig("https://exam.sman1campurdarat.sch.id"),
            portoCartaUrl: "https://porto.sman1campurdarat.sch.id",
            allowSsoPortoCarta: true,
        };
        expect(config.examUrl).toBe("https://exam.sman1campurdarat.sch.id");
        expect(config.portoCartaUrl).toBe("https://porto.sman1campurdarat.sch.id");
        expect(config.startPath).toBe("/login");
        expect(config.allowSsoPortoCarta).toBe(true);
        expect(config.enableUrlFilter).toBe(true);
    });

    it("should include both exam and porto domains in URLFilterRules when Option A SSO is enabled", () => {
        const config = {
            ...getDefaultSebConfig("https://exam.sman1campurdarat.sch.id"),
            portoCartaUrl: "https://porto.sman1campurdarat.sch.id",
            allowSsoPortoCarta: true,
        };
        const rules = buildUrlFilterRules(config);
        const expressions = rules.map((r) => r.expression);

        expect(expressions).toContain("exam.sman1campurdarat.sch.id/*");
        expect(expressions).toContain("porto.sman1campurdarat.sch.id/*");
    });

    it("should restrict PortoCarta rules to SSO paths when portoAllowedMode is sso_only", () => {
        const config = {
            ...getDefaultSebConfig("https://exam.sman1campurdarat.sch.id"),
            portoCartaUrl: "https://porto.sman1campurdarat.sch.id",
            allowSsoPortoCarta: true,
            portoAllowedMode: "sso_only" as const,
        };
        const rules = buildUrlFilterRules(config);
        const expressions = rules.map((r) => r.expression);

        expect(expressions).toContain("porto.sman1campurdarat.sch.id/apps/launch/carta-exam*");
        expect(expressions).toContain("porto.sman1campurdarat.sch.id/login*");
        expect(expressions).not.toContain("porto.sman1campurdarat.sch.id/*");
    });

    it("should omit PortoCarta rules when allowSsoPortoCarta is disabled", () => {
        const config = {
            ...getDefaultSebConfig("https://exam.sman1campurdarat.sch.id"),
            allowSsoPortoCarta: false,
        };
        const rules = buildUrlFilterRules(config);
        const expressions = rules.map((r) => r.expression);

        expect(expressions).toContain("exam.sman1campurdarat.sch.id/*");
        expect(expressions.some((e) => e.includes("porto.sman1campurdarat.sch.id"))).toBe(false);
    });

    it("should hash quit password as uppercase SHA-256 hex", () => {
        const hash = hashSebQuitPassword("secret");
        expect(hash).toBe("2BB80D537B1DA3E38BD30361AA855686BDE0EACD7162FEF6A25FE97BF527A25B");
    });

    it("should generate valid Apple XML plist containing startURL, URLFilterRules, and XML-escaped strings", () => {
        const config = {
            ...getDefaultSebConfig("https://exam.sman1campurdarat.sch.id"),
            hashedQuitPassword: hashSebQuitPassword("keluar123"),
        };
        const xml = generateSebPlistXml(config);

        expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xml).toContain("<plist version=\"1.0\">");
        expect(xml).toContain("<key>startURL</key>");
        expect(xml).toContain("<string>https://exam.sman1campurdarat.sch.id/login</string>");
        expect(xml).toContain("<key>hashedQuitPassword</key>");
        expect(xml).toContain("<key>URLFilterEnable</key>");
        expect(xml).toContain("<true/>");
        expect(xml).toContain("<key>allowDisplayMirroring</key>");
        expect(xml).toContain("<false/>");
        expect(xml).toContain("<key>sendBrowserExamKey</key>");
    });

    it("should compute deterministic 64-char lowercase ConfigKey hash", () => {
        const config = getDefaultSebConfig("https://exam.sman1campurdarat.sch.id");
        const key1 = computeSebConfigKey(config);
        const key2 = computeSebConfigKey({ ...config });

        expect(key1).toMatch(/^[a-f0-9]{64}$/);
        expect(key1).toBe(key2);

        const changed = computeSebConfigKey({ ...config, allowQuit: false });
        expect(changed).not.toBe(key1);
    });

    it("should build sebs:// URL for https and seb:// URL for http", () => {
        const httpsUrls = buildSebLaunchUrls("https://exam.sman1campurdarat.sch.id/");
        expect(httpsUrls.sebUrl).toBe("sebs://exam.sman1campurdarat.sch.id/api/seb/config");
        expect(httpsUrls.downloadUrl).toBe("https://exam.sman1campurdarat.sch.id/api/seb/config");

        const httpUrls = buildSebLaunchUrls("http://192.168.1.10:3333");
        expect(httpUrls.sebUrl).toBe("seb://192.168.1.10:3333/api/seb/config");
    });

    it("should set popup policy to 2 when allowPopupsForSso is true", () => {
        const config = getDefaultSebConfig("https://exam.sman1campurdarat.sch.id");
        const dict = buildSebDictionary(config);
        expect(dict.newBrowserWindowByLinkPolicy).toBe(2);
        expect(dict.newBrowserWindowByScriptPolicy).toBe(2);
    });

    it("should default quitURL and exambroExitPinHash without leaking exambroExitPinHash into SEB plist or ConfigKey", () => {
        const config = getDefaultSebConfig("https://exam.sman1campurdarat.sch.id");
        expect(config.quitURL).toBe("https://exam.sman1campurdarat.sch.id/seb-quit");
        expect(config.exambroExitPinHash).toBe(hashSebQuitPassword("CARTA2026"));

        const dict = buildSebDictionary(config);
        expect(dict.quitURL).toBe("https://exam.sman1campurdarat.sch.id/seb-quit");
        expect(dict).not.toHaveProperty("exambroExitPinHash");

        const xml = generateSebPlistXml(config);
        expect(xml).toContain("<key>quitURL</key>");
        expect(xml).not.toContain("exambroExitPinHash");

        const keyDefault = computeSebConfigKey(config);
        const keyCustomPin = computeSebConfigKey({
            ...config,
            exambroExitPinHash: hashSebQuitPassword("PENGAWAS99"),
        });
        expect(keyCustomPin).toBe(keyDefault);
    });
});
