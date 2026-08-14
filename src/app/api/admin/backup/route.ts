import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    subjects,
    classes,
    questionBanks,
    bankQuestions,
    examTemplates,
    settings,
    users,
} from "@/lib/schema";
import { requireAuth } from "@/lib/auth-guard";

export async function GET() {
    try {
        const user = await requireAuth(["admin"]);

        const allSubjects = await (db as any).select().from(subjects);
        const allClasses = await (db as any).select().from(classes);
        const allBanks = await (db as any).select().from(questionBanks);
        const allQuestions = await (db as any).select().from(bankQuestions);
        const allTemplates = await (db as any).select().from(examTemplates);
        const allSettings = await (db as any).select().from(settings);
        const allUsers = await (db as any)
            .select({
                id: users.id,
                name: users.name,
                username: users.username,
                role: users.role,
                createdAt: users.createdAt,
            })
            .from(users);

        const backupPayload = {
            version: "1.0.0",
            appName: "CartaExam",
            exportedAt: new Date().toISOString(),
            exportedBy: user.name || user.id,
            data: {
                subjects: allSubjects,
                classes: allClasses,
                questionBanks: allBanks,
                bankQuestions: allQuestions,
                examTemplates: allTemplates,
                settings: allSettings,
                users: allUsers,
            },
        };

        const filename = `carta-exam-backup-${new Date().toISOString().slice(0, 10)}.json`;

        return new NextResponse(JSON.stringify(backupPayload, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (err: any) {
        console.error("Backup error:", err);
        return NextResponse.json(
            { error: err.message || "Gagal membuat cadangan database" },
            { status: err.status || 500 }
        );
    }
}
