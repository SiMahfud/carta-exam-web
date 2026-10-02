import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { questionBanks, bankQuestions, type BankQuestion } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { ActivityLogger } from "@/lib/activity-logger";

// POST /api/question-banks/[id]/duplicate - Clone a question bank into user's own collection
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(["admin", "teacher"]);

        // 1. Fetch source question bank
        const sourceBank = await db.select()
            .from(questionBanks)
            .where(eq(questionBanks.id, params.id))
            .limit(1);

        if (sourceBank.length === 0) {
            return NextResponse.json(
                { error: "Bank soal sumber tidak ditemukan" },
                { status: 404 }
            );
        }

        const source = sourceBank[0];

        // 2. Fetch all questions from source bank
        const questionsToCopy = await db.select()
            .from(bankQuestions)
            .where(eq(bankQuestions.bankId, params.id));

        // 3. Create new duplicated question bank
        const newBankId = crypto.randomUUID();
        const newBankName = `[Salinan] ${source.name}`;

        const newBankValues = {
            id: newBankId,
            name: newBankName,
            description: source.description ? `${source.description} (Disalin)` : "Disalin dari bank soal bersama",
            subjectId: source.subjectId,
            createdBy: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.insert(questionBanks).values(newBankValues);

        // 4. Copy all questions if any
        if (questionsToCopy.length > 0) {
            const newQuestions = questionsToCopy.map((q: BankQuestion) => ({
                id: crypto.randomUUID(),
                bankId: newBankId,
                type: q.type,
                content: q.content,
                answerKey: q.answerKey,
                tags: q.tags,
                difficulty: q.difficulty,
                defaultPoints: q.defaultPoints,
                questionNumber: q.questionNumber,
                metadata: q.metadata,
                createdBy: user.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));

            // Insert in batch or loop
            for (const nq of newQuestions) {
                await db.insert(bankQuestions).values(nq as any);
            }
        }

        // 5. Log activity
        await ActivityLogger.questionBank.created(user.id, newBankId, newBankName);

        return NextResponse.json({
            success: true,
            data: newBankValues,
            copiedQuestionsCount: questionsToCopy.length,
        });
    } catch (error: any) {
        console.error("Error duplicating question bank:", error);
        return NextResponse.json(
            { error: error.message || "Gagal menduplikasi bank soal" },
            { status: error.status || 500 }
        );
    }
}
