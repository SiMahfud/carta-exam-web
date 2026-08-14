
import { db } from "@/lib/db";
import { classes, users } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { ActivityLogger } from "@/lib/activity-logger";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth-guard";

// GET /api/classes - List all classes
export const GET = () => apiHandler(async () => {
    await requireAuth(["admin", "teacher"]);
    const allClasses = await db.select({
        id: classes.id,
        name: classes.name,
        grade: classes.grade,
        academicYear: classes.academicYear,
        teacherId: classes.teacherId,
        teacherName: users.name,
        createdAt: classes.createdAt,
        studentCount: sql<number>`(SELECT COUNT(*) FROM class_students WHERE class_students.class_id = ${classes.id})`.as('student_count'),
    })
        .from(classes)
        .leftJoin(users, eq(classes.teacherId, users.id))
        .orderBy(classes.grade, classes.name);

    return allClasses;
});

// POST /api/classes - Create new class
export const POST = (req: Request) => apiHandler(async () => {
    const user = await requireAuth(["admin", "teacher"]);
    const body = await req.json();
    const { name, grade, academicYear, teacherId } = body;

    if (!name || !grade || !academicYear) {
        throw new ApiError("Name, grade, and academic year are required", 400);
    }

    let validTeacherId = teacherId;
    if (validTeacherId) {
        const userExists = await db.select().from(users).where(eq(users.id, validTeacherId)).limit(1);
        if (userExists.length === 0) {
            validTeacherId = null;
        }
    }

    const id = crypto.randomUUID();
    const newClassValues = {
        id,
        name,
        grade,
        academicYear,
        teacherId: validTeacherId || null,
    };

    await db.insert(classes).values(newClassValues);

    // Log activity
    await ActivityLogger.class.created(user.id, id, name);

    return newClassValues;
});

