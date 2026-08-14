import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activityLogs, users } from "@/lib/schema";
import { desc, sql, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/admin/activities - Get activity logs with filters
export async function GET(request: Request) {
    try {
        await requireAuth(["admin", "teacher"]);

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const entityTypeFilter = searchParams.get("entityType");

        let query = (db as any)
            .select({
                id: activityLogs.id,
                action: activityLogs.action,
                entityType: activityLogs.entityType,
                entityId: activityLogs.entityId,
                details: activityLogs.details,
                createdAt: activityLogs.createdAt,
                userName: users.name,
                userRole: users.role,
            })
            .from(activityLogs)
            .leftJoin(users, sql`${activityLogs.userId} = ${users.id}`);

        if (entityTypeFilter && entityTypeFilter !== "all") {
            query = query.where(eq(activityLogs.entityType, entityTypeFilter));
        }

        const activities = await query
            .orderBy(desc(activityLogs.createdAt))
            .limit(limit);

        // Format activities for display
        const formattedActivities = activities.map((activity: typeof activities[0]) => {
            const details = (activity.details as Record<string, unknown>) || {};
            let description = "";
            let entityName = "";

            if (details.sessionName) entityName = String(details.sessionName);
            else if (details.bankName) entityName = String(details.bankName);
            else if (details.subjectName) entityName = String(details.subjectName);
            else if (details.className) entityName = String(details.className);
            else if (details.userName) entityName = String(details.userName);

            const actionTextMap: Record<string, string> = {
                created: "dibuat",
                updated: "diperbarui",
                deleted: "dihapus",
                started: "dimulai",
                completed: "diselesaikan",
            };
            const actionText = actionTextMap[activity.action as keyof typeof actionTextMap] || activity.action;

            const entityTypeTextMap: Record<string, string> = {
                exam_session: "Sesi Ujian",
                question_bank: "Bank Soal",
                subject: "Mata Pelajaran",
                class: "Kelas",
                user: "User",
                system: "Sistem",
            };
            const entityTypeText = entityTypeTextMap[activity.entityType as keyof typeof entityTypeTextMap] || activity.entityType;

            description = entityName
                ? `${entityTypeText} "${entityName}" ${actionText}`
                : `${entityTypeText} ${actionText}`;

            const now = new Date();
            const createdAt = new Date(activity.createdAt!);
            const diffMs = now.getTime() - createdAt.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            let timeAgo = "";
            if (diffMins < 1) timeAgo = "baru saja";
            else if (diffMins < 60) timeAgo = `${diffMins} menit yang lalu`;
            else if (diffHours < 24) timeAgo = `${diffHours} jam yang lalu`;
            else timeAgo = `${diffDays} hari yang lalu`;

            return {
                id: activity.id,
                description,
                timeAgo,
                createdAt: activity.createdAt,
                userName: activity.userName || "Sistem",
                userRole: activity.userRole || "system",
                action: activity.action,
                entityType: activity.entityType,
                details,
            };
        });

        return NextResponse.json(formattedActivities);
    } catch (error: any) {
        console.error("Error fetching activities:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch activities" },
            { status: error.status || 500 }
        );
    }
}
