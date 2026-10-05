import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { proctoringEvents, type ProctoringEvent } from "@/lib/proctoring-events";

export const dynamic = "force-dynamic";

/**
 * GET /api/exam-sessions/[id]/events - SSE endpoint for real-time proctoring
 * 
 * Streams proctoring events (violations, submissions, proctor actions)
 * to connected admin/teacher clients via Server-Sent Events.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth(["admin", "teacher"]);
    } catch (authError: any) {
        return new Response(JSON.stringify({ error: authError.message || "Unauthorized" }), {
            status: authError.status || 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const sessionId = params.id;

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            // Send initial connection event
            const connectEvent = `data: ${JSON.stringify({
                type: 'connected',
                sessionId,
                timestamp: new Date().toISOString(),
                message: 'Terhubung ke proctoring real-time'
            })}\n\n`;
            controller.enqueue(encoder.encode(connectEvent));

            // Subscribe to events for this session
            const unsubscribe = proctoringEvents.subscribe(sessionId, (event: ProctoringEvent) => {
                try {
                    const sseData = `data: ${JSON.stringify(event)}\n\n`;
                    controller.enqueue(encoder.encode(sseData));
                } catch {
                    // Client disconnected, will be cleaned up
                }
            });

            // Send periodic keepalive pings every 30 seconds
            const keepalive = setInterval(() => {
                try {
                    const ping = `data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`;
                    controller.enqueue(encoder.encode(ping));
                } catch {
                    clearInterval(keepalive);
                }
            }, 30000);

            // Cleanup on abort (client disconnect)
            req.signal.addEventListener('abort', () => {
                unsubscribe();
                clearInterval(keepalive);
                try {
                    controller.close();
                } catch {
                    // Already closed
                }
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable Nginx buffering
        },
    });
}
