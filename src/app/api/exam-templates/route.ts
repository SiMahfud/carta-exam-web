
import { db } from "@/lib/db";
import { examTemplates, subjects, users } from "@/lib/schema";
import { eq, desc, asc, like, and, or, sql } from "drizzle-orm";
import { ActivityLogger } from "@/lib/activity-logger";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/exam-templates - List all templates with pagination, filtering, and sorting
export const GET = (req: Request) => apiHandler(async () => {
    const user = await requireAuth(["admin", "teacher"]);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const subjectId = searchParams.get("subjectId") || "all";
    const sort = searchParams.get("sort") || "createdAt";
    const order = searchParams.get("order") || "desc";
    const scope = searchParams.get("scope");
    const createdByFilter = searchParams.get("createdBy");

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    // Filter by ownership/role:
    // Teachers only see their own templates + official templates created by Admin
    if (user.role === "teacher") {
        if (scope === "mine") {
            conditions.push(eq(examTemplates.createdBy, user.id));
        } else {
            conditions.push(or(eq(examTemplates.createdBy, user.id), eq(users.role, "admin")));
        }
    } else if (user.role === "admin") {
        if (scope === "mine") {
            conditions.push(eq(examTemplates.createdBy, user.id));
        } else if (createdByFilter) {
            conditions.push(eq(examTemplates.createdBy, createdByFilter));
        }
    }

    if (search) {
        conditions.push(like(examTemplates.name, `%${search}%`));
    }
    if (subjectId && subjectId !== "all") {
        conditions.push(eq(examTemplates.subjectId, subjectId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination (join users in case whereClause checks users.role)
    const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(examTemplates)
        .leftJoin(users, eq(examTemplates.createdBy, users.id))
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
        subjectId: examTemplates.subjectId,
        subjectName: subjects.name,
        durationMinutes: examTemplates.durationMinutes,
        totalScore: examTemplates.totalScore,
        createdAt: examTemplates.createdAt,
        createdBy: examTemplates.createdBy,
        creatorName: users.name,
        creatorRole: users.role,
    })
        .from(examTemplates)
        .innerJoin(subjects, eq(examTemplates.subjectId, subjects.id))
        .leftJoin(users, eq(examTemplates.createdBy, users.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

    const mappedTemplates = templates.map((template: typeof templates[0]) => ({
        ...template,
        canEdit: user.role === "admin" || template.createdBy === user.id,
        isOwner: template.createdBy === user.id,
        isAdminTemplate: template.creatorRole === "admin",
    }));

    return {
        data: mappedTemplates,
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
