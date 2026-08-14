import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submissions, examSessions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { ActivityLogger } from "@/lib/activity-logger";
import { publishProctorActionEvent } from "@/lib/proctoring-events";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(["admin", "teacher"]);
        const body = await req.json();
        const { studentId, action } = body;

        if (!studentId || !action) {
            return NextResponse.json(
                { error: "studentId dan action wajib disertakan" },
                { status: 400 }
            );
        }

        const session = await (db as any)
            .select()
            .from(examSessions)
            .where(eq(examSessions.id, params.id))
            .limit(1);

        if (session.length === 0) {
            return NextResponse.json({ error: "Sesi ujian tidak ditemukan" }, { status: 404 });
        }

        const studentSubmission = await (db as any)
            .select()
            .from(submissions)
            .where(
                and(
                    eq(submissions.sessionId, params.id),
                    eq(submissions.userId, studentId)
                )
            )
            .limit(1);

        if (studentSubmission.length === 0) {
            return NextResponse.json(
                { error: "Data pengerjaan siswa tidak ditemukan" },
                { status: 404 }
            );
        }

        const sub = studentSubmission[0];

        if (action === "reset_violations") {
            await (db as any)
                .update(submissions)
                .set({ violationCount: 0 })
                .where(eq(submissions.id, sub.id));

            await ActivityLogger.examSession.updated(
                user.id,
                params.id,
                `Reset pelanggaran siswa ID: ${studentId}`
            );

            try {
                publishProctorActionEvent(params.id, user.id, "reset_violations", studentId, "Jumlah pelanggaran direset ke 0");
            } catch (e) {
                console.error("Error publishing proctor action event:", e);
            }

            return NextResponse.json({
                success: true,
                message: "Jumlah pelanggaran berhasil direset ke 0.",
            });
        }

        if (action === "unlock_session") {
            await (db as any)
                .update(submissions)
                .set({
                    status: "in_progress",
                    violationCount: Math.min(sub.violationCount || 0, 1),
                })
                .where(eq(submissions.id, sub.id));

            await ActivityLogger.examSession.updated(
                user.id,
                params.id,
                `Membuka kembali kunci ujian siswa ID: ${studentId}`
            );

            try {
                publishProctorActionEvent(params.id, user.id, "unlock_session", studentId, "Sesi ujian dibuka kembali");
            } catch (e) {
                console.error("Error publishing proctor action event:", e);
            }

            return NextResponse.json({
                success: true,
                message: "Sesi ujian siswa berhasil dibuka kembali.",
            });
        }

        if (action === "reset_device") {
            await (db as any)
                .update(submissions)
                .set({ deviceId: null })
                .where(eq(submissions.id, sub.id));

            await ActivityLogger.examSession.updated(
                user.id,
                params.id,
                `Reset penguncian perangkat siswa ID: ${studentId}`
            );

            try {
                publishProctorActionEvent(params.id, user.id, "reset_device", studentId, "Penguncian perangkat direset");
            } catch (e) {
                console.error("Error publishing proctor action event:", e);
            }

            return NextResponse.json({
                success: true,
                message: "Kunci perangkat berhasil direset. Siswa dapat login dari perangkat baru.",
            });
        }

        if (action === "force_submit") {
            const now = Math.floor(Date.now() / 1000);
            await (db as any)
                .update(submissions)
                .set({
                    status: "completed",
                    endTime: now,
                })
                .where(eq(submissions.id, sub.id));

            await ActivityLogger.examSession.updated(
                user.id,
                params.id,
                `Pengawas mengumpulkan paksa ujian siswa ID: ${studentId}`
            );

            try {
                publishProctorActionEvent(params.id, user.id, "force_submit", studentId, "Ujian dikumpulkan paksa oleh pengawas");
            } catch (e) {
                console.error("Error publishing proctor action event:", e);
            }

            return NextResponse.json({
                success: true,
                message: "Ujian siswa berhasil dikumpulkan oleh pengawas.",
            });
        }

        return NextResponse.json({ error: "Action tidak dikenal" }, { status: 400 });
    } catch (err: any) {
        console.error("Proctoring action error:", err);
        return NextResponse.json(
            { error: err.message || "Gagal menjalankan aksi pengawas" },
            { status: err.status || 500 }
        );
    }
}
