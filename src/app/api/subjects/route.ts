// NextResponse not used - using apiHandler instead
import { db } from "@/lib/db";
import { subjects, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ActivityLogger } from "@/lib/activity-logger";
import { apiHandler, ApiError } from "@/lib/api-handler";

// GET /api/subjects - List all subjects
export const GET = () => apiHandler(async () => {
    const allSubjects = await db.select().from(subjects).orderBy(subjects.name);
    return allSubjects;
}, {
    headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
});

// POST /api/subjects - Create new subject
export const POST = (req: Request) => apiHandler(async () => {
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

    // Log activity (get first admin for now)
    const admin = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
    if (admin.length > 0) {
        await ActivityLogger.subject.created(admin[0].id, newSubject[0].id, name);
    }

    return newSubject[0];
});
