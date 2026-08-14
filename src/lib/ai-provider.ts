import { getSchoolSettings } from "@/actions/settings";

// ============================================================================
// Types
// ============================================================================

export interface AIConfig {
    provider: 'gemini' | 'openrouter';
    geminiApiKey?: string;
    geminiModel?: string;
    openrouterApiKey?: string;
    openrouterModel?: string;
}

export interface AIGenerateRequest {
    prompt: string | Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    config?: {
        responseMimeType?: string;
        temperature?: number;
    };
}

export interface AIGenerateResponse {
    text: string;
}

// ============================================================================
// Config Resolution
// ============================================================================

/**
 * Resolves the AI configuration from the database, falling back to env vars.
 */
async function resolveAIConfig(): Promise<AIConfig> {
    try {
        const s = await getSchoolSettings();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aiConfig = (s as any)?.aiConfig as AIConfig | null | undefined;

        if (aiConfig?.provider && (
            (aiConfig.provider === 'gemini' && aiConfig.geminiApiKey) ||
            (aiConfig.provider === 'openrouter' && aiConfig.openrouterApiKey)
        )) {
            return aiConfig;
        }
    } catch (err) {
        console.warn("Failed to load AI config from DB, falling back to env:", err);
    }

    // Fallback to env vars (backward compatible)
    return {
        provider: 'gemini',
        geminiApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        geminiModel: process.env.GOOGLE_GENERATIVE_AI_MODEL || "gemini-2.5-flash",
    };
}

// ============================================================================
// Gemini Provider
// ============================================================================

async function callGemini(
    apiKey: string,
    model: string,
    request: AIGenerateRequest
): Promise<AIGenerateResponse> {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
        model,
        contents: request.prompt,
        config: {
            responseMimeType: request.config?.responseMimeType,
            temperature: request.config?.temperature,
        },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini AI");

    return { text };
}

// ============================================================================
// OpenRouter Provider
// ============================================================================

async function callOpenRouter(
    apiKey: string,
    model: string,
    request: AIGenerateRequest
): Promise<AIGenerateResponse> {
    // Build messages from the prompt
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];

    if (typeof request.prompt === 'string') {
        messages.push({ role: "user", content: request.prompt });
    } else if (Array.isArray(request.prompt)) {
        // Convert Gemini-style parts to OpenAI-style content array
        const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

        for (const part of request.prompt) {
            if ('text' in part && part.text) {
                contentParts.push({ type: "text", text: part.text });
            }
            if ('inlineData' in part && part.inlineData) {
                contentParts.push({
                    type: "image_url",
                    image_url: {
                        url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                    }
                });
            }
        }

        messages.push({ role: "user", content: contentParts });
    }

    const body: Record<string, unknown> = {
        model,
        messages,
    };

    if (request.config?.temperature !== undefined) {
        body.temperature = request.config.temperature;
    }

    // OpenRouter supports response_format for JSON mode
    if (request.config?.responseMimeType === "application/json") {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "CartaExam",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("OpenRouter API Error:", response.status, errorBody);
        throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) throw new Error("No response from OpenRouter AI");

    return { text };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate content using the configured AI provider.
 * This is the main entry point for all AI calls in the application.
 */
export async function generateAIContent(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const config = await resolveAIConfig();

    if (config.provider === 'openrouter') {
        const apiKey = config.openrouterApiKey;
        const model = config.openrouterModel || "google/gemini-2.5-flash";
        if (!apiKey) throw new Error("OpenRouter API Key belum dikonfigurasi.");
        return callOpenRouter(apiKey, model, request);
    }

    // Default: Gemini
    const apiKey = config.geminiApiKey;
    const model = config.geminiModel || "gemini-2.5-flash";
    if (!apiKey) throw new Error("Gemini API Key belum dikonfigurasi.");
    return callGemini(apiKey, model, request);
}

/**
 * Get the currently active AI provider name (for display).
 */
export async function getActiveProviderName(): Promise<string> {
    const config = await resolveAIConfig();
    if (config.provider === 'openrouter') {
        return `OpenRouter (${config.openrouterModel || 'google/gemini-2.5-flash'})`;
    }
    return `Gemini (${config.geminiModel || 'gemini-2.5-flash'})`;
}

/**
 * Test an AI provider connection with a minimal request.
 */
export async function testAIConnection(
    provider: 'gemini' | 'openrouter',
    apiKey: string,
    model: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();

    try {
        const request: AIGenerateRequest = {
            prompt: "Respond with exactly: {\"status\":\"ok\"}",
            config: {
                responseMimeType: "application/json",
                temperature: 0,
            },
        };

        if (provider === 'openrouter') {
            await callOpenRouter(apiKey, model, request);
        } else {
            await callGemini(apiKey, model, request);
        }

        const latencyMs = Date.now() - start;
        return {
            success: true,
            message: `Koneksi berhasil! (${latencyMs}ms)`,
            latencyMs,
        };
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Koneksi gagal.",
        };
    }
}
