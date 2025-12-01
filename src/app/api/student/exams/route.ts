import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examSessions, examTemplates, classStudents, submissions } from "@/lib/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

// GET /api/student/exams - List exams assigned to current student
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get("studentId"); // TODO: Get from auth session
        const status = searchParams.get("status"); // upcoming, active, completed

        if (!studentId) {
            return NextResponse.json(
                { error: "Student ID required" },
                { status: 400 }
            );
        }

        // Get student's classes
        const studentClasses = await db.select({ classId: classStudents.classId })
            .from(classStudents)
            .where(eq(classStudents.studentId, studentId));

        const classIds = studentClasses.map(c => c.classId);

        if (classIds.length === 0) {
            return NextResponse.json({ data: [] });
        }

        // Get sessions where student's class is targeted
        let sessionsQuery = db.select({
            id: examSessions.id,
            sessionName: examSessions.sessionName,
            status: examSessions.status,
            startTime: examSessions.startTime,
            endTime: examSessions.endTime,
            targetIds: examSessions.targetIds,
            templateName: examTemplates.name,
            subjectName: sql<string>`subjects.name`,
            durationMinutes: examTemplates.durationMinutes,
            totalScore: examTemplates.totalScore,
        })
            .from(examSessions)
            .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id))
            .innerJoin(sql`subjects`, eq(examTemplates.subjectId, sql`subjects.id`))
            .where(eq(examSessions.targetType, "class"));

        const allSessions = await sessionsQuery;

        // Filter sessions where student's class is in targetIds
        const assignedSessions = allSessions.filter(session => {
            const targetIds = session.targetIds as any as string[];
            return targetIds && targetIds.some(id => classIds.includes(id));
        });

        // Get student's submissions
        const studentSubmissions = await db.select()
            .from(submissions)
            .where(eq(submissions.userId, studentId));

        // Enhance sessions with submission status
        const now = new Date();
        const enhancedSessions = assignedSessions.map(session => {
            const submission = studentSubmissions.find(s => s.sessionId === session.id);

            let examStatus = "upcoming";
            const startTime = new Date(session.startTime);
            const endTime = new Date(session.endTime);

            if (submission) {
                examStatus = submission.status === "completed" ? "completed" : "in_progress";
            } else if (now >= startTime && now <= endTime) {
                examStatus = "active";
            } else if (now > endTime) {
                examStatus = "expired";
            }

            return {
                ...session,
                examStatus,
                hasSubmission: !!submission,
                submissionId: submission?.id,
                score: submission?.score,
            };
        });

        // Filter by status if provided
        const filteredSessions = status && status !== "all"
            ? enhancedSessions.filter(s => s.examStatus === status)
            : enhancedSessions;

        return NextResponse.json({ data: filteredSessions });
    } catch (error) {
        console.error("Error fetching student exams:", error);
        return NextResponse.json(
            { error: "Failed to fetch exams" },
            { status: 500 }
        );
    }
}
