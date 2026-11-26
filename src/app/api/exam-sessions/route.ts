
import { db } from "@/lib/db";
import { examSessions, examTemplates, users } from "@/lib/schema";
import { eq, desc, and, or, ne, gt, gte, lt, lte, sql } from "drizzle-orm";
import { fromDateTimeLocalString } from "@/lib/date-utils";
import { ActivityLogger } from "@/lib/activity-logger";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/exam-sessions - List all sessions
export const GET = (req: Request) => apiHandler(async () => {
    const user = await requireAuth(["admin", "teacher"]);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10") || 10);
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();
    const createdByFilter = searchParams.get("createdBy");

    const offset = (page - 1) * limit;
    const now = new Date();

    // Build where conditions
    const conditions = [];

    // Isolation: Teachers strictly see only sessions they created
    if (user.role === "teacher") {
        conditions.push(eq(examSessions.createdBy, user.id));
    } else if (user.role === "admin") {
        if (createdByFilter) {
            conditions.push(eq(examSessions.createdBy, createdByFilter));
        }
    }

    if (status && status !== "all") {
        if (status === "cancelled") {
            conditions.push(eq(examSessions.status, "cancelled"));
        } else if (status === "scheduled") {
            conditions.push(
                and(
                    ne(examSessions.status, "cancelled"),
                    ne(examSessions.status, "completed"),
                    gt(examSessions.startTime, now)
                )
            );
        } else if (status === "active") {
            conditions.push(
                and(
                    ne(examSessions.status, "cancelled"),
                    ne(examSessions.status, "completed"),
                    lte(examSessions.startTime, now),
                    gte(examSessions.endTime, now)
                )
            );
        } else if (status === "completed") {
            conditions.push(
                or(
                    eq(examSessions.status, "completed"),
                    and(
                        ne(examSessions.status, "cancelled"),
                        lt(examSessions.endTime, now)
                    )
                )
            );
        }
    }

    if (startDate) {
        const parsedStart = new Date(startDate);
        if (!isNaN(parsedStart.getTime())) {
            conditions.push(gte(examSessions.startTime, parsedStart));
        }
    }
    if (endDate) {
        const parsedEnd = /^\d{4}-\d{2}-\d{2}$/.test(endDate)
            ? new Date(`${endDate}T23:59:59.999`)
            : new Date(endDate);
        if (!isNaN(parsedEnd.getTime())) {
            conditions.push(lte(examSessions.startTime, parsedEnd));
        }
    }

    if (search) {
        const pattern = `%${search.toLowerCase()}%`;
        conditions.push(
            or(
                sql`LOWER(${examSessions.sessionName}) LIKE ${pattern}`,
                sql`LOWER(${examTemplates.name}) LIKE ${pattern}`,
                sql`LOWER(COALESCE(${users.name}, '')) LIKE ${pattern}`
            )
        );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count (include joins so search conditions on template/creator also apply)
    const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(examSessions)
        .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id))
        .leftJoin(users, eq(examSessions.createdBy, users.id))
        .where(whereClause);
    const total = Number(totalResult[0]?.count || 0);

    // Fetch sessions with template and creator info
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
        createdBy: examSessions.createdBy,
        creatorName: users.name,
    })
        .from(examSessions)
        .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id))
        .leftJoin(users, eq(examSessions.createdBy, users.id))
        .where(whereClause)
        .orderBy(desc(examSessions.createdAt))
        .limit(limit)
        .offset(offset);

    // Safe mapping to handle potentially corrupted/double-encoded targetIds and live status
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

        let effectiveStatus = session.status;
        if (session.status !== "cancelled" && session.status !== "completed") {
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            if (now >= start && now <= end) {
                effectiveStatus = "active";
            } else if (now > end) {
                effectiveStatus = "completed";
            } else {
                effectiveStatus = "scheduled";
            }
        }

        return {
            ...session,
            status: effectiveStatus,
            targetIds: Array.isArray(targetIds) ? targetIds : []
        };
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
    const user = await requireAuth(["admin", "teacher"]);
    const body = await req.json();
    const {
        templateId,
        sessionName,
        startTime,
        endTime,
        targetType,
        targetIds,
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

    const userId = user.id;


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
