import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    submissions,
    examSessions,
    examTemplates,
    subjects,
    bankQuestions,
    users,
} from "@/lib/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/admin/analytics - Comprehensive exam and learning analytics
export async function GET() {
    try {
        await requireAuth(["admin", "teacher"]);

        // 1. Score Distribution (Completed submissions)
        const allCompletedSubmissions = await (db as any)
            .select({
                score: submissions.score,
            })
            .from(submissions)
            .where(eq(submissions.status, "completed"));

        const scoreDistribution = {
            poor: 0,       // 0 - 59 (< KKM)
            fair: 0,       // 60 - 74
            good: 0,       // 75 - 84
            excellent: 0,  // 85 - 100
            total: allCompletedSubmissions.length,
        };

        allCompletedSubmissions.forEach((sub: { score: number | null }) => {
            const score = sub.score ?? 0;
            if (score < 60) scoreDistribution.poor++;
            else if (score < 75) scoreDistribution.fair++;
            else if (score < 85) scoreDistribution.good++;
            else scoreDistribution.excellent++;
        });

        // 2. Question Types in Bank Questions
        const questionTypesCount = await (db as any)
            .select({
                type: bankQuestions.type,
                count: sql<number>`count(*)`,
            })
            .from(bankQuestions)
            .groupBy(bankQuestions.type);

        const typeLabels: Record<string, string> = {
            mc: "Pilihan Ganda",
            complex_mc: "PG Kompleks",
            matching: "Menjodohkan",
            short: "Isian Singkat",
            essay: "Uraian",
            true_false: "Benar/Salah",
        };

        const questionTypeDistribution = questionTypesCount.map((row: { type: string; count: number }) => ({
            type: row.type,
            label: typeLabels[row.type] || row.type,
            count: Number(row.count || 0),
        }));

        // 3. Subject Performance (Average score per subject)
        const subjectStats = await (db as any)
            .select({
                subjectId: subjects.id,
                subjectName: subjects.name,
                subjectCode: subjects.code,
                avgScore: sql<number>`avg(${submissions.score})`,
                submissionCount: sql<number>`count(${submissions.id})`,
            })
            .from(submissions)
            .innerJoin(examSessions, eq(submissions.sessionId, examSessions.id))
            .innerJoin(examTemplates, eq(examSessions.templateId, examTemplates.id))
            .innerJoin(subjects, eq(examTemplates.subjectId, subjects.id))
            .where(eq(submissions.status, "completed"))
            .groupBy(subjects.id, subjects.name, subjects.code);

        const subjectPerformance = subjectStats.map((item: { subjectId: string; subjectName: string; subjectCode: string | null; avgScore: number; submissionCount: number }) => ({
            id: item.subjectId,
            name: item.subjectName,
            code: item.subjectCode,
            avgScore: Math.round(Number(item.avgScore || 0) * 10) / 10,
            submissionCount: Number(item.submissionCount || 0),
        }));

        // 4. Recent Sessions Performance
        const recentSessions = await (db as any)
            .select({
                sessionId: examSessions.id,
                sessionName: examSessions.sessionName,
                status: examSessions.status,
                startTime: examSessions.startTime,
                avgScore: sql<number>`avg(${submissions.score})`,
                totalSubmissions: sql<number>`count(${submissions.id})`,
            })
            .from(examSessions)
            .leftJoin(submissions, and(
                eq(examSessions.id, submissions.sessionId),
                eq(submissions.status, "completed")
            ))
            .groupBy(examSessions.id, examSessions.sessionName, examSessions.status, examSessions.startTime)
            .orderBy(desc(examSessions.startTime))
            .limit(5);

        const recentSessionsFormatted = recentSessions.map((session: { sessionId: string; sessionName: string; status: string; startTime: number; avgScore: number | null; totalSubmissions: number }) => ({
            id: session.sessionId,
            name: session.sessionName,
            status: session.status,
            startTime: session.startTime,
            avgScore: session.avgScore ? Math.round(Number(session.avgScore) * 10) / 10 : 0,
            completedCount: Number(session.totalSubmissions || 0),
        }));

        // 5. Total System Totals
        const totalTeachers = await (db as any)
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.role, "teacher"));

        return NextResponse.json({
            scoreDistribution,
            questionTypeDistribution,
            subjectPerformance,
            recentSessions: recentSessionsFormatted,
            summary: {
                totalSubmissions: allCompletedSubmissions.length,
                totalTeachers: Number(totalTeachers[0]?.count || 0),
                averageSystemScore: allCompletedSubmissions.length > 0
                    ? Math.round(
                        (allCompletedSubmissions.reduce((acc: number, curr: { score: number | null }) => acc + (curr.score ?? 0), 0) /
                            allCompletedSubmissions.length) * 10
                    ) / 10
                    : 0,
            },
        });
    } catch (error: any) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch analytics" },
            { status: error.status || 500 }
        );
    }
}
