import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, examSessions, examTemplates } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { publishHeartbeatEvent } from "@/lib/proctoring-events";

/**
 * POST /api/student/exams/[sessionId]/heartbeat
 * 
 * Receives periodic heartbeat pings from student client.
 * Returns authoritative server-side remaining time to prevent clock manipulation.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const user = await requireAuth(["student", "admin", "teacher"]);
        const { sessionId } = await params;
        const body = await request.json();
        const { clientTime, deviceId } = body;

        // For student role, always use authenticated user ID
        const studentId = user.role === "student" ? user.id : (body.studentId || user.id);

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

        // Check if submission is still active
        if (submission.status !== "in_progress") {
            return NextResponse.json({
                status: submission.status,
                remainingSeconds: 0,
                serverTime: new Date().toISOString(),
                message: submission.status === "terminated"
                    ? "Ujian dihentikan"
                    : "Ujian sudah selesai"
            });
        }

        // Get session and template for timing
        const sessionData = await db.select({
            endTime: examSessions.endTime,
            templateId: examSessions.templateId,
        })
            .from(examSessions)
            .where(eq(examSessions.id, sessionId))
            .limit(1);

        if (sessionData.length === 0) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const session = sessionData[0];

        // Get template duration
        const templateData = await db.select({
            durationMinutes: examTemplates.durationMinutes,
        })
            .from(examTemplates)
            .where(eq(examTemplates.id, session.templateId))
            .limit(1);

        const template = templateData[0];

        // Calculate authoritative remaining time from server
        const now = new Date();
        const serverTime = now.toISOString();

        let effectiveEndTime = new Date(session.endTime);
        const bonusMinutes = submission.bonusTimeMinutes || 0;

        if (submission.startTime && template?.durationMinutes) {
            const startTime = new Date(submission.startTime);
            const durationMs = (template.durationMinutes + bonusMinutes) * 60 * 1000;
            const studentEndTime = new Date(startTime.getTime() + durationMs);

            if (studentEndTime < effectiveEndTime) {
                effectiveEndTime = studentEndTime;
            }
        }

        const remainingMs = Math.max(0, effectiveEndTime.getTime() - now.getTime());
        const remainingSeconds = Math.floor(remainingMs / 1000);

        // Detect clock manipulation: if client time differs from server by > 60 seconds
        let clockAnomaly = false;
        if (clientTime) {
            const clientDate = new Date(clientTime);
            const drift = Math.abs(now.getTime() - clientDate.getTime());
            if (drift > 60000) { // 60 seconds tolerance
                clockAnomaly = true;
            }
        }

        // Update last heartbeat timestamp on submission (lightweight - deviceId validation)
        if (deviceId && submission.deviceId && submission.deviceId !== deviceId) {
            return NextResponse.json({
                error: "DEVICE_MISMATCH",
                message: "Ujian ini sudah dimulai di perangkat lain.",
                status: "blocked"
            }, { status: 403 });
        }

        // Publish heartbeat for live monitoring
        publishHeartbeatEvent(sessionId, studentId, remainingSeconds);

        return NextResponse.json({
            status: "in_progress",
            remainingSeconds,
            serverTime,
            clockAnomaly,
            violationCount: submission.violationCount || 0,
        });
    } catch (error) {
        console.error("Heartbeat error:", error);
        return NextResponse.json(
            { error: "Heartbeat failed" },
            { status: 500 }
        );
    }
}
