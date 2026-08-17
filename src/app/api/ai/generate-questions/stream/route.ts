import { NextRequest } from "next/server";
import { generateAIContentStream, resolveAIConfig } from "@/lib/ai-provider";
import { buildQuestionPrompt, normalizeAndValidateQuestions, type GenerationOptions } from "@/lib/ai-question-utils";

// POST /api/ai/generate-questions/stream
// Server-Sent Events endpoint for streaming AI question generation
export async function POST(request: NextRequest) {
    const encoder = new TextEncoder();

    // Helper to format SSE messages
    function sseMessage(event: string, data: unknown): Uint8Array {
        return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // 1. Parse request body
                const body = await request.json();
                const { promptText, contextFile, options } = body as {
                    promptText: string;
                    contextFile?: { base64: string; mimeType: string };
                    options?: GenerationOptions;
                };

                // 2. Send initial status - preparing
                controller.enqueue(sseMessage("status", {
                    step: 1,
                    label: "Menyiapkan konteks & prompt...",
                }));

                // 3. Build prompt
                const { parts } = buildQuestionPrompt(promptText, contextFile, options);

                // 4. Resolve provider info for display
                const config = await resolveAIConfig();
                const providerName = config.provider === 'openrouter'
                    ? `OpenRouter (${config.openrouterModel || 'google/gemini-2.5-flash'})`
                    : `Gemini (${config.geminiModel || 'gemini-2.5-flash'})`;

                controller.enqueue(sseMessage("status", {
                    step: 2,
                    label: `Menghubungkan ke ${providerName}...`,
                    provider: providerName,
                }));

                // 5. Stream tokens from AI
                let fullText = "";
                let chunkCount = 0;

                const streamGenerator = generateAIContentStream({
                    prompt: parts,
                    config: {
                        responseMimeType: "application/json",
                    },
                });

                for await (const chunk of streamGenerator) {
                    fullText += chunk;
                    chunkCount++;

                    // Send token chunk to client
                    controller.enqueue(sseMessage("token", {
                        chunk,
                        totalLength: fullText.length,
                        chunkIndex: chunkCount,
                    }));
                }

                // 6. Validate and normalize
                controller.enqueue(sseMessage("status", {
                    step: 3,
                    label: "Memvalidasi format & kunci jawaban...",
                }));

                if (!fullText.trim()) {
                    throw new Error("AI tidak menghasilkan respons. Silakan coba lagi.");
                }

                const questions = normalizeAndValidateQuestions(fullText);

                // 7. Send completed result
                controller.enqueue(sseMessage("status", {
                    step: 4,
                    label: "Selesai!",
                }));

                controller.enqueue(sseMessage("complete", {
                    questions,
                    totalChunks: chunkCount,
                    totalChars: fullText.length,
                }));

            } catch (err) {
                console.error("Streaming generation error:", err);
                const message = err instanceof Error ? err.message : "Gagal generate soal. Silakan coba lagi.";
                controller.enqueue(sseMessage("error", { message }));
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no", // Disable nginx buffering
        },
    });
}
