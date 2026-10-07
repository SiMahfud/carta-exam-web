import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examSessions, users, classStudents, submissions, classes, answers, bankQuestions } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/exam-sessions/[id]/monitor - Get monitoring data
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(["admin", "teacher"]);

        // 1. Get session info
        const sessionResult = await db.select()
            .from(examSessions)
            .where(eq(examSessions.id, params.id))
            .limit(1);

        if (sessionResult.length === 0) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
        const session = sessionResult[0];

        if (user.role === "teacher" && session.createdBy !== user.id) {
            return NextResponse.json(
                { error: "Akses ditolak. Anda hanya dapat memantau sesi ujian yang Anda buat sendiri." },
                { status: 403 }
            );
        }

        // 2. Get assigned students
        let students: any[] = [];

        // Parse targetIds if it's a JSON string
        // Handle potential double-escaped strings like '"[\"class_10a\"]"'
        let targetIds: string[] = [];
        try {
            let parsed = session.targetIds;
            // Recursively parse if it's a string, up to 2 times to find the array
            if (typeof parsed === 'string') {
                try {
                    parsed = JSON.parse(parsed);
                } catch {
                    // if parse fails, keep as is
                }
            }
            if (typeof parsed === 'string') {
                try {
                    parsed = JSON.parse(parsed);
                } catch {
                    // if parse fails, keep as is
                }
            }

            if (Array.isArray(parsed)) {
                targetIds = parsed;
            } else {
                targetIds = [];
            }
        } catch {
            targetIds = [];
        }

        // Skip if no target IDs
        if (targetIds.length === 0) {
            return NextResponse.json({
                session: {
                    id: session.id,
                    name: session.sessionName,
                    status: session.status,
                    startTime: session.startTime,
                    endTime: session.endTime,
                },
                stats: { total: 0, notStarted: 0, inProgress: 0, completed: 0, violations: 0 },
                students: []
            });
        }

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

        // 3b. Calculate live temporary scores for in-progress submissions
        const inProgressSubmissions = submissionsResult.filter(
            (s: any) => (s.status || "in_progress") === "in_progress"
        );
        const inProgressSubmissionIds = inProgressSubmissions.map((s: any) => s.id);

        const answersBySubmission = new Map<
            string,
            { totalEarned: number; answeredCount: number; hasEssays: boolean }
        >();

        if (inProgressSubmissionIds.length > 0) {
            const inProgressAnswers = await db.select({
                submissionId: answers.submissionId,
                partialPoints: answers.partialPoints,
                score: answers.score,
                gradingStatus: answers.gradingStatus,
            })
                .from(answers)
                .where(inArray(answers.submissionId, inProgressSubmissionIds));

            for (const ans of inProgressAnswers) {
                const prev = answersBySubmission.get(ans.submissionId) || {
                    totalEarned: 0,
                    answeredCount: 0,
                    hasEssays: false,
                };
                const pts = ans.partialPoints !== null && ans.partialPoints !== undefined
                    ? ans.partialPoints
                    : (ans.score || 0);

                answersBySubmission.set(ans.submissionId, {
                    totalEarned: prev.totalEarned + pts,
                    answeredCount: prev.answeredCount + 1,
                    hasEssays: prev.hasEssays || ans.gradingStatus === "pending_manual",
                });
            }
        }

        // Helper to safely parse questionOrder which may be a JSON string or actual array
        const parseQuestionOrder = (raw: unknown): string[] => {
            if (Array.isArray(raw)) return raw;
            if (typeof raw === 'string') {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) return parsed;
                } catch {
                    // not valid JSON
                }
            }
            return [];
        };

        // Determine question points for submissions missing totalPoints
        const questionPointsMap = new Map<string, number>();
        const missingTotalPointsSubmissions = inProgressSubmissions.filter(
            (s: any) => !s.totalPoints || s.totalPoints <= 0
        );

        const questionIdsToFetch = new Set<string>();
        for (const s of missingTotalPointsSubmissions) {
            const qIds = parseQuestionOrder(s.questionOrder);
            for (const qId of qIds) {
                if (typeof qId === "string") {
                    questionIdsToFetch.add(qId);
                }
            }
        }

        if (questionIdsToFetch.size > 0) {
            const questionsList = await db.select({
                id: bankQuestions.id,
                defaultPoints: bankQuestions.defaultPoints,
            })
                .from(bankQuestions)
                .where(inArray(bankQuestions.id, Array.from(questionIdsToFetch)));

            for (const q of questionsList) {
                questionPointsMap.set(q.id, q.defaultPoints || 1);
            }
        }

        // 4. Map status to students
        const studentProgress = students.map((student: typeof students[0]) => {
            const submission = submissionsResult.find((s: typeof submissionsResult[0]) => s.userId === student.id);

            let status = "not_started";
            let score = null;
            let startTime = null;
            let endTime = null;
            let violationCount = 0;
            let isTemporaryScore = false;
            let answeredCount = 0;
            let totalQuestions = 0;
            let hasEssays = false;

            if (submission) {
                status = submission.status || "in_progress";
                startTime = submission.startTime;
                endTime = submission.endTime;
                violationCount = submission.violationCount || 0;

                const qIds = parseQuestionOrder(submission.questionOrder);
                totalQuestions = qIds.length;

                if (status === "in_progress") {
                    isTemporaryScore = true;
                    const ansData = answersBySubmission.get(submission.id) || {
                        totalEarned: 0,
                        answeredCount: 0,
                        hasEssays: false,
                    };
                    answeredCount = ansData.answeredCount;
                    hasEssays = ansData.hasEssays;

                    // Calculate max possible points
                    let totalMax = submission.totalPoints || 0;
                    if (!totalMax || totalMax <= 0) {
                        totalMax = qIds.reduce(
                            (sum: number, qId: string) => sum + (questionPointsMap.get(qId) || 1),
                            0
                        );
                    }

                    // Compute temporary score on scale 0-100
                    score = totalMax > 0 ? Math.round((ansData.totalEarned / totalMax) * 100) : 0;
                } else {
                    // Completed, graded, or terminated
                    score = submission.score;
                    answeredCount = totalQuestions;
                }
            }

            return {
                ...student,
                status,
                score,
                startTime,
                endTime,
                violationCount,
                isTemporaryScore,
                answeredCount,
                totalQuestions,
                hasEssays,
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
