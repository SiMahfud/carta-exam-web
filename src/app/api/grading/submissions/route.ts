import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, users, examSessions, examTemplates } from "@/lib/schema";
import { eq, or, desc, and, sql } from "drizzle-orm";

// GET /api/grading/submissions - List submissions needing grading
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const status = searchParams.get("status"); // pending_manual, completed, all
        const sessionId = searchParams.get("sessionId"); // Filter by session

        const offset = (page - 1) * limit;

        // Build where conditions
        const conditions = [];

        if (status && status !== "all") {
            conditions.push(eq(submissions.gradingStatus, status as any));
        }

        if (sessionId) {
            conditions.push(eq(submissions.sessionId, sessionId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const totalResult = await db.select({ count: sql<number>`count(*)` })
            .from(submissions)
            .where(whereClause);
        const total = Number(totalResult[0]?.count || 0);

        // Fetch submissions with related data
        const submissionsData = await db.select({
            id: submissions.id,
            sessionId: submissions.sessionId,
            userId: submissions.userId,
            studentName: users.name,
            sessionName: examSessions.sessionName,
            templateName: examTemplates.name,
            status: submissions.status,
            gradingStatus: submissions.gradingStatus,
            score: submissions.score,
            earnedPoints: submissions.earnedPoints,
            totalPoints: submissions.totalPoints,
            endTime: submissions.endTime,
            createdAt: submissions.createdAt,
        })
            .from(submissions)
            .innerJoin(users, eq(submissions.userId, users.id))
            .innerJoin(examSessions, eq(submissions.sessionId, examSessions.id))
            .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id))
            .where(whereClause)
            .orderBy(desc(submissions.createdAt))
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            data: submissionsData,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching submissions:", error);
        return NextResponse.json(
            { error: "Failed to fetch submissions" },
            { status: 500 }
        );
    }
}
