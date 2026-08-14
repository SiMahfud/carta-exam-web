// NextResponse not used - using apiHandler instead
import { db } from "@/lib/db";
import { subjects } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ActivityLogger } from "@/lib/activity-logger";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/subjects - List all subjects
export const GET = () => apiHandler(async () => {
    await requireAuth(["admin", "teacher"]);
    const allSubjects = await db.select().from(subjects).orderBy(subjects.name);
    return allSubjects;
});

// POST /api/subjects - Create new subject
export const POST = (req: Request) => apiHandler(async () => {
    const user = await requireAuth(["admin", "teacher"]);
    const body = await req.json();
    const { name, code, description } = body;

    if (!name || !code) {
        throw new ApiError("Name and code are required", 400);
    }

    try {
        await db.insert(subjects).values({
            name,
            code: code.toUpperCase(),
            description,
        });
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("UNIQUE")) {
            throw new ApiError("Subject code already exists", 409);
        }
        throw error; // Let apiHandler handle other errors
    }

    const newSubject = await db.select().from(subjects).where(eq(subjects.code, code.toUpperCase())).limit(1);

    // Log activity
    await ActivityLogger.subject.created(user.id, newSubject[0].id, name);

    return newSubject[0];
});

