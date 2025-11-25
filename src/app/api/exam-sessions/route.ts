import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examSessions, examTemplates, classStudents } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";

// GET /api/exam-sessions - List all exam sessions
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const baseQuery = db.select({
            id: examSessions.id,
            sessionName: examSessions.sessionName,
            templateId: examSessions.templateId,
            templateName: examTemplates.name,
            startTime: examSessions.startTime,
            endTime: examSessions.endTime,
            status: examSessions.status,
            targetType: examSessions.targetType,
            createdAt: examSessions.createdAt,
        })
            .from(examSessions)
            .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id));

        const sessions = status
            ? await baseQuery.where(eq(examSessions.status, status as any)).orderBy(examSessions.createdAt)
            : await baseQuery.orderBy(examSessions.createdAt);
        return NextResponse.json(sessions);
    } catch (error) {
        console.error("Error fetching exam sessions:", error);
        return NextResponse.json(
            { error: "Failed to fetch exam sessions" },
            { status: 500 }
        );
    }
}

// POST /api/exam-sessions - Create new exam session from template
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            templateId,
            sessionName,
            startTime,
            endTime,
            targetType,
            targetIds,
            createdBy,
        } = body;

        if (!templateId || !sessionName || !startTime || !endTime || !targetType || !targetIds || !createdBy) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        // Create session
        const newSession = await db.insert(examSessions).values({
            templateId,
            sessionName,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            targetType,
            targetIds,
            status: "scheduled",
            generatedQuestions: {}, // Will be populated when questions are generated
            createdBy,
        }).returning();

        return NextResponse.json(newSession[0], { status: 201 });
    } catch (error) {
        console.error("Error creating exam session:", error);
        return NextResponse.json(
            { error: "Failed to create exam session" },
            { status: 500 }
        );
    }
}
