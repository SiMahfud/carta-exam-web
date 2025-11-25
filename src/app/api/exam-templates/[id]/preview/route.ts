import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examTemplates, bankQuestions, scoringTemplates } from "@/lib/schema";
import { eq, inArray, and } from "drizzle-orm";

// POST /api/exam-templates/[id]/preview - Preview exam configuration
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Get the template
        const template = await db.select()
            .from(examTemplates)
            .where(eq(examTemplates.id, params.id))
            .limit(1);

        if (template.length === 0) {
            return NextResponse.json(
                { error: "Exam template not found" },
                { status: 404 }
            );
        }

        const t = template[0];

        // Get all questions from selected banks
        const bankIds = t.bankIds as string[];
        let questions = await db.select()
            .from(bankQuestions)
            .where(inArray(bankQuestions.bankId, bankIds));

        // Apply tag filters if any
        const filterTags = t.filterTags as string[] || [];
        if (filterTags.length > 0) {
            questions = questions.filter(q => {
                const qTags = (q.tags as string[]) || [];
                return filterTags.some(tag => qTags.includes(tag));
            });
        }

        // Group by type
        const questionsByType: Record<string, any[]> = {
            mc: [],
            complex_mc: [],
            matching: [],
            short: [],
            essay: [],
        };

        questions.forEach(q => {
            if (questionsByType[q.type]) {
                questionsByType[q.type].push(q);
            }
        });

        // Get scoring weights
        let weights = t.customWeights as any || {};
        if (t.scoringTemplateId) {
            const scoringTemplate = await db.select()
                .from(scoringTemplates)
                .where(eq(scoringTemplates.id, t.scoringTemplateId))
                .limit(1);

            if (scoringTemplate.length > 0) {
                const defaultWeights = scoringTemplate[0].defaultWeights as any;
                weights = { ...defaultWeights, ...weights };
            }
        }

        // Calculate total points
        const composition = t.questionComposition as any;
        let totalPoints = 0;

        Object.keys(composition).forEach(type => {
            const count = composition[type] || 0;
            const weight = weights[type] || 1;
            totalPoints += count * weight;
        });

        // Build preview
        const preview = {
            template: t,
            availableQuestions: {
                mc: questionsByType.mc.length,
                complex_mc: questionsByType.complex_mc.length,
                matching: questionsByType.matching.length,
                short: questionsByType.short.length,
                essay: questionsByType.essay.length,
            },
            requestedQuestions: composition,
            scoringWeights: weights,
            calculatedTotalPoints: totalPoints,
            warnings: [] as string[],
        };

        // Check if enough questions available
        Object.keys(composition).forEach((type) => {
            const requested = composition[type] || 0;
            const available = questionsByType[type as keyof typeof questionsByType]?.length || 0;

            if (requested > available) {
                preview.warnings.push(
                    `Not enough ${type} questions: requested ${requested}, available ${available}`
                );
            }
        });

        return NextResponse.json(preview);
    } catch (error) {
        console.error("Error previewing exam template:", error);
        return NextResponse.json(
            { error: "Failed to preview exam template" },
            { status: 500 }
        );
    }
}
