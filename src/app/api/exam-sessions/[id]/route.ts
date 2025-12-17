import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examSessions, examTemplates, questionPools, submissions, exams } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { fromDateTimeLocalString } from "@/lib/date-utils";
import { ActivityLogger } from "@/lib/activity-logger";

// GET /api/exam-sessions/[id] - Get session details
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await db.select({
            id: examSessions.id,
            sessionName: examSessions.sessionName,
            status: examSessions.status,
            startTime: examSessions.startTime,
            endTime: examSessions.endTime,
            targetType: examSessions.targetType,
            targetIds: examSessions.targetIds,
            templateId: examSessions.templateId,
            templateName: examTemplates.name,
            durationMinutes: examTemplates.durationMinutes,
            totalScore: examTemplates.totalScore,
            createdAt: examSessions.createdAt,
            submissionCount: sql<number>`(SELECT COUNT(*) FROM ${submissions} WHERE ${submissions.sessionId} = ${examSessions.id})`
        })
            .from(examSessions)
            .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id))
            .where(eq(examSessions.id, params.id))
            .limit(1);

        if (session.length === 0) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        const sessionData = session[0];
        // Safe parsing for targetIds for GET /id endpoint as well
        let targetIds = sessionData.targetIds;
        if (typeof targetIds === 'string') {
            try {
                const parsed = JSON.parse(targetIds as string);
                if (Array.isArray(parsed)) {
                    targetIds = parsed;
                } else if (typeof parsed === 'string') {
                    try {
                        const parsed2 = JSON.parse(parsed);
                        if (Array.isArray(parsed2)) {
                            targetIds = parsed2;
                        }
                    } catch { }
                }
            } catch (e) {
                targetIds = [];
            }
        }

        return NextResponse.json({ ...sessionData, targetIds: Array.isArray(targetIds) ? targetIds : [] });
    } catch (error) {
        console.error("Error fetching session:", error);
        return NextResponse.json(
            { error: "Failed to fetch session" },
            { status: 500 }
        );
    }
}

// PATCH /api/exam-sessions/[id] - Update session
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { sessionName, startTime, endTime, status, targetIds } = body;

        // Use a Record to avoid 'any', but ensure keys match schema
        const updateData: Record<string, unknown> = {};

        // Use 'in' operator to check if field exists in body, allowing empty strings/null
        if ('sessionName' in body && sessionName !== undefined) {
            updateData.sessionName = sessionName;
        }
        if ('startTime' in body && startTime !== undefined && startTime !== '') {
            // Convert datetime-local string to Date with UTC+7 handling
            updateData.startTime = fromDateTimeLocalString(startTime);
        }
        if ('endTime' in body && endTime !== undefined && endTime !== '') {
            // Convert datetime-local string to Date with UTC+7 handling
            updateData.endTime = fromDateTimeLocalString(endTime);
        }
        if ('status' in body && status !== undefined) {
            updateData.status = status;
        }
        if ('targetIds' in body && targetIds !== undefined) {
            let finalTargetIds = targetIds;
            if (typeof finalTargetIds === 'string') {
                try {
                    const parsed = JSON.parse(finalTargetIds);
                    if (Array.isArray(parsed)) {
                        finalTargetIds = parsed;
                    }
                } catch (e) {
                    finalTargetIds = [];
                }
            }
            updateData.targetIds = finalTargetIds;
        }

        await db.update(examSessions)
            .set(updateData)
            .where(eq(examSessions.id, params.id));

        const updatedSession = await db.select().from(examSessions).where(eq(examSessions.id, params.id)).limit(1);

        if (updatedSession.length === 0) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        // Log activity
        await ActivityLogger.examSession.updated(
            updatedSession[0].createdBy,
            updatedSession[0].id,
            updatedSession[0].sessionName
        );

        return NextResponse.json(updatedSession[0]);
    } catch (error) {
        console.error("Error updating session:", error);
        return NextResponse.json(
            { error: "Failed to update session" },
            { status: 500 }
        );
    }
}

// DELETE /api/exam-sessions/[id] - Delete session
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Get session info before deleting for logging
        const sessionToDelete = await db.select()
            .from(examSessions)
            .where(eq(examSessions.id, params.id))
            .limit(1);

        if (sessionToDelete.length === 0) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        // 1. Delete related question pools
        await db.delete(questionPools)
            .where(eq(questionPools.sessionId, params.id));

        // 2. Unlink submissions (set sessionId to null)
        await db.update(submissions)
            .set({ sessionId: null })
            .where(eq(submissions.sessionId, params.id));

        // 3. Unlink exams (set sessionId to null)
        await db.update(exams)
            .set({ sessionId: null })
            .where(eq(exams.sessionId, params.id));

        // 4. Finally delete the session
        await db.delete(examSessions)
            .where(eq(examSessions.id, params.id));

        // Log activity
        await ActivityLogger.examSession.deleted(
            sessionToDelete[0].createdBy,
            sessionToDelete[0].id,
            sessionToDelete[0].sessionName
        );

        return NextResponse.json({ message: "Session deleted successfully" });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete session";
        console.error("Error deleting session:", error);
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
