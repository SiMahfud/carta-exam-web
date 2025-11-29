import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, examSessions, examTemplates } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

// POST /api/student/exams/[sessionId]/violation - Log a violation
export async function POST(
    request: Request,
    { params }: { params: { sessionId: string } }
) {
    try {
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
                eq(submissions.sessionId, params.sessionId),
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
            .where(eq(examSessions.id, params.sessionId))
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
        })
            .from(examTemplates)
            .where(eq(examTemplates.id, sessionData[0].templateId))
            .limit(1);

        const maxViolations = templateData[0]?.maxViolations || 3;

        // Update violation log
        const currentLog = (submission.violationLog as any) || [];
        const newLog = [
            ...currentLog,
            {
                type,
                details,
                timestamp: new Date().toISOString(),
            }
        ];

        const newViolationCount = (submission.violationCount || 0) + 1;
        const shouldTerminate = newViolationCount >= maxViolations;

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
