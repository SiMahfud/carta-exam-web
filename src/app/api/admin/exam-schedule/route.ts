import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examSessions, examTemplates, subjects, users, classes, submissions } from "@/lib/schema";
import { eq, and, lte, gte, inArray, sql, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export async function GET(req: Request) {
    try {
        const user = await requireAuth(["admin", "teacher"]);
        const { searchParams } = new URL(req.url);

        // Get date parameter or default to today in Jakarta time (UTC+7)
        let dateStr = searchParams.get("date");
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const nowJakarta = new Date(Date.now() + JAKARTA_OFFSET_MS);
            dateStr = nowJakarta.toISOString().slice(0, 10);
        }

        // Calculate start and end of that date in UTC+7 (Jakarta)
        // Example: "2026-11-17T00:00:00+07:00" -> UTC 2026-11-16T17:00:00.000Z
        const startOfDay = new Date(`${dateStr}T00:00:00+07:00`);
        const endOfDay = new Date(`${dateStr}T23:59:59.999+07:00`);

        if (isNaN(startOfDay.getTime()) || isNaN(endOfDay.getTime())) {
            return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
        }

        // Build conditions
        const conditions = [
            lte(examSessions.startTime, endOfDay),
            gte(examSessions.endTime, startOfDay)
        ];

        // If teacher, only show sessions created by this teacher
        if (user.role === "teacher") {
            conditions.push(eq(examSessions.createdBy, user.id));
        }

        // Fetch sessions matching the date
        const rawSessions = await db.select({
            id: examSessions.id,
            sessionName: examSessions.sessionName,
            status: examSessions.status,
            startTime: examSessions.startTime,
            endTime: examSessions.endTime,
            targetType: examSessions.targetType,
            targetIds: examSessions.targetIds,
            accessToken: examSessions.accessToken,
            createdAt: examSessions.createdAt,
            createdBy: examSessions.createdBy,
            templateId: examSessions.templateId,
            templateName: examTemplates.name,
            requireToken: examTemplates.requireToken,
            durationMinutes: examTemplates.durationMinutes,
            subjectId: examTemplates.subjectId,
            subjectName: subjects.name,
            subjectCode: subjects.code,
            creatorName: users.name,
        })
            .from(examSessions)
            .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id))
            .leftJoin(subjects, eq(examTemplates.subjectId, subjects.id))
            .leftJoin(users, eq(examSessions.createdBy, users.id))
            .where(and(...conditions))
            .orderBy(asc(examSessions.startTime));

        if (rawSessions.length === 0) {
            return NextResponse.json({
                date: dateStr,
                summary: {
                    total: 0,
                    active: 0,
                    scheduled: 0,
                    completed: 0,
                },
                sessions: [],
            });
        }

        // Collect all class IDs and session IDs
        const sessionIds = rawSessions.map((s: typeof rawSessions[0]) => s.id);
        const classIdSet = new Set<string>();

        const parsedSessions = rawSessions.map((s: typeof rawSessions[0]) => {
            let targets: string[] = [];
            if (typeof s.targetIds === "string") {
                try {
                    const parsed = JSON.parse(s.targetIds);
                    if (Array.isArray(parsed)) {
                        targets = parsed;
                    } else if (typeof parsed === "string") {
                        try {
                            const parsed2 = JSON.parse(parsed);
                            if (Array.isArray(parsed2)) targets = parsed2;
                        } catch {}
                    }
                } catch {
                    targets = [];
                }
            } else if (Array.isArray(s.targetIds)) {
                targets = s.targetIds;
            }

            if (s.targetType === "class") {
                targets.forEach((id: string) => {
                    if (id) classIdSet.add(id);
                });
            }

            return {
                ...s,
                parsedTargetIds: targets,
            };
        });

        // Fetch class names in batch
        const classMap = new Map<string, string>();
        if (classIdSet.size > 0) {
            const classRows = await db.select({
                id: classes.id,
                name: classes.name,
            })
                .from(classes)
                .where(inArray(classes.id, Array.from(classIdSet)));

            classRows.forEach((c: { id: string; name: string }) => {
                classMap.set(c.id, c.name);
            });
        }

        // Fetch submission statistics in batch
        const submissionStatsMap = new Map<string, { total: number; inProgress: number; completed: number }>();
        if (sessionIds.length > 0) {
            const subCounts = await db.select({
                sessionId: submissions.sessionId,
                total: sql<number>`count(*)`,
                inProgress: sql<number>`sum(case when ${submissions.status} = 'in_progress' then 1 else 0 end)`,
                completed: sql<number>`sum(case when ${submissions.status} = 'completed' then 1 else 0 end)`,
            })
                .from(submissions)
                .where(inArray(submissions.sessionId, sessionIds))
                .groupBy(submissions.sessionId);

            subCounts.forEach((sc: { sessionId: string | null; total: number; inProgress: number; completed: number }) => {
                if (sc.sessionId) {
                    submissionStatsMap.set(sc.sessionId, {
                        total: Number(sc.total) || 0,
                        inProgress: Number(sc.inProgress) || 0,
                        completed: Number(sc.completed) || 0,
                    });
                }
            });
        }

        const now = new Date();
        let totalActive = 0;
        let totalScheduled = 0;
        let totalCompleted = 0;

        const formattedSessions = parsedSessions.map((s: typeof parsedSessions[0]) => {
            const start = new Date(s.startTime);
            const end = new Date(s.endTime);

            // Determine effective live status
            let effectiveStatus: "active" | "scheduled" | "completed" | "cancelled" = s.status as any;
            if (s.status !== "cancelled") {
                if (now >= start && now <= end) {
                    effectiveStatus = "active";
                } else if (now > end) {
                    effectiveStatus = "completed";
                } else {
                    effectiveStatus = "scheduled";
                }
            }

            if (effectiveStatus === "active") totalActive++;
            else if (effectiveStatus === "scheduled") totalScheduled++;
            else if (effectiveStatus === "completed") totalCompleted++;

            const targetNames: string[] = [];
            if (s.targetType === "class") {
                s.parsedTargetIds.forEach((id: string) => {
                    const name = classMap.get(id);
                    if (name) targetNames.push(name);
                });
            }

            const subStats = submissionStatsMap.get(s.id) || { total: 0, inProgress: 0, completed: 0 };

            return {
                id: s.id,
                sessionName: s.sessionName,
                status: s.status,
                effectiveStatus,
                startTime: s.startTime,
                endTime: s.endTime,
                durationMinutes: s.durationMinutes,
                templateId: s.templateId,
                templateName: s.templateName,
                subjectName: s.subjectName || "Umum",
                subjectCode: s.subjectCode || null,
                creatorName: s.creatorName || null,
                requireToken: Boolean(s.requireToken),
                accessToken: s.accessToken,
                targetType: s.targetType,
                targetCount: s.parsedTargetIds.length,
                targetNames,
                submissions: subStats,
            };
        });

        return NextResponse.json({
            date: dateStr,
            summary: {
                total: formattedSessions.length,
                active: totalActive,
                scheduled: totalScheduled,
                completed: totalCompleted,
            },
            sessions: formattedSessions,
        });
    } catch (error: any) {
        console.error("Error fetching exam schedule:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch exam schedule" },
            { status: error.status || 500 }
        );
    }
}
