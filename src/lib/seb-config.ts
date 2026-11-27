import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

export const DEFAULT_EXAMBRO_EXIT_PIN = "CARTA2026";

export const sebConfigSchema = z.object({
    examUrl: z.string().url("URL CartaExam harus valid (misal https://exam.sekolahanda.sch.id)"),
    portoCartaUrl: z
        .string()
        .url("URL PortoCarta harus valid (misal https://porto.sekolahanda.sch.id)")
        .or(z.literal(""))
        .default(""),
    startPath: z.string().min(1).default("/login"),
    allowSsoPortoCarta: z.boolean().default(false),
    portoAllowedMode: z.enum(["full_domain", "sso_only"]).default("full_domain"),
    allowQuit: z.boolean().default(true),
    hashedQuitPassword: z.string().default(""),
    quitURL: z.string().default(""),
    enableUrlFilter: z.boolean().default(true),
    sendBrowserExamKey: z.boolean().default(true),
    allowScreenCapture: z.boolean().default(false),
    clearCookiesOnEnd: z.boolean().default(true),
    showTaskBar: z.boolean().default(true),
    showReloadButton: z.boolean().default(true),
    allowPopupsForSso: z.boolean().default(true),
    exambroExitPinHash: z.string().default(""),
});

export type SebConfigSettings = z.infer<typeof sebConfigSchema>;

export interface SebUrlFilterRule {
    action: number;
    active: boolean;
    expression: string;
    regex: boolean;
}

const SEB_CONFIG_FILE = path.join(process.cwd(), ".seb-config.json");

function normalizeBaseUrl(url: string, fallback: string): string {
    const trimmed = (url || "").trim().replace(/\/+$/, "");
    return trimmed || fallback;
}

export function getDefaultSebConfig(originUrl?: string): SebConfigSettings {
    const defaultExamUrl = normalizeBaseUrl(
        originUrl || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "",
        "http://localhost:3333"
    );
    const defaultPortoUrl = normalizeBaseUrl(
        process.env.PORTOCARTA_URL || process.env.NEXT_PUBLIC_PORTOCARTA_URL || "",
        ""
    );

    return {
        examUrl: defaultExamUrl,
        portoCartaUrl: defaultPortoUrl,
        startPath: "/login",
        allowSsoPortoCarta: Boolean(defaultPortoUrl),
        portoAllowedMode: "full_domain",
        allowQuit: true,
        hashedQuitPassword: "",
        quitURL: `${defaultExamUrl}/seb-quit`,
        enableUrlFilter: true,
        sendBrowserExamKey: true,
        allowScreenCapture: false,
        clearCookiesOnEnd: true,
        showTaskBar: true,
        showReloadButton: true,
        allowPopupsForSso: true,
        exambroExitPinHash: hashSebQuitPassword(DEFAULT_EXAMBRO_EXIT_PIN),
    };
}

export function hashSebQuitPassword(password: string): string {
    return crypto
        .createHash("sha256")
        .update(password, "utf8")
        .digest("hex")
        .toUpperCase();
}

