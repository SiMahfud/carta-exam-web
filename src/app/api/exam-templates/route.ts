import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { examTemplates, subjects, users } from "@/lib/schema";
import { eq, desc, asc, like, and, sql } from "drizzle-orm";

// GET /api/exam-templates - List all templates with pagination, filtering, and sorting
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const search = searchParams.get("search") || "";
        const subjectId = searchParams.get("subjectId") || "all";
        const sort = searchParams.get("sort") || "createdAt";
        const order = searchParams.get("order") || "desc";

        const offset = (page - 1) * limit;

        // Build where conditions
        const conditions = [];
        if (search) {
            conditions.push(like(examTemplates.name, `%${search}%`));
        }
        if (subjectId && subjectId !== "all") {
            conditions.push(eq(examTemplates.subjectId, subjectId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count for pagination
        const totalResult = await db.select({ count: sql<number>`count(*)` })
            .from(examTemplates)
            .where(whereClause);
        const total = Number(totalResult[0]?.count || 0);

        // Determine sort order
        let orderByClause;
        switch (sort) {
            case "name":
                orderByClause = order === "asc" ? asc(examTemplates.name) : desc(examTemplates.name);
                break;
            case "totalScore":
                orderByClause = order === "asc" ? asc(examTemplates.totalScore) : desc(examTemplates.totalScore);
                break;
            case "durationMinutes":
                orderByClause = order === "asc" ? asc(examTemplates.durationMinutes) : desc(examTemplates.durationMinutes);
                break;
            case "createdAt":
            default:
                orderByClause = order === "asc" ? asc(examTemplates.createdAt) : desc(examTemplates.createdAt);
                break;
        }

        const templates = await db.select({
            id: examTemplates.id,
            name: examTemplates.name,
            description: examTemplates.description,
            subjectName: subjects.name,
            durationMinutes: examTemplates.durationMinutes,
            totalScore: examTemplates.totalScore,
            createdAt: examTemplates.createdAt,
            creatorName: users.name,
        })
            .from(examTemplates)
            .innerJoin(subjects, eq(examTemplates.subjectId, subjects.id))
            .innerJoin(users, eq(examTemplates.createdBy, users.id))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            data: templates,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching exam templates:", error);
        return NextResponse.json(
            { error: "Failed to fetch exam templates" },
            { status: 500 }
        );
    }
}

// POST /api/exam-templates - Create new template
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
            randomizationRules,
            targetType,
            targetIds,
            createdBy, // In a real app, this would come from session/auth
        } = body;

        // Basic validation
        if (!name || !subjectId || !durationMinutes || !questionComposition) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // TODO: Get actual user ID from session
        // For now, we'll use the provided createdBy or a default/placeholder if needed
        // But strictly speaking, the frontend should pass it or we fetch it here.
        // Let's assume the frontend sends a valid user ID for now.
        if (!createdBy) {
            return NextResponse.json(
                { error: "User ID is required" },
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
            randomizationRules,
            targetType,
            targetIds,
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
