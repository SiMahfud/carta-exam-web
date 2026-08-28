import { NextRequest } from "next/server";
import { generateAIContentStream, getActiveProviderName } from "@/lib/ai-provider";
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
            let isClosed = false;

            const safeEnqueue = (data: Uint8Array): boolean => {
                if (isClosed || request.signal.aborted) return false;
                try {
                    if (controller.desiredSize === null) {
                        isClosed = true;
                        return false;
                    }
                    controller.enqueue(data);
                    return true;
                } catch {
                    isClosed = true;
                    return false;
                }
            };

            const safeClose = () => {
                if (isClosed) return;
                isClosed = true;
                try {
                    if (controller.desiredSize !== null) {
                        controller.close();
                    }
                } catch {
                    // Ignore if already closed or in invalid state
                }
            };

            const abortHandler = () => {
                isClosed = true;
                safeClose();
            };

            request.signal.addEventListener("abort", abortHandler);

            try {
                // 1. Parse request body
                const body = await request.json();
                const { promptText, contextFile, options } = body as {
                    promptText: string;
                    contextFile?: { base64: string; mimeType: string };
                    options?: GenerationOptions;
                };

                if (request.signal.aborted) return;

                // 2. Send initial status - preparing
                safeEnqueue(sseMessage("status", {
                    step: 1,
                    label: "Menyiapkan konteks & prompt...",
                }));

                // 3. Build prompt
                const { parts } = buildQuestionPrompt(promptText, contextFile, options);

                if (request.signal.aborted) return;

                // 4. Resolve provider info for display
                const providerName = await getActiveProviderName();

                safeEnqueue(sseMessage("status", {
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
                    if (request.signal.aborted || isClosed) {
                        break;
                    }

                    fullText += chunk;
                    chunkCount++;

                    // Send token chunk to client
                    safeEnqueue(sseMessage("token", {
                        chunk,
                        totalLength: fullText.length,
                        chunkIndex: chunkCount,
                    }));
                }

                if (request.signal.aborted || isClosed) return;

                // 6. Validate and normalize
                safeEnqueue(sseMessage("status", {
                    step: 3,
                    label: "Memvalidasi format & kunci jawaban...",
                }));

                if (!fullText.trim()) {
                    throw new Error("AI tidak menghasilkan respons. Silakan coba lagi.");
                }

                const questions = normalizeAndValidateQuestions(fullText);

                if (request.signal.aborted || isClosed) return;

                // 7. Send completed result
                safeEnqueue(sseMessage("status", {
                    step: 4,
                    label: "Selesai!",
                }));

                safeEnqueue(sseMessage("complete", {
                    questions,
                    totalChunks: chunkCount,
                    totalChars: fullText.length,
                }));

            } catch (err) {
                console.error("Streaming generation error:", err);
                const message = err instanceof Error ? err.message : "Gagal generate soal. Silakan coba lagi.";
                safeEnqueue(sseMessage("error", { message }));
            } finally {
                request.signal.removeEventListener("abort", abortHandler);
                safeClose();
            }
        },
        cancel() {
            // Invoked when stream reader cancels
        }
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
