
import { db } from "@/lib/db";
import { examSessions, examTemplates, users } from "@/lib/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { fromDateTimeLocalString } from "@/lib/date-utils";
import { ActivityLogger } from "@/lib/activity-logger";
import { apiHandler, ApiError } from "@/lib/api-handler";

// GET /api/exam-sessions - List all sessions
export const GET = (req: Request) => apiHandler(async () => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (status && status !== "all") {
        conditions.push(eq(examSessions.status, status as any));
    }
    if (startDate) {
        conditions.push(sql`${examSessions.startTime} >= ${new Date(startDate).getTime()}`);
    }
    if (endDate) {
        // Adjust end date to include the entire day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        conditions.push(sql`${examSessions.startTime} <= ${endDateTime.getTime()}`);
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

    // Safe mapping to handle potentially corrupted/double-encoded targetIds
    const safeSessions = sessions.map((session: typeof sessions[0]) => {
        let targetIds = session.targetIds;
        if (typeof targetIds === 'string') {
            try {
                // Try to parse if it's a string
                const parsed = JSON.parse(targetIds as string);
                if (Array.isArray(parsed)) {
                    targetIds = parsed;
                } else if (typeof parsed === 'string') {
                    // Try one more level of parsing (double encoded)
                    try {
                        const parsed2 = JSON.parse(parsed);
                        if (Array.isArray(parsed2)) {
                            targetIds = parsed2;
                        }
                    } catch { }
                }
            } catch {
                targetIds = [];
            }
        }
        return { ...session, targetIds: Array.isArray(targetIds) ? targetIds : [] };
    });

    return {
        data: safeSessions,
        metadata: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
});

// POST /api/exam-sessions - Create new session
export const POST = (req: Request) => apiHandler(async () => {
    const body = await req.json();
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
        throw new ApiError("Missing required fields", 400);
    }

    // Validate dates (convert from datetime-local format with UTC+7)
    const start = fromDateTimeLocalString(startTime);
    const end = fromDateTimeLocalString(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ApiError("Invalid date format", 400);
    }
    if (end <= start) {
        throw new ApiError("End time must be after start time", 400);
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
            throw new ApiError("No admin user found. Please ensure at least one admin user exists.", 500);
        }
        userId = adminUsers[0].id;
    }

    // Sanitize targetIds: Ensure it's not a double-encoded string
    let finalTargetIds = targetIds;
    if (typeof finalTargetIds === 'string') {
        try {
            const parsed = JSON.parse(finalTargetIds);
            if (Array.isArray(parsed)) {
                finalTargetIds = parsed;
            }
        } catch {
            // If parse fails, assume it's meant to be an empty array or keep as is if it's not JSON
            finalTargetIds = [];
        }
    }

    // Create session
    const id = crypto.randomUUID();
    const newSessionValues = {
        id,
        templateId,
        sessionName,
        startTime: start,
        endTime: end,
        status: status as any,
        targetType,
        targetIds: finalTargetIds,
        createdBy: userId,
    };

    await db.insert(examSessions).values(newSessionValues);

    // Log activity
    await ActivityLogger.examSession.created(
        userId,
        id,
        sessionName
    );

    return newSessionValues;
});
