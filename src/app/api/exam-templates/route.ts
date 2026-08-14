
import { db } from "@/lib/db";
import { examTemplates, subjects, users } from "@/lib/schema";
import { eq, desc, asc, like, and, sql } from "drizzle-orm";
import { ActivityLogger } from "@/lib/activity-logger";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/exam-templates - List all templates with pagination, filtering, and sorting
export const GET = (req: Request) => apiHandler(async () => {
    await requireAuth(["admin", "teacher"]);
    const { searchParams } = new URL(req.url);
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

    return {
        data: templates,
        metadata: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
});

// POST /api/exam-templates - Create new template
export const POST = (req: Request) => apiHandler(async () => {
    const user = await requireAuth(["admin", "teacher"]);
    const body = await req.json();
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
        violationSettings,
        randomizationRules,
        targetType,
        targetIds,
    } = body;

    // Basic validation
    if (!name || !subjectId || !durationMinutes || !questionComposition) {
        throw new ApiError("Missing required fields", 400);
    }

    const validCreatedBy = user.id;


    const id = crypto.randomUUID();
    const newTemplateValues = {
        id,
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
        violationSettings,
        randomizationRules,
        targetType,
        targetIds,
        createdBy: validCreatedBy,
    };

    await db.insert(examTemplates).values(newTemplateValues);

    // Log activity
    await ActivityLogger.examTemplate.created(validCreatedBy, id, name);

    return newTemplateValues;
});
