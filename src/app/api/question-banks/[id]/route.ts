import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { questionBanks, bankQuestions, subjects } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { deleteQuestionImages } from "@/lib/image-processor";

// GET /api/question-banks/[id] - Get question bank with statistics
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(["admin", "teacher"]);
        const bank = await db.select()
            .from(questionBanks)
            .where(eq(questionBanks.id, params.id))
            .limit(1);

        if (bank.length === 0) {
            return NextResponse.json(
                { error: "Question bank not found" },
                { status: 404 }
            );
        }

        let subjectName: string | null = null;
        if (bank[0].subjectId) {
            try {
                const subj = await db.select({ name: subjects.name })
                    .from(subjects)
                    .where(eq(subjects.id, bank[0].subjectId))
                    .limit(1);
                if (subj.length > 0) {
                    subjectName = subj[0].name;
                }
            } catch {
                // In testing or standalone query without subject
            }
        }

        // Get question statistics
        const stats = await db.select({
            total: sql<number>`COUNT(*)`,
            mc: sql<number>`SUM(CASE WHEN ${bankQuestions.type} = 'mc' THEN 1 ELSE 0 END)`,
            complex_mc: sql<number>`SUM(CASE WHEN ${bankQuestions.type} = 'complex_mc' THEN 1 ELSE 0 END)`,
            matching: sql<number>`SUM(CASE WHEN ${bankQuestions.type} = 'matching' THEN 1 ELSE 0 END)`,
            short: sql<number>`SUM(CASE WHEN ${bankQuestions.type} = 'short' THEN 1 ELSE 0 END)`,
            essay: sql<number>`SUM(CASE WHEN ${bankQuestions.type} = 'essay' THEN 1 ELSE 0 END)`,
            true_false: sql<number>`SUM(CASE WHEN ${bankQuestions.type} = 'true_false' THEN 1 ELSE 0 END)`,
            easy: sql<number>`SUM(CASE WHEN ${bankQuestions.difficulty} = 'easy' THEN 1 ELSE 0 END)`,
            medium: sql<number>`SUM(CASE WHEN ${bankQuestions.difficulty} = 'medium' THEN 1 ELSE 0 END)`,
            hard: sql<number>`SUM(CASE WHEN ${bankQuestions.difficulty} = 'hard' THEN 1 ELSE 0 END)`,
        })
            .from(bankQuestions)
            .where(eq(bankQuestions.bankId, params.id));

        return NextResponse.json({
            ...bank[0],
            subjectName,
            canEdit: user.role === "admin" || bank[0].createdBy === user.id,
            isOwner: bank[0].createdBy === user.id,
            statistics: stats[0],
        });
    } catch (error) {
        console.error("Error fetching question bank:", error);
        return NextResponse.json(
            { error: "Failed to fetch question bank" },
            { status: 500 }
        );
    }
}

// PUT /api/question-banks/[id] - Update question bank
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(["admin", "teacher"]);
        const body = await request.json();
        const { name, description, subjectId } = body;

        const existing = await db.select().from(questionBanks).where(eq(questionBanks.id, params.id)).limit(1);
        if (existing.length === 0) {
            return NextResponse.json(
                { error: "Question bank not found" },
                { status: 404 }
            );
        }

        // Only owner or admin can update
        if (user.role === "teacher" && existing[0].createdBy !== user.id) {
            return NextResponse.json(
                { error: "Akses ditolak. Anda hanya dapat mengubah bank soal milik Anda sendiri." },
                { status: 403 }
            );
        }

        const updateData: Record<string, any> = {
            updatedAt: new Date(),
        };
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (subjectId !== undefined) updateData.subjectId = subjectId;

        await db.update(questionBanks)
            .set(updateData)
            .where(eq(questionBanks.id, params.id));

        const updated = await db.select()
            .from(questionBanks)
            .where(eq(questionBanks.id, params.id))
            .limit(1);

        let subjectName: string | null = null;
        if (updated[0]?.subjectId) {
            try {
                const subj = await db.select({ name: subjects.name })
                    .from(subjects)
                    .where(eq(subjects.id, updated[0].subjectId))
                    .limit(1);
                if (subj.length > 0) {
                    subjectName = subj[0].name;
                }
            } catch {
                // In testing or standalone query without subject
            }
        }

        return NextResponse.json({
            ...updated[0],
            subjectName,
            canEdit: user.role === "admin" || updated[0].createdBy === user.id,
            isOwner: updated[0].createdBy === user.id,
        });
    } catch (error: any) {
        console.error("Error updating question bank:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update question bank" },
            { status: error.status || 500 }
        );
    }
}

// DELETE /api/question-banks/[id] - Delete question bank
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(["admin", "teacher"]);
        const deleted = await db.select().from(questionBanks).where(eq(questionBanks.id, params.id)).limit(1);

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Question bank not found" },
                { status: 404 }
            );
        }

        // Only owner or admin can delete
        if (user.role === "teacher" && deleted[0].createdBy !== user.id) {
            return NextResponse.json(
                { error: "Akses ditolak. Anda hanya dapat menghapus bank soal milik Anda sendiri." },
                { status: 403 }
            );
        }

        // Clean up all question images in this bank before deleting
        const questions = await db.select({ content: bankQuestions.content })
            .from(bankQuestions)
            .where(eq(bankQuestions.bankId, params.id));

        for (const q of questions) {
            if (q.content) {
                deleteQuestionImages(q.content);
            }
        }

        await db.delete(questionBanks).where(eq(questionBanks.id, params.id));

        return NextResponse.json({ message: "Question bank deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting question bank:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete question bank" },
            { status: error.status || 500 }
        );
    }
}

