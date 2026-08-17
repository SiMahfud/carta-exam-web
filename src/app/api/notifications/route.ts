import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { examSessions, submissions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export interface AppNotification {
    id: string;
    title: string;
    description: string;
    type: "exam" | "grading" | "info" | "warning";
    timestamp: number;
    read: boolean;
    link?: string;
}

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ notifications: [], unreadCount: 0 });
        }

        const notifications: AppNotification[] = [];

        if (user.role === "student") {
            // Check active or upcoming exams
            const activeSessions = await (db as any)
                .select({
                    id: examSessions.id,
                    name: examSessions.sessionName,
                    startTime: examSessions.startTime,
                    status: examSessions.status,
                })
                .from(examSessions)
                .where(eq(examSessions.status, "active"))
                .limit(5);

            activeSessions.forEach((s: any) => {
                notifications.push({
                    id: `active-session-${s.id}`,
                    title: "Ujian Sedang Berlangsung",
                    description: `Sesi "${s.name}" siap dikerjakan sekarang.`,
                    type: "exam",
                    timestamp: Number(s.startTime) || Date.now(),
                    read: false,
                    link: `/student/exams`,
                });
            });

            // Check recently published exam results
            const publishedSubmissions = await (db as any)
                .select({
                    id: submissions.id,
                    sessionId: submissions.sessionId,
                    score: submissions.score,
                    sessionName: examSessions.sessionName,
                })
                .from(submissions)
                .innerJoin(examSessions, eq(submissions.sessionId, examSessions.id))
                .where(
                    and(
                        eq(submissions.userId, user.id),
                        eq(submissions.gradingStatus, "published")
                    )
                )
                .limit(3);

            publishedSubmissions.forEach((sub: any) => {
                notifications.push({
                    id: `result-${sub.id}`,
                    title: "Hasil Ujian Dipublikasi",
                    description: `Nilai Anda untuk "${sub.sessionName}" adalah ${sub.score}.`,
                    type: "grading",
                    timestamp: Date.now(),
                    read: false,
                    link: `/student/exams/${sub.sessionId}/review`,
                });
            });
        } else {
            // Teacher / Admin notifications: Pending submissions to grade
            const pendingGrading = await (db as any)
                .select({
                    count: examSessions.id,
                    sessionName: examSessions.sessionName,
                    sessionId: examSessions.id,
                })
                .from(submissions)
                .innerJoin(examSessions, eq(submissions.sessionId, examSessions.id))
                .where(eq(submissions.gradingStatus, "pending_manual"))
                .limit(5);

            if (pendingGrading.length > 0) {
                notifications.push({
                    id: "pending-grading-alert",
                    title: "Ujian Perlu Dinilai",
                    description: `Ada ${pendingGrading.length} lembar jawaban siswa yang siap diperiksa dan dinilai.`,
                    type: "grading",
                    timestamp: Date.now(),
                    read: false,
                    link: "/admin/grading",
                });
            }

            // Active sessions alert
            const liveSessions = await (db as any)
                .select({
                    id: examSessions.id,
                    name: examSessions.sessionName,
                })
                .from(examSessions)
                .where(eq(examSessions.status, "active"))
                .limit(3);

            liveSessions.forEach((ls: any) => {
                notifications.push({
                    id: `live-admin-${ls.id}`,
                    title: "Sesi Ujian Aktif",
                    description: `Sesi "${ls.name}" sedang berlangsung dan dipantau.`,
                    type: "exam",
                    timestamp: Date.now(),
                    read: false,
                    link: `/admin/exam-sessions/${ls.id}`,
                });
            });
        }

        return NextResponse.json({
            notifications,
            unreadCount: notifications.length,
            userId: user.id,
        });
    } catch (err: any) {
        console.error("Error in notifications API:", err);
        return NextResponse.json({ notifications: [], unreadCount: 0, userId: null });
    }
}
