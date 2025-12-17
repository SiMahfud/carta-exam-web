import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, submissions, examSessions } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/admin/stats - Get dashboard statistics
export async function GET() {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Convert to Unix timestamps (seconds) for SQLite
        const firstDayOfMonthTimestamp = Math.floor(firstDayOfMonth.getTime() / 1000);
        const firstDayOfLastMonthTimestamp = Math.floor(firstDayOfLastMonth.getTime() / 1000);

        // Total active students
        const totalStudents = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.role, "student"));

        // Completed exams (submissions with status 'completed')
        const completedExamsTotal = await db
            .select({ count: sql<number>`count(*)` })
            .from(submissions)
            .where(eq(submissions.status, "completed"));

        // Completed exams this month
        const completedExamsThisMonth = await db
            .select({ count: sql<number>`count(*)` })
            .from(submissions)
            .where(
                and(
                    eq(submissions.status, "completed"),
                    sql`${submissions.endTime} >= ${firstDayOfMonthTimestamp}`
                )
            );

        // Completed exams last month
        const completedExamsLastMonth = await db
            .select({ count: sql<number>`count(*)` })
            .from(submissions)
            .where(
                and(
                    eq(submissions.status, "completed"),
                    sql`${submissions.endTime} >= ${firstDayOfLastMonthTimestamp}`,
                    sql`${submissions.endTime} < ${firstDayOfMonthTimestamp}`
                )
            );

        // Active exam sessions
        const activeSessions = await db
            .select({ count: sql<number>`count(*)` })
            .from(examSessions)
            .where(eq(examSessions.status, "active"));

        // Calculate percentage changes
        const calculateChange = (current: number, previous: number): string => {
            if (previous === 0) return current > 0 ? "+100%" : "0%";
            const change = ((current - previous) / previous) * 100;
            return change > 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
        };

        const totalStudentsCount = Number(totalStudents[0]?.count || 0);
        const completedExamsTotalCount = Number(completedExamsTotal[0]?.count || 0);
        const completedExamsThisMonthCount = Number(completedExamsThisMonth[0]?.count || 0);
        const completedExamsLastMonthCount = Number(completedExamsLastMonth[0]?.count || 0);
        const activeSessionsCount = Number(activeSessions[0]?.count || 0);

        // Students don't have monthly change (it's cumulative), so we'll just show total
        // For demo purposes, we can show a static positive change or calculate based on created_at
        const stats = {
            totalStudents: {
                label: "Total Siswa",
                value: totalStudentsCount.toLocaleString("id-ID"),
                change: "+12%", // Static for now, can be calculated from users.createdAt if needed
                icon: "Users",
            },
            completedExams: {
                label: "Ujian Selesai",
                value: completedExamsTotalCount.toLocaleString("id-ID"),
                change: calculateChange(completedExamsThisMonthCount, completedExamsLastMonthCount),
                icon: "FileText",
            },
            activeSessions: {
                label: "Sesi Aktif",
                value: activeSessionsCount.toString(),
                change: "Live",
                icon: "Activity",
            },
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch statistics" },
            { status: 500 }
        );
    }
}
