import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examTemplates, subjects } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/exam-templates - List all exam templates
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const subjectId = searchParams.get("subjectId");

        let baseQuery = db.select({
            id: examTemplates.id,
            name: examTemplates.name,
            description: examTemplates.description,
            subjectId: examTemplates.subjectId,
            subjectName: subjects.name,
            durationMinutes: examTemplates.durationMinutes,
            useQuestionPool: examTemplates.useQuestionPool,
            totalScore: examTemplates.totalScore,
            createdAt: examTemplates.createdAt,
            updatedAt: examTemplates.updatedAt,
        })
            .from(examTemplates)
            .innerJoin(subjects, eq(examTemplates.subjectId, subjects.id));

        const templates = subjectId
            ? await baseQuery.where(eq(examTemplates.subjectId, subjectId)).orderBy(examTemplates.createdAt)
            : await baseQuery.orderBy(examTemplates.createdAt);
        return NextResponse.json(templates);
    } catch (error) {
        console.error("Error fetching exam templates:", error);
        return NextResponse.json(
            { error: "Failed to fetch exam templates" },
            { status: 500 }
        );
    }
}

// POST /api/exam-templates - Create new exam template
export async function POST(request: Request) {
    try {
        const body = await request.json();
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
            enableLockdown,
            requireToken,
            maxViolations,
            allowReview,
            showResultImmediately,
            allowRetake,
            maxTabSwitches,
            displaySettings,
            createdBy,
        } = body;

        if (!name || !subjectId || !bankIds || !questionComposition || !durationMinutes || !createdBy) {
            return NextResponse.json(
                { error: "Required fields missing" },
                { status: 400 }
            );
        }

        const newTemplate = await db.insert(examTemplates).values({
            name,
            description,
            subjectId,
            bankIds,
            filterTags,
            questionComposition,
            useQuestionPool: useQuestionPool ?? false,
            poolSize,
            scoringTemplateId,
            customWeights,
            totalScore: totalScore ?? 100,
            durationMinutes,
            minDurationMinutes: minDurationMinutes ?? 0,
            randomizeQuestions: randomizeQuestions ?? false,
            randomizeAnswers: randomizeAnswers ?? false,
            essayAtEnd: essayAtEnd ?? true,
            enableLockdown: enableLockdown ?? true,
            requireToken: requireToken ?? false,
            maxViolations: maxViolations ?? 3,
            allowReview: allowReview ?? false,
            showResultImmediately: showResultImmediately ?? false,
            allowRetake: allowRetake ?? false,
            maxTabSwitches: maxTabSwitches ?? 3,
            displaySettings,
            createdBy,
        }).returning();

        return NextResponse.json(newTemplate[0], { status: 201 });
    } catch (error) {
        console.error("Error creating exam template:", error);
        return NextResponse.json(
            { error: "Failed to create exam template" },
            { status: 500 }
        );
    }
}
