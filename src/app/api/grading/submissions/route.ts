import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, users, examSessions, examTemplates, classStudents } from "@/lib/schema";
import { eq, desc, asc, and, sql } from "drizzle-orm";

// GET /api/grading/submissions - List submissions needing grading
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const status = searchParams.get("status"); // pending_manual, completed, all
        const sessionId = searchParams.get("sessionId"); // Filter by session
        const search = searchParams.get("search"); // Search by student name
        const classId = searchParams.get("classId"); // Filter by class
        const orderBy = searchParams.get("orderBy") || "date"; // date, studentName, sessionName
        const order = searchParams.get("order") || "desc"; // asc, desc

        const offset = (page - 1) * limit;

        // Build where conditions
        const conditions = [];

        if (status && status !== "all") {
            conditions.push(eq(submissions.gradingStatus, status as any));
        }

        if (sessionId) {
            conditions.push(eq(submissions.sessionId, sessionId));
        }

        if (search) {
            conditions.push(sql`LOWER(${users.name}) LIKE LOWER(${'%' + search + '%'})`);
        }

        if (classId) {
            conditions.push(eq(classStudents.classId, classId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Determine order by clause
        let orderByClause;
        const orderFn = order === "asc" ? asc : desc;

        switch (orderBy) {
            case "studentName":
                orderByClause = orderFn(users.name);
                break;
            case "sessionName":
                orderByClause = orderFn(examSessions.sessionName);
                break;
            case "date":
            default:
                orderByClause = orderFn(submissions.createdAt);
                break;
        }

        // Build query - join with classStudents if needed for class filtering
        let query = db.select({
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
            .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id));

        // Add class join if filtering by class
        if (classId) {
            query = query.leftJoin(classStudents, eq(users.id, classStudents.studentId)) as any;
        }

        // Get total count
        const totalResult = await db.select({ count: sql<number>`count(DISTINCT ${submissions.id})` })
            .from(submissions)
            .innerJoin(users, eq(submissions.userId, users.id))
            .innerJoin(examSessions, eq(submissions.sessionId, examSessions.id))
            .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id))
            .$dynamic()
            .leftJoin(classStudents, classId ? eq(users.id, classStudents.studentId) : sql`1=0`)
            .where(whereClause);

        const total = Number(totalResult[0]?.count || 0);

        // Fetch submissions with related data
        const submissionsData = await query
            .where(whereClause)
            .orderBy(orderByClause)
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
