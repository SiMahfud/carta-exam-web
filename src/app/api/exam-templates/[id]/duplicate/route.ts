import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examTemplates } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { ActivityLogger } from "@/lib/activity-logger";

// POST /api/exam-templates/[id]/duplicate - Clone a template into user's own collection
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(["admin", "teacher"]);

        // 1. Fetch source template
        const sourceTemplate = await db.select()
            .from(examTemplates)
            .where(eq(examTemplates.id, params.id))
            .limit(1);

        if (sourceTemplate.length === 0) {
            return NextResponse.json(
                { error: "Template ujian tidak ditemukan" },
                { status: 404 }
            );
        }

        const source = sourceTemplate[0];

        // 2. Create new template copy
        const newTemplateId = crypto.randomUUID();
        const newTemplateName = `[Salinan] ${source.name}`;

        const newTemplateValues = {
            id: newTemplateId,
            name: newTemplateName,
            description: source.description ? `${source.description} (Disalin)` : "Disalin dari template",
            subjectId: source.subjectId,
            bankIds: source.bankIds,
            filterTags: source.filterTags,
            questionComposition: source.questionComposition,
            useQuestionPool: source.useQuestionPool,
            poolSize: source.poolSize,
            scoringTemplateId: source.scoringTemplateId,
            customWeights: source.customWeights,
            totalScore: source.totalScore,
            durationMinutes: source.durationMinutes,
            minDurationMinutes: source.minDurationMinutes,
            randomizeQuestions: source.randomizeQuestions,
            randomizeAnswers: source.randomizeAnswers,
            essayAtEnd: source.essayAtEnd,
            randomizationRules: source.randomizationRules,
            targetType: source.targetType,
            targetIds: source.targetIds,
            enableLockdown: source.enableLockdown,
            requireToken: source.requireToken,
            maxViolations: source.maxViolations,
            allowReview: source.allowReview,
            showResultImmediately: source.showResultImmediately,
            allowRetake: source.allowRetake,
            maxTabSwitches: source.maxTabSwitches,
            displaySettings: source.displaySettings,
            violationSettings: source.violationSettings,
            createdBy: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.insert(examTemplates).values(newTemplateValues as any);

        // 3. Log activity
        await ActivityLogger.examTemplate.created(user.id, newTemplateId, newTemplateName);

        return NextResponse.json({
            success: true,
            data: newTemplateValues,
        });
    } catch (error: any) {
        console.error("Error duplicating exam template:", error);
        return NextResponse.json(
            { error: error.message || "Gagal menduplikasi template ujian" },
            { status: error.status || 500 }
        );
    }
}
