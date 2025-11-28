import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examSessions, examTemplates } from "@/lib/schema";
import { eq } from "drizzle-orm";

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

        return NextResponse.json(session[0]);
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
        const { sessionName, startTime, endTime, status } = body;

        const updateData: any = {};
        if (sessionName) updateData.sessionName = sessionName;
        if (startTime) updateData.startTime = new Date(startTime);
        if (endTime) updateData.endTime = new Date(endTime);
        if (status) updateData.status = status;

        const updatedSession = await db.update(examSessions)
            .set(updateData)
            .where(eq(examSessions.id, params.id))
            .returning();

        if (updatedSession.length === 0) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

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
        // TODO: Check for submissions before deleting

        const deletedSession = await db.delete(examSessions)
            .where(eq(examSessions.id, params.id))
            .returning();

        if (deletedSession.length === 0) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: "Session deleted successfully" });
    } catch (error) {
        console.error("Error deleting session:", error);
        return NextResponse.json(
            { error: "Failed to delete session" },
            { status: 500 }
        );
    }
}
