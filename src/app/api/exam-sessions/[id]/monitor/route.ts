import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examSessions, users, classStudents, submissions, classes } from "@/lib/schema";
import { eq, inArray, and } from "drizzle-orm";

// GET /api/exam-sessions/[id]/monitor - Get monitoring data
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Get session info
        const sessionResult = await db.select()
            .from(examSessions)
            .where(eq(examSessions.id, params.id))
            .limit(1);

        if (sessionResult.length === 0) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
        const session = sessionResult[0];

        // 2. Get assigned students
        let students: any[] = [];
        const targetIds = session.targetIds as string[];

        if (session.targetType === 'class') {
            // Fetch students from classes
            const classStudentsResult = await db.select({
                studentId: classStudents.studentId,
                studentName: users.name,
                className: classes.name
            })
                .from(classStudents)
                .innerJoin(users, eq(classStudents.studentId, users.id))
                .innerJoin(classes, eq(classStudents.classId, classes.id))
                .where(inArray(classStudents.classId, targetIds));

            students = classStudentsResult.map((s: typeof classStudentsResult[0]) => ({
                id: s.studentId,
                name: s.studentName,
                className: s.className
            }));
        } else {
            // Fetch individual students
            const usersResult = await db.select({
                id: users.id,
                name: users.name
            })
                .from(users)
                .where(inArray(users.id, targetIds));

            students = usersResult.map((s: typeof usersResult[0]) => ({
                id: s.id,
                name: s.name,
                className: "Individual"
            }));
        }

        // 3. Get submissions status
        const submissionsResult = await db.select()
            .from(submissions)
            .where(eq(submissions.sessionId, session.id));

        // 4. Map status to students
        const studentProgress = students.map((student: typeof students[0]) => {
            const submission = submissionsResult.find((s: typeof submissionsResult[0]) => s.userId === student.id);

            let status = "not_started";
            let score = null;
            let startTime = null;
            let endTime = null;
            let violationCount = 0;

            if (submission) {
                status = submission.status || "in_progress";
                score = submission.score;
                startTime = submission.startTime;
                endTime = submission.endTime;
                violationCount = submission.violationCount || 0;
            }

            return {
                ...student,
                status,
                score,
                startTime,
                endTime,
                violationCount
            };
        });

        // 5. Aggregate stats
        const stats = {
            total: students.length,
            notStarted: studentProgress.filter((s: typeof studentProgress[0]) => s.status === "not_started").length,
            inProgress: studentProgress.filter((s: typeof studentProgress[0]) => s.status === "in_progress").length,
            completed: studentProgress.filter((s: typeof studentProgress[0]) => s.status === "completed").length,
            violations: studentProgress.reduce((acc: number, curr: typeof studentProgress[0]) => acc + curr.violationCount, 0)
        };

        return NextResponse.json({
            session: {
                id: session.id,
                name: session.sessionName,
                status: session.status,
                startTime: session.startTime,
                endTime: session.endTime,
            },
            stats,
            students: studentProgress
        });

    } catch (error) {
        console.error("Error monitoring session:", error);
        return NextResponse.json(
            { error: "Failed to fetch monitoring data" },
            { status: 500 }
        );
    }
}
