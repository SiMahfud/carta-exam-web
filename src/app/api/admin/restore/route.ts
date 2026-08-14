import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    subjects,
    classes,
    questionBanks,
    bankQuestions,
    examTemplates,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { ActivityLogger } from "@/lib/activity-logger";

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth(["admin"]);
        const body = await req.json();

        if (!body || !body.data || body.appName !== "CartaExam") {
            return NextResponse.json(
                { error: "Format file cadangan tidak valid atau bukan dari CartaExam." },
                { status: 400 }
            );
        }

        const { data } = body;
        let restoredCount = 0;

        // Restore subjects
        if (Array.isArray(data.subjects)) {
            for (const item of data.subjects) {
                const exists = await (db as any)
                    .select()
                    .from(subjects)
                    .where(eq(subjects.id, item.id))
                    .limit(1);

                if (exists.length === 0) {
                    await (db as any).insert(subjects).values(item);
                    restoredCount++;
                }
            }
        }

        // Restore classes
        if (Array.isArray(data.classes)) {
            for (const item of data.classes) {
                const exists = await (db as any)
                    .select()
                    .from(classes)
                    .where(eq(classes.id, item.id))
                    .limit(1);

                if (exists.length === 0) {
                    await (db as any).insert(classes).values(item);
                    restoredCount++;
                }
            }
        }

        // Restore question banks
        if (Array.isArray(data.questionBanks)) {
            for (const item of data.questionBanks) {
                const exists = await (db as any)
                    .select()
                    .from(questionBanks)
                    .where(eq(questionBanks.id, item.id))
                    .limit(1);

                if (exists.length === 0) {
                    await (db as any).insert(questionBanks).values(item);
                    restoredCount++;
                }
            }
        }

        // Restore bank questions
        if (Array.isArray(data.bankQuestions)) {
            for (const item of data.bankQuestions) {
                const exists = await (db as any)
                    .select()
                    .from(bankQuestions)
                    .where(eq(bankQuestions.id, item.id))
                    .limit(1);

                if (exists.length === 0) {
                    await (db as any).insert(bankQuestions).values(item);
                    restoredCount++;
                }
            }
        }

        // Restore exam templates
        if (Array.isArray(data.examTemplates)) {
            for (const item of data.examTemplates) {
                const exists = await (db as any)
                    .select()
                    .from(examTemplates)
                    .where(eq(examTemplates.id, item.id))
                    .limit(1);

                if (exists.length === 0) {
                    await (db as any).insert(examTemplates).values(item);
                    restoredCount++;
                }
            }
        }

        await ActivityLogger.system.updated(
            user.id,
            `Memulihkan ${restoredCount} entitas dari file cadangan.`
        );

        return NextResponse.json({
            success: true,
            message: `Pemulihan selesai. Sebanyak ${restoredCount} data baru berhasil dimasukkan.`,
            restoredCount,
        });
    } catch (err: any) {
        console.error("Restore error:", err);
        return NextResponse.json(
            { error: err.message || "Gagal memulihkan database" },
            { status: err.status || 500 }
        );
    }
}
