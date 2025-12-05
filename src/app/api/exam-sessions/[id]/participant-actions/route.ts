import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@/lib/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { studentIds, action, minutes } = await request.json();

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json(
                { error: "No students selected" },
                { status: 400 }
            );
        }

        const sessionId = params.id;

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
                // Reset violations only: clear violation count and log
                await db.update(submissions)
                    .set({
                        violationCount: 0,
                        violationLog: []
                    })
                    .where(
                        and(
                            eq(submissions.sessionId, sessionId),
                            inArray(submissions.userId, studentIds)
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

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error performing participant action:", error);
        return NextResponse.json(
            { error: "Failed to perform action" },
            { status: 500 }
        );
    }
}
