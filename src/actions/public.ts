"use server";

import { db } from "@/lib/db";
import { examSessions, classes, subjects, examTemplates } from "@/lib/schema";
import { and, eq, gte, asc, or } from "drizzle-orm";

export interface PublicExamSession {
    id: string;
    sessionName: string;
    subjectName: string;
    startTime: Date;
    endTime: Date;
    status: "scheduled" | "active" | "completed" | "cancelled";
    className?: string; // If targetType is class
}

export async function getPublicExamSchedule(): Promise<PublicExamSession[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get sessions for today and future
    // We limit to e.g. next 7 days for relevance? Or just today + future.
    // Let's just get today's sessions and future scheduled ones (limit 10)

    const sessions = await db.select({
        id: examSessions.id,
        sessionName: examSessions.sessionName,
        subjectName: subjects.name,
        startTime: examSessions.startTime,
        endTime: examSessions.endTime,
        status: examSessions.status,
        targetIds: examSessions.targetIds,
        targetType: examSessions.targetType,
    })
        .from(examSessions)
        .leftJoin(examTemplates, eq(examSessions.templateId, examTemplates.id))
        .leftJoin(subjects, eq(examTemplates.subjectId, subjects.id))
        .where(
            or(
                // Active sessions
                eq(examSessions.status, "active"),
                // Scheduled sessions for today or future
                and(
                    eq(examSessions.status, "scheduled"),
                    gte(examSessions.startTime, todayStart)
                )
            )
        )
        .orderBy(asc(examSessions.startTime))
        .limit(10);

    // We need to fetch class names for the targetIds if targetType is class
    // This is a bit tricky since targetIds is a JSON array of strings

    // Optimized approach: Collect all class IDs needed
    const classIdsToFetch = new Set<string>();

    sessions.forEach(session => {
        if (session.targetType === "class" && Array.isArray(session.targetIds)) {
            session.targetIds.forEach((id: string) => classIdsToFetch.add(id));
        }
    });

    const classMap = new Map<string, string>();
    if (classIdsToFetch.size > 0) {
        const classList = await db.select({ id: classes.id, name: classes.name })
            .from(classes)
            .where(or(...Array.from(classIdsToFetch).map(id => eq(classes.id, id))));

        classList.forEach(c => classMap.set(c.id, c.name));
    }

    return sessions.map(session => {
        let className: string | undefined = undefined;
        if (session.targetType === "class" && Array.isArray(session.targetIds)) {
            const names = session.targetIds
                .map((id: string) => classMap.get(id))
                .filter(Boolean);
            if (names.length > 0) {
                // If too many classes, truncate
                if (names.length > 3) {
                    className = `${names.slice(0, 3).join(", ")} +${names.length - 3}`;
                } else {
                    className = names.join(", ");
                }
            }
        }

        return {
            id: session.id,
            sessionName: session.sessionName,
            subjectName: session.subjectName || "Unknown Subject",
            startTime: session.startTime,
            endTime: session.endTime,
            status: session.status as any,
            className: className || (session.targetType === "individual" ? "Individual" : "All Classes")
        };
    });
}