export async function loadSebConfig(fallbackOrigin?: string): Promise<SebConfigSettings> {
    const defaults = getDefaultSebConfig(fallbackOrigin);
    try {
        const raw = await fs.readFile(SEB_CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        const validated = sebConfigSchema.safeParse({ ...defaults, ...parsed });
        if (validated.success) {
            return {
                ...validated.data,
                examUrl: normalizeBaseUrl(validated.data.examUrl, defaults.examUrl),
                portoCartaUrl: normalizeBaseUrl(validated.data.portoCartaUrl, defaults.portoCartaUrl),
                startPath: validated.data.startPath.startsWith("/")
                    ? validated.data.startPath
                    : `/${validated.data.startPath}`,
                exambroExitPinHash: validated.data.exambroExitPinHash || defaults.exambroExitPinHash,
            };
        }
    } catch {
        // File does not exist yet or is invalid JSON; return defaults
    }
    return defaults;
}

export async function saveSebConfig(
    input: Partial<SebConfigSettings> & {
        quitPassword?: string;
        clearQuitPassword?: boolean;
        exambroExitPin?: string;
        resetExambroExitPin?: boolean;
    },
    fallbackOrigin?: string
): Promise<SebConfigSettings> {
    const current = await loadSebConfig(fallbackOrigin);

    let nextHashedQuitPassword = current.hashedQuitPassword;
    if (input.clearQuitPassword) {
        nextHashedQuitPassword = "";
    } else if (typeof input.quitPassword === "string" && input.quitPassword.trim().length > 0) {
        nextHashedQuitPassword = hashSebQuitPassword(input.quitPassword.trim());
    } else if (typeof input.hashedQuitPassword === "string") {
        nextHashedQuitPassword = input.hashedQuitPassword;
    }

    let nextExambroExitPinHash =
        current.exambroExitPinHash || hashSebQuitPassword(DEFAULT_EXAMBRO_EXIT_PIN);
    if (input.resetExambroExitPin) {
        nextExambroExitPinHash = hashSebQuitPassword(DEFAULT_EXAMBRO_EXIT_PIN);
    } else if (typeof input.exambroExitPin === "string" && input.exambroExitPin.trim().length > 0) {
        nextExambroExitPinHash = hashSebQuitPassword(input.exambroExitPin.trim());
    } else if (typeof input.exambroExitPinHash === "string" && input.exambroExitPinHash.trim().length > 0) {
        nextExambroExitPinHash = input.exambroExitPinHash.trim();
    }

    const merged = sebConfigSchema.parse({
        ...current,
        ...input,
        hashedQuitPassword: nextHashedQuitPassword,
        exambroExitPinHash: nextExambroExitPinHash,
        examUrl: normalizeBaseUrl(input.examUrl ?? current.examUrl, current.examUrl),
        portoCartaUrl: normalizeBaseUrl(input.portoCartaUrl ?? current.portoCartaUrl, current.portoCartaUrl),
        startPath: (input.startPath ?? current.startPath).startsWith("/")
            ? (input.startPath ?? current.startPath)
            : `/${input.startPath ?? current.startPath}`,
    });

    await fs.writeFile(SEB_CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
    return merged;
}

function extractHostPattern(rawUrl: string): string {
    try {
        const parsed = new URL(rawUrl);
        return parsed.host;
    } catch {
        return rawUrl.replace(/^https?:\/\//, "").split("/")[0];
    }
}

export function buildUrlFilterRules(settings: SebConfigSettings): SebUrlFilterRule[] {
    const examHost = extractHostPattern(settings.examUrl);
    const rules: SebUrlFilterRule[] = [
        {
            action: 1,
            active: true,
            expression: `${examHost}/*`,
            regex: false,
        },
        {
            action: 1,
            active: true,
            expression: examHost,
            regex: false,
        },
    ];

    if (settings.allowSsoPortoCarta && settings.portoCartaUrl.trim()) {
        const portoHost = extractHostPattern(settings.portoCartaUrl);
        if (settings.portoAllowedMode === "sso_only") {
            const ssoPatterns = [
                `${portoHost}/login*`,
                `${portoHost}/auth/*`,
                `${portoHost}/apps/launch/carta-exam*`,
                `${portoHost}/api/*`,
                `${portoHost}/_next/*`,
                `${portoHost}/favicon.ico`,
            ];
            for (const pattern of ssoPatterns) {
                rules.push({
                    action: 1,
                    active: true,
                    expression: pattern,
                    regex: false,
                });
            }
        } else {
            rules.push(
                {
                    action: 1,
                    active: true,
                    expression: `${portoHost}/*`,
                    regex: false,
                },
                {
                    action: 1,
                    active: true,
                    expression: portoHost,
                    regex: false,
                }
            );
        }
    }

    return rules;
}

export function buildSebDictionary(settings: SebConfigSettings): Record<string, unknown> {
    const cleanBase = settings.examUrl.replace(/\/+$/, "");
    const cleanPath = settings.startPath.startsWith("/") ? settings.startPath : `/${settings.startPath}`;
    const startURL = `${cleanBase}${cleanPath}`;
    const popupPolicy = settings.allowPopupsForSso ? 2 : 1;

    const dict: Record<string, unknown> = {
        allowDictation: false,
        allowDisplayMirroring: settings.allowScreenCapture,
        allowQuit: settings.allowQuit,
        allowScreenSharing: settings.allowScreenCapture,
        allowSiri: false,
        allowSpellCheck: false,
        allowWlan: true,
        allowedDisplaysMaxNumber: 1,
        browserWindowAllowAddressBar: false,
        enablePrintScreen: settings.allowScreenCapture,
        examSessionClearCookiesOnEnd: settings.clearCookiesOnEnd,
        examSessionClearCookiesOnStart: true,
        newBrowserWindowByLinkPolicy: popupPolicy,
        newBrowserWindowByScriptPolicy: popupPolicy,
        sendBrowserExamKey: settings.sendBrowserExamKey,
        showReloadButton: settings.showReloadButton,
        showTaskBar: settings.showTaskBar,
        startURL,
        URLFilterEnable: settings.enableUrlFilter,
        URLFilterEnableContentFilter: false,
        URLFilterRules: settings.enableUrlFilter ? buildUrlFilterRules(settings) : [],
    };

    if (settings.hashedQuitPassword) {
        dict.hashedQuitPassword = settings.hashedQuitPassword;
    }

    if (settings.quitURL && settings.quitURL.trim()) {
        dict.quitURL = settings.quitURL.trim();
    }

    return dict;
}

function sortKeysRecursively(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortKeysRecursively);
    }
    if (value !== null && typeof value === "object") {
        const record = value as Record<string, unknown>;
        const sorted: Record<string, unknown> = {};
        const keys = Object.keys(record).sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase(), "en")
        );
        for (const key of keys) {
            sorted[key] = sortKeysRecursively(record[key]);
        }
        return sorted;
    }
    return value;
}

