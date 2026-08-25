import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, examSessions, examTemplates } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { publishViolationEvent } from "@/lib/proctoring-events";

// POST /api/student/exams/[sessionId]/violation - Log a violation
export async function POST(
    request: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const user = await requireAuth(["student", "admin", "teacher"]);
        const { sessionId } = await params;
        const body = await request.json();
        const { type, details } = body;

        // For student role, always use authenticated user ID
        const studentId = user.role === "student" ? user.id : (body.studentId || user.id);

        if (!studentId || !type) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get submission
        const submissionData = await db.select()
            .from(submissions)
            .where(and(
                eq(submissions.sessionId, sessionId),
                eq(submissions.userId, studentId)
            ))
            .limit(1);

        if (submissionData.length === 0) {
            return NextResponse.json(
                { error: "No active submission" },
                { status: 404 }
            );
        }

        const submission = submissionData[0];

        // Get session to check max violations
        const sessionData = await db.select({
            templateId: examSessions.templateId,
        })
            .from(examSessions)
            .where(eq(examSessions.id, sessionId))
            .limit(1);

        if (sessionData.length === 0) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        // Get template for max violations
        const templateData = await db.select({
            maxViolations: examTemplates.maxViolations,
            violationSettings: examTemplates.violationSettings,
        })
            .from(examTemplates)
            .where(eq(examTemplates.id, sessionData[0].templateId))
            .limit(1);

        const maxViolations = templateData[0]?.maxViolations || 3;
        let violationSettings = templateData[0]?.violationSettings;

        // Robust parsing for violationSettings
        try {
            if (typeof violationSettings === 'string') {
                try { violationSettings = JSON.parse(violationSettings); } catch { }
            }
            if (typeof violationSettings === 'string') {
                try { violationSettings = JSON.parse(violationSettings); } catch { }
            }
        } catch {
            // Keep original value if parsing fails
        }

        // Default to 'strict' if not set, for backward compatibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const violationMode = (violationSettings as any)?.mode || 'strict';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cooldownSeconds = Math.max(1, Number((violationSettings as any)?.cooldownSeconds) || 5);
        const cooldownMs = cooldownSeconds * 1000;

        // Parse current violation log
        let currentLog: any[] = [];
        try {
            let parsed = submission.violationLog;
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch { }
            }
            if (Array.isArray(parsed)) {
                currentLog = parsed;
            }
        } catch {
            currentLog = [];
        }

        // Server-side Cooldown Check: Ignore burst violations within cooldown period
        if (currentLog.length > 0) {
            const lastEntry = currentLog[currentLog.length - 1];
            if (lastEntry && lastEntry.timestamp) {
                const lastTime = new Date(lastEntry.timestamp).getTime();
                const now = Date.now();
                if (!isNaN(lastTime) && (now - lastTime < cooldownMs)) {
                    return NextResponse.json({
                        violationCount: submission.violationCount || 0,
                        maxViolations,
                        shouldTerminate: false,
                        ignored: true,
                        violationLog: currentLog,
                        message: `Pelanggaran diabaikan karena masih dalam jeda (${cooldownSeconds} detik).`
                    });
                }
            }
        }

        const newLog = [
            ...currentLog,
            {
                type,
                details,
                timestamp: new Date().toISOString(),
            }
        ];

        const newViolationCount = (submission.violationCount || 0) + 1;

        // Only terminate if mode is 'strict' AND max violations reached
        // In 'lenient' (Toleran) mode, we just log and warn
        const shouldTerminate = violationMode === 'strict' && newViolationCount >= maxViolations;

        // Update submission
        await db.update(submissions)
            .set({
                violationCount: newViolationCount,
                violationLog: newLog,
                status: shouldTerminate ? "terminated" : submission.status,
                endTime: shouldTerminate ? new Date() : submission.endTime,
            })
            .where(eq(submissions.id, submission.id));

        // Broadcast violation event via SSE to proctor dashboard
        try {
            publishViolationEvent(
                sessionId,
                studentId,
                user.name || "Siswa",
                type,
                newViolationCount,
                details
            );
        } catch (e) {
            console.error("Error publishing violation event:", e);
        }

        return NextResponse.json({
            violationCount: newViolationCount,
            maxViolations,
            shouldTerminate,
            violationLog: newLog,
            message: shouldTerminate
                ? "Batas pelanggaran tercapai. Ujian dihentikan."
                : `Pelanggaran dicatat. ${newViolationCount}/${maxViolations}`
        });
    } catch (error: any) {
        const status = error.status || 500;
        if (status >= 500) {
            console.error("Error logging violation:", error);
        }
        return NextResponse.json(
            { error: error.message || "Failed to log violation" },
            { status }
        );
    }
}
