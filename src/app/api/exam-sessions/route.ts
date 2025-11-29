import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examSessions, examTemplates, users } from "@/lib/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// GET /api/exam-sessions - List all sessions
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const status = searchParams.get("status");

        const offset = (page - 1) * limit;

        // Build where conditions
        const conditions = [];
        if (status && status !== "all") {
            conditions.push(eq(examSessions.status, status as any));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const totalResult = await db.select({ count: sql<number>`count(*)` })
            .from(examSessions)
            .where(whereClause);
        const total = Number(totalResult[0]?.count || 0);

        // Fetch sessions with template info
        const sessions = await db.select({
            id: examSessions.id,
            sessionName: examSessions.sessionName,
            status: examSessions.status,
            startTime: examSessions.startTime,
            endTime: examSessions.endTime,
            targetType: examSessions.targetType,
            targetIds: examSessions.targetIds,
            templateName: examTemplates.name,
            durationMinutes: examTemplates.durationMinutes,
            createdAt: examSessions.createdAt,
        })
            .from(examSessions)
            .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id))
            .where(whereClause)
            .orderBy(desc(examSessions.createdAt))
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            data: sessions,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching exam sessions:", error);
        return NextResponse.json(
            { error: "Failed to fetch exam sessions" },
            { status: 500 }
        );
    }
}

// POST /api/exam-sessions - Create new session
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
            createdBy // Should come from auth session
        } = body;

        // Validation
        if (!templateId || !sessionName || !startTime || !endTime || !targetType || !targetIds) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Validate dates
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json(
                { error: "Invalid date format" },
                { status: 400 }
            );
        }
        if (end <= start) {
            return NextResponse.json(
                { error: "End time must be after start time" },
                { status: 400 }
            );
        }

        // Determine initial status
        const now = new Date();
        let status = "scheduled";
        if (now >= start && now <= end) {
            status = "active";
        } else if (now > end) {
            status = "completed";
        }

        // Get a valid user ID if not provided
        let userId = createdBy;
        if (!userId) {
            // Fetch the first admin user as fallback
            const adminUsers = await db.select({ id: users.id })
                .from(users)
                .where(eq(users.role, "admin"))
                .limit(1);

            if (adminUsers.length === 0) {
                return NextResponse.json(
                    { error: "No admin user found. Please ensure at least one admin user exists." },
                    { status: 500 }
                );
            }
            userId = adminUsers[0].id;
        }

        // Create session
        const newSession = await db.insert(examSessions).values({
            templateId,
            sessionName,
            startTime: start,
            endTime: end,
            status: status as any,
            targetType,
            targetIds,
            createdBy: userId,
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
