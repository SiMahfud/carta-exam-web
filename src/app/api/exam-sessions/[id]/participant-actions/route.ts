import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@/lib/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { publishSessionUpdateEvent } from "@/lib/proctoring-events";
import { requireAuth } from "@/lib/auth-guard";
import { extractEvidenceUrlsFromLog, deleteEvidenceFiles } from "@/lib/violation-evidence";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireAuth(["admin", "teacher"]);
        const { studentIds, action, minutes } = await request.json();

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json(
                { error: "No students selected" },
                { status: 400 }
            );
        }

        const sessionId = params.id;

        if (["reset_time", "reset_violations", "reset_permission", "retake"].includes(action)) {
            const targetSubs = await db.select({ violationLog: submissions.violationLog })
                .from(submissions)
                .where(
                    and(
                        eq(submissions.sessionId, sessionId),
                        inArray(submissions.userId, studentIds)
                    )
                );
            const allEvidenceUrls = targetSubs.flatMap((s: { violationLog: unknown }) =>
                extractEvidenceUrlsFromLog(s.violationLog)
            );
            await deleteEvidenceFiles(allEvidenceUrls);
        }

        switch (action) {
            case "reset_time":
                // Reset time: clear startTime, endTime, bonusTimeMinutes, violations, set status to in_progress
                await db.update(submissions)
                    .set({
                        startTime: null,
                        endTime: null,
                        bonusTimeMinutes: 0,
                        violationCount: 0,
                        violationLog: [],
                        status: "in_progress"
                    })
                    .where(
                        and(
                            eq(submissions.sessionId, sessionId),
                            inArray(submissions.userId, studentIds)
                        )
                    );
                break;

            case "reset_violations":
                // Reset violations only: clear violation count and log, set status back to in_progress if terminated
                await db.update(submissions)
                    .set({
                        violationCount: 0,
                        violationLog: [],
                        status: "in_progress"  // Allow terminated students to continue
                    })
                    .where(
                        and(
                            eq(submissions.sessionId, sessionId),
                            inArray(submissions.userId, studentIds)
                        )
                    );
                break;

            case "reset_permission":
                // Reset permission for terminated students: allow them to continue exam
                await db.update(submissions)
                    .set({
                        violationCount: 0,
                        violationLog: [],
                        status: "in_progress",
                        endTime: null  // Clear endTime that was set during termination
                    })
                    .where(
                        and(
                            eq(submissions.sessionId, sessionId),
                            inArray(submissions.userId, studentIds)
                        )
                    );
                break;

            case "lock_session":
                // Lock session for selected students who are in_progress
                await db.update(submissions)
                    .set({
                        status: "terminated",
                        endTime: new Date()
                    })
                    .where(
                        and(
                            eq(submissions.sessionId, sessionId),
                            inArray(submissions.userId, studentIds),
                            eq(submissions.status, "in_progress")
                        )
                    );
                break;

            case "add_time":
                // Add time: increment bonusTimeMinutes
                if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
                    return NextResponse.json(
                        { error: "Valid minutes value required" },
                        { status: 400 }
                    );
                }
                await db.update(submissions)
                    .set({
                        bonusTimeMinutes: sql`COALESCE(${submissions.bonusTimeMinutes}, 0) + ${minutes}`
                    })
                    .where(
                        and(
                            eq(submissions.sessionId, sessionId),
                            inArray(submissions.userId, studentIds)
                        )
                    );
                break;

            case "force_finish":
                // Force finish: set status to completed, endTime to now
                await db.update(submissions)
                    .set({
                        status: "completed",
                        endTime: new Date()
                    })
                    .where(
                        and(
                            eq(submissions.sessionId, sessionId),
                            inArray(submissions.userId, studentIds)
                        )
                    );
                break;

            case "retake":
                // Retake: delete submission
                await db.delete(submissions)
                    .where(
                        and(
                            eq(submissions.sessionId, sessionId),
                            inArray(submissions.userId, studentIds)
                        )
                    );
                break;

            default:
                return NextResponse.json(
                    { error: "Invalid action" },
                    { status: 400 }
                );
        }

        // Broadcast session update event via SSE to proctor dashboard
        try {
            publishSessionUpdateEvent(sessionId, action, { studentIds });
        } catch (e) {
            console.error("Error publishing participant action event:", e);
        }

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        const err = error as { message?: string; status?: number };
        console.error("Error performing participant action:", error);
        return NextResponse.json(
            { error: err.message || "Failed to perform action" },
            { status: err.status || 500 }
        );
    }
}
