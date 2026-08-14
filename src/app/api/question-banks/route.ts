// Using apiHandler instead of NextResponse directly
import { db } from "@/lib/db";
import { questionBanks, subjects, users } from "@/lib/schema";
import { eq, and, like, sql } from "drizzle-orm";
import { ActivityLogger } from "@/lib/activity-logger";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/question-banks - List all question banks
export const GET = (req: Request) => apiHandler(async () => {
    await requireAuth(["admin", "teacher"]);
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = db.select({
        id: questionBanks.id,
        name: questionBanks.name,
        description: questionBanks.description,
        subjectId: questionBanks.subjectId,
        subjectName: subjects.name,
        createdBy: questionBanks.createdBy,
        creatorName: users.name,
        createdAt: questionBanks.createdAt,
        updatedAt: questionBanks.updatedAt,
    })
        .from(questionBanks)
        .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
        .leftJoin(users, eq(questionBanks.createdBy, users.id));

    const conditions = [];

    if (subjectId && subjectId !== "all") {
        conditions.push(eq(questionBanks.subjectId, subjectId));
    }
    if (search) {
        conditions.push(like(questionBanks.name, `%${search}%`));
    }
    if (startDate) {
        conditions.push(sql`${questionBanks.createdAt} >= ${new Date(startDate).getTime()}`);
    }
    if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        conditions.push(sql`${questionBanks.createdAt} <= ${endDateTime.getTime()}`);
    }

    if (conditions.length > 0) {
        query = query.where(and(...conditions));
    }

    const banks = await query.orderBy(questionBanks.createdAt);

    return banks;
});

// POST /api/question-banks - Create new question bank
export const POST = (req: Request) => apiHandler(async () => {
    const user = await requireAuth(["admin", "teacher"]);
    const body = await req.json();
    const { name, description, subjectId } = body;

    if (!name || !subjectId) {
        throw new ApiError("Name and subject ID are required", 400);
    }

    const id = crypto.randomUUID();
    const newBankValues = {
        id,
        name,
        description,
        subjectId,
        createdBy: user.id,
    };

    await db.insert(questionBanks).values(newBankValues);

    // Log activity
    await ActivityLogger.questionBank.created(user.id, id, name);

    return newBankValues;
});

