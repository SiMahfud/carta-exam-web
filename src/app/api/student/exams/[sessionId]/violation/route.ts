import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, examSessions, examTemplates } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

// POST /api/student/exams/[sessionId]/violation - Log a violation
export async function POST(
    request: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const { sessionId } = await params;
        const body = await request.json();
        const { studentId, type, details } = body;
        // type: 'tab_switch', 'copy_paste', 'right_click', 'screenshot', etc.

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

        // Update violation log
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

        return NextResponse.json({
            violationCount: newViolationCount,
            maxViolations,
            shouldTerminate,
            message: shouldTerminate
                ? "Batas pelanggaran tercapai. Ujian dihentikan."
                : `Pelanggaran dicatat. ${newViolationCount}/${maxViolations}`
        });
    } catch (error) {
        console.error("Error logging violation:", error);
        return NextResponse.json(
            { error: "Failed to log violation" },
            { status: 500 }
        );
    }
}
