
import { db } from "@/lib/db";
import { classes, users } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { ActivityLogger } from "@/lib/activity-logger";
import { apiHandler, ApiError } from "@/lib/api-handler";

// GET /api/classes - List all classes
export const GET = () => apiHandler(async () => {
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

    // Log activity (using first admin if no teacher specified, or the teacher themselves)
    // For simplicity, we'll try to log with the teacher ID if available, otherwise admin
    let loggerUserId = validTeacherId;
    if (!loggerUserId) {
        const admin = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
        if (admin.length > 0) loggerUserId = admin[0].id;
    }

    if (loggerUserId) {
        await ActivityLogger.class.created(loggerUserId, id, name);
    }

    return newClassValues;
});