/**
 * Compute SHA-256 Config Key following SEB-JSON canonical ordering (lowercase hex).
 */
export function computeSebConfigKey(settings: SebConfigSettings): string {
    const dict = buildSebDictionary(settings);
    const sorted = sortKeysRecursively(dict);
    const sebJson = JSON.stringify(sorted);
    return crypto.createHash("sha256").update(sebJson, "utf8").digest("hex").toLowerCase();
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function serializePlistValue(value: unknown, indent: string = "    "): string {
    if (typeof value === "boolean") {
        return value ? `${indent}<true/>` : `${indent}<false/>`;
    }
    if (typeof value === "number") {
        return Number.isInteger(value)
            ? `${indent}<integer>${value}</integer>`
            : `${indent}<real>${value}</real>`;
    }
    if (typeof value === "string") {
        return `${indent}<string>${escapeXml(value)}</string>`;
    }
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return `${indent}<array/>`;
        }
        const items = value.map((item) => serializePlistValue(item, `${indent}    `)).join("\n");
        return `${indent}<array>\n${items}\n${indent}</array>`;
    }
    if (value !== null && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length === 0) {
            return `${indent}<dict/>`;
        }
        const lines = entries
            .sort(([a], [b]) => a.localeCompare(b, "en"))
            .map(([k, v]) => `${indent}    <key>${escapeXml(k)}</key>\n${serializePlistValue(v, `${indent}    `)}`)
            .join("\n");
        return `${indent}<dict>\n${lines}\n${indent}</dict>`;
    }
    return `${indent}<string></string>`;
}

/**
 * Generates an Apple Property List (XML) `.seb` configuration file compatible with
 * Safe Exam Browser for iOS (iPhone/iPad), macOS, and Windows.
 */
export function generateSebPlistXml(settings: SebConfigSettings): string {
    const dict = buildSebDictionary(settings);
    const fullDict: Record<string, unknown> = {
        originatorVersion: "CartaExam_SEB_1.0",
        ...dict,
    };

    const entries = Object.entries(fullDict)
        .sort(([a], [b]) => a.localeCompare(b, "en"))
        .map(([k, v]) => `    <key>${escapeXml(k)}</key>\n${serializePlistValue(v, "    ")}`)
        .join("\n");

    return [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">`,
        `<plist version="1.0">`,
        `<dict>`,
        entries,
        `</dict>`,
        `</plist>`,
        "",
    ].join("\n");
}

export function buildSebLaunchUrls(examBaseUrl: string): {
    downloadUrl: string;
    sebUrl: string;
    qrUrl: string;
} {
    const cleanBase = normalizeBaseUrl(examBaseUrl, "http://localhost:3333");
    const downloadUrl = `${cleanBase}/api/seb/config`;
    const isHttps = cleanBase.startsWith("https://");
    const strippedHost = cleanBase.replace(/^https?:\/\//, "");
    const sebScheme = isHttps ? "sebs" : "seb";

    return {
        downloadUrl,
        sebUrl: `${sebScheme}://${strippedHost}/api/seb/config`,
        qrUrl: `${cleanBase}/api/seb/qr`,
    };
}
