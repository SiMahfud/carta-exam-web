import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { studentIds, action } = await request.json();

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json(
                { error: "No students selected" },
                { status: 400 }
            );
        }

        const sessionId = params.id;

        switch (action) {
            case "reset_time":
                // Reset time: clear startTime, endTime, set status to in_progress
                await db.update(submissions)
                    .set({
                        startTime: null,
                        endTime: null,
                        status: "in_progress"
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
