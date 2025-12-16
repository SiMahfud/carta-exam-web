import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examTemplates, subjects } from "../../../../lib/schema";
import { eq } from "drizzle-orm";
import { ActivityLogger } from "@/lib/activity-logger";

// GET /api/exam-templates/[id] - Get template details
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const template = await db.select({
            id: examTemplates.id,
            name: examTemplates.name,
            description: examTemplates.description,
            subjectId: examTemplates.subjectId,
            bankIds: examTemplates.bankIds,
            filterTags: examTemplates.filterTags,
            questionComposition: examTemplates.questionComposition,
            useQuestionPool: examTemplates.useQuestionPool,
            poolSize: examTemplates.poolSize,
            scoringTemplateId: examTemplates.scoringTemplateId,
            customWeights: examTemplates.customWeights,
            totalScore: examTemplates.totalScore,
            durationMinutes: examTemplates.durationMinutes,
            minDurationMinutes: examTemplates.minDurationMinutes,
            randomizeQuestions: examTemplates.randomizeQuestions,
            randomizeAnswers: examTemplates.randomizeAnswers,
            essayAtEnd: examTemplates.essayAtEnd,
            enableLockdown: examTemplates.enableLockdown,
            requireToken: examTemplates.requireToken,
            maxViolations: examTemplates.maxViolations,
            allowReview: examTemplates.allowReview,
            showResultImmediately: examTemplates.showResultImmediately,
            allowRetake: examTemplates.allowRetake,
            maxTabSwitches: examTemplates.maxTabSwitches,
            displaySettings: examTemplates.displaySettings,
            createdBy: examTemplates.createdBy,
            createdAt: examTemplates.createdAt,
            updatedAt: examTemplates.updatedAt,
            randomizationRules: examTemplates.randomizationRules,
            targetType: examTemplates.targetType,
            targetIds: examTemplates.targetIds,
            violationSettings: examTemplates.violationSettings,
            subjectName: subjects.name,
        })
            .from(examTemplates)
            .innerJoin(subjects, eq(examTemplates.subjectId, subjects.id))
            .where(eq(examTemplates.id, params.id))
            .limit(1);

        if (template.length === 0) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(template[0]);
    } catch (error) {
        console.error("Error fetching exam template:", error);
        return NextResponse.json(
            { error: "Failed to fetch exam template" },
            { status: 500 }
        );
    }
}

// PUT /api/exam-templates/[id] - Update template
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        // Destructure all possible fields to ensure we only update what's allowed
        const {
            name,
            description,
            subjectId,
            bankIds,
            filterTags,
            questionComposition,
            useQuestionPool,
            poolSize,
            scoringTemplateId,
            customWeights,
            totalScore,
            durationMinutes,
            minDurationMinutes,
            randomizeQuestions,
            randomizeAnswers,
            essayAtEnd,
            randomizationRules,
            targetType,
            targetIds,
            enableLockdown,
            requireToken,
            maxViolations,
            allowReview,
            showResultImmediately,
            allowRetake,
            maxTabSwitches,
            displaySettings,
            violationSettings,
        } = body;

        await db.update(examTemplates)
            .set({
                name,
                description,
                subjectId,
                bankIds,
                filterTags,
                questionComposition,
                useQuestionPool,
                poolSize,
                scoringTemplateId,
                customWeights,
                totalScore,
                durationMinutes,
                minDurationMinutes,
                randomizeQuestions,
                randomizeAnswers,
                essayAtEnd,
                randomizationRules,
                targetType,
                targetIds,
                enableLockdown,
                requireToken,
                maxViolations,
                allowReview,
                showResultImmediately,
                allowRetake,
                maxTabSwitches,
                displaySettings,
                violationSettings,
            })
            .where(eq(examTemplates.id, params.id));

        const updated = await db.select().from(examTemplates).where(eq(examTemplates.id, params.id)).limit(1);

        if (updated.length === 0) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        // Log activity
        if (updated[0].createdBy) {
            await ActivityLogger.examTemplate.updated(updated[0].createdBy, params.id, updated[0].name);
        }

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error("Error updating exam template:", error);
        return NextResponse.json(
            { error: "Failed to update exam template" },
            { status: 500 }
        );
    }
}

// DELETE /api/exam-templates/[id] - Delete template
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const deleted = await db.select().from(examTemplates).where(eq(examTemplates.id, params.id)).limit(1);

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        await db.delete(examTemplates).where(eq(examTemplates.id, params.id));

        if (deleted.length === 0) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        // Log activity (using createdBy from deleted record if available)
        if (deleted[0].createdBy) {
            await ActivityLogger.examTemplate.deleted(deleted[0].createdBy, params.id, deleted[0].name);
        }

        return NextResponse.json({ message: "Template deleted successfully" });
    } catch (error) {
        console.error("Error deleting exam template:", error);
        return NextResponse.json(
            { error: "Failed to delete exam template" },
            { status: 500 }
        );
    }
}
