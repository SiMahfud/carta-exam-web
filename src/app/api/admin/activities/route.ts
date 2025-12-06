import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activityLogs, users } from "@/lib/schema";
import { desc, sql } from "drizzle-orm";

// GET /api/admin/activities - Get recent activity logs
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "10");

        // Fetch recent activities with user information
        const activities = await db
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
            .leftJoin(users, sql`${activityLogs.userId} = ${users.id}`)
            .orderBy(desc(activityLogs.createdAt))
            .limit(limit);

        // Format activities for display
        const formattedActivities = activities.map((activity: typeof activities[0]) => {
            const details = activity.details as Record<string, unknown> || {};
            let description = "";
            let entityName = "";

            // Extract entity name from details
            if (details.sessionName) entityName = details.sessionName as string;
            else if (details.bankName) entityName = details.bankName as string;
            else if (details.subjectName) entityName = details.subjectName as string;
            else if (details.className) entityName = details.className as string;
            else if (details.userName) entityName = details.userName as string;

            // Build description based on entity type and action
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
            };
            const entityTypeText = entityTypeTextMap[activity.entityType as keyof typeof entityTypeTextMap] || activity.entityType;

            description = `${entityTypeText} "${entityName}" ${actionText}`;

            // Calculate relative time
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
                userName: activity.userName || "Sistem",
                userRole: activity.userRole,
                action: activity.action,
                entityType: activity.entityType,
            };
        });

        return NextResponse.json(formattedActivities);
    } catch (error) {
        console.error("Error fetching activities:", error);
        return NextResponse.json(
            { error: "Failed to fetch activities" },
            { status: 500 }
        );
    }
}
