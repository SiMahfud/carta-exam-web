import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

// GET /api/grading/stats - Get grading statistics
export async function GET() {
    try {
        // Get counts for each grading status
        const stats = await db.select({
            status: submissions.gradingStatus,
            count: sql<number>`count(*)`,
        })
            .from(submissions)
            .groupBy(submissions.gradingStatus);

        // Transform into a more usable format
        const statusCounts: Record<string, number> = {};
        stats.forEach((stat: typeof stats[0]) => {
            if (stat.status) {
                statusCounts[stat.status] = Number(stat.count);
            }
        });

        // Calculate totals
        const pendingCount = statusCounts["pending_manual"] || 0;
        const completedCount = statusCounts["completed"] || 0;
        const publishedCount = statusCounts["published"] || 0;
        const autoGradedCount = statusCounts["auto"] || 0;
        const totalSubmissions = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

        // Estimated average grading time (3 minutes per submission)
        const avgGradingTime = 3;

        return NextResponse.json({
            pendingCount,
            completedCount,
            publishedCount,
            autoGradedCount,
            totalSubmissions,
            avgGradingTime,
        });
    } catch (error) {
        console.error("Error fetching grading stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch statistics" },
            { status: 500 }
        );
    }
}
