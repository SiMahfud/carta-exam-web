import { getSchoolSettings } from "@/actions/settings";

// ============================================================================
// Types
// ============================================================================

export interface AIConfig {
    provider: 'gemini' | 'openrouter' | 'openai_compatible';
    geminiApiKey?: string;
    geminiModel?: string;
    openrouterApiKey?: string;
    openrouterModel?: string;
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    openaiModel?: string;
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
            (aiConfig.provider === 'openrouter' && aiConfig.openrouterApiKey) ||
            (aiConfig.provider === 'openai_compatible' && aiConfig.openaiApiKey)
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
// URL & Message Formatting Helpers
// ============================================================================

/**
 * Normalizes a base URL to ensure it points to the `/chat/completions` endpoint.
 */
export function normalizeChatCompletionsUrl(baseUrl?: string): string {
    let base = (baseUrl || "https://api.openai.com/v1").trim();
    if (!base) base = "https://api.openai.com/v1";

    // Remove trailing slashes
    base = base.replace(/\/+$/, "");

    if (base.endsWith("/chat/completions")) {
        return base;
    }
    return `${base}/chat/completions`;
}

/**
 * Converts AIGenerateRequest prompt into OpenAI-compatible messages array.
 */
function buildOpenAIMessages(prompt: AIGenerateRequest['prompt']): Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}> {
    const messages: Array<{
        role: string;
        content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    }> = [];

    if (typeof prompt === 'string') {
        messages.push({ role: "user", content: prompt });
    } else if (Array.isArray(prompt)) {
        const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

        for (const part of prompt) {
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

    return messages;
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
// OpenAI Compatible Generic Provider
// ============================================================================

async function callOpenAICompatible(
    apiKey: string,
    baseUrl: string | undefined,
    model: string,
    request: AIGenerateRequest,
    extraHeaders?: Record<string, string>
): Promise<AIGenerateResponse> {
    const messages = buildOpenAIMessages(request.prompt);
    const endpoint = normalizeChatCompletionsUrl(baseUrl);

    const body: Record<string, unknown> = {
        model,
        messages,
    };

    if (request.config?.temperature !== undefined) {
        body.temperature = request.config.temperature;
    }

    // Support response_format for JSON mode
    if (request.config?.responseMimeType === "application/json") {
        body.response_format = { type: "json_object" };
    }

    const headers: Record<string, string> = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...extraHeaders,
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("OpenAI Compatible API Error:", response.status, errorBody);
        throw new Error(`OpenAI Compatible API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) throw new Error("No response from AI provider");

    return { text };
}

// ============================================================================
// OpenRouter Provider (Wrapper over OpenAI Compatible)
// ============================================================================

async function callOpenRouter(
    apiKey: string,
    model: string,
    request: AIGenerateRequest
): Promise<AIGenerateResponse> {
    return callOpenAICompatible(
        apiKey,
        "https://openrouter.ai/api/v1",
        model,
        request,
        {
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "CartaExam",
        }
    );
}

// ============================================================================
// Gemini Streaming Provider
// ============================================================================

async function* callGeminiStream(
    apiKey: string,
    model: string,
    request: AIGenerateRequest
): AsyncGenerator<string, void, unknown> {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const stream = await ai.models.generateContentStream({
        model,
        contents: request.prompt,
        config: {
            responseMimeType: request.config?.responseMimeType,
            temperature: request.config?.temperature,
        },
    });

    for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
            yield text;
        }
    }
}

// ============================================================================
// OpenAI Compatible Streaming Provider
// ============================================================================

async function* callOpenAICompatibleStream(
    apiKey: string,
    baseUrl: string | undefined,
    model: string,
    request: AIGenerateRequest,
    extraHeaders?: Record<string, string>
): AsyncGenerator<string, void, unknown> {
    const messages = buildOpenAIMessages(request.prompt);
    const endpoint = normalizeChatCompletionsUrl(baseUrl);

    const body: Record<string, unknown> = {
        model,
        messages,
        stream: true,
    };

    if (request.config?.temperature !== undefined) {
        body.temperature = request.config.temperature;
    }
    if (request.config?.responseMimeType === "application/json") {
        body.response_format = { type: "json_object" };
    }

    const headers: Record<string, string> = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...extraHeaders,
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI Compatible API stream error (${response.status}): ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body from stream");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") return;

            try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                    yield content;
                }
            } catch {
                // Skip malformed SSE chunks
            }
        }
    }
}

// ============================================================================
// OpenRouter Streaming Provider
// ============================================================================

async function* callOpenRouterStream(
    apiKey: string,
    model: string,
    request: AIGenerateRequest
): AsyncGenerator<string, void, unknown> {
    yield* callOpenAICompatibleStream(
        apiKey,
        "https://openrouter.ai/api/v1",
        model,
        request,
        {
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "CartaExam",
        }
    );
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Expose resolveAIConfig for use in streaming API routes.
 */
export { resolveAIConfig };

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

    if (config.provider === 'openai_compatible') {
        const apiKey = config.openaiApiKey;
        const baseUrl = config.openaiBaseUrl || "https://api.openai.com/v1";
        const model = config.openaiModel || "gpt-4o-mini";
        if (!apiKey) throw new Error("OpenAI API Key belum dikonfigurasi.");
        return callOpenAICompatible(apiKey, baseUrl, model, request);
    }

    // Default: Gemini
    const apiKey = config.geminiApiKey;
    const model = config.geminiModel || "gemini-2.5-flash";
    if (!apiKey) throw new Error("Gemini API Key belum dikonfigurasi.");
    return callGemini(apiKey, model, request);
}

/**
 * Generate content as a stream using the configured AI provider.
 * Yields text chunks as they arrive from the model.
 */
export async function* generateAIContentStream(
    request: AIGenerateRequest
): AsyncGenerator<string, void, unknown> {
    const config = await resolveAIConfig();

    if (config.provider === 'openrouter') {
        const apiKey = config.openrouterApiKey;
        const model = config.openrouterModel || "google/gemini-2.5-flash";
        if (!apiKey) throw new Error("OpenRouter API Key belum dikonfigurasi.");
        yield* callOpenRouterStream(apiKey, model, request);
        return;
    }

    if (config.provider === 'openai_compatible') {
        const apiKey = config.openaiApiKey;
        const baseUrl = config.openaiBaseUrl || "https://api.openai.com/v1";
        const model = config.openaiModel || "gpt-4o-mini";
        if (!apiKey) throw new Error("OpenAI API Key belum dikonfigurasi.");
        yield* callOpenAICompatibleStream(apiKey, baseUrl, model, request);
        return;
    }

    // Default: Gemini
    const apiKey = config.geminiApiKey;
    const model = config.geminiModel || "gemini-2.5-flash";
    if (!apiKey) throw new Error("Gemini API Key belum dikonfigurasi.");
    yield* callGeminiStream(apiKey, model, request);
}

/**
 * Get the currently active AI provider name (for display).
 */
export async function getActiveProviderName(): Promise<string> {
    const config = await resolveAIConfig();
    if (config.provider === 'openrouter') {
        return `OpenRouter (${config.openrouterModel || 'google/gemini-2.5-flash'})`;
    }
    if (config.provider === 'openai_compatible') {
        return `OpenAI Compatible (${config.openaiModel || 'gpt-4o-mini'})`;
    }
    return `Gemini (${config.geminiModel || 'gemini-2.5-flash'})`;
}

/**
 * Test an AI provider connection with a minimal request.
 */
export async function testAIConnection(
    provider: 'gemini' | 'openrouter' | 'openai_compatible',
    apiKey: string,
    model: string,
    baseUrl?: string
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
        } else if (provider === 'openai_compatible') {
            await callOpenAICompatible(apiKey, baseUrl, model || "gpt-4o-mini", request);
        } else {
            await callGemini(apiKey, model, request);
        }

        const latencyMs = Date.now() - start;
        return {
            success: true,
            message: `Koneksi berhasil! (${latencyMs}ms)`,
            latencyMs,
        };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        return {
            success: false,
            message: error.message || "Koneksi gagal.",
        };
    }
}
