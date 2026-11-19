import { db } from "@/lib/db";
import { users, classes, classStudents, studentClearances, administrativeTokens } from "@/lib/schema";
import { eq, and, sql, or, like, inArray, desc } from "drizzle-orm";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth-guard";
import { ActivityLogger } from "@/lib/activity-logger";

// GET /api/admin/clearance - List students and their administrative clearance status
export const GET = (req: Request) => apiHandler(async () => {
    await requireAuth(["admin", "teacher"]);

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const classId = url.searchParams.get("classId")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "all";

    // Base query for students (role = 'student')
    let conditions = [eq(users.role, "student")];

    if (search) {
        conditions.push(
            or(
                like(users.name, `%${search}%`),
                like(users.username, `%${search}%`)
            )!
        );
    }

    // Filter by class if provided
    if (classId) {
        const studentIdsInClass = await db
            .select({ studentId: classStudents.studentId })
            .from(classStudents)
            .where(eq(classStudents.classId, classId));

        const ids = studentIdsInClass.map((s: { studentId: string }) => s.studentId);
        if (ids.length === 0) {
            return {
                students: [],
                stats: { total: 0, locked: 0, dispensation: 0, cleared: 0 },
            };
        }
        conditions.push(inArray(users.id, ids));
    }

    // Query students with clearance and class info
    const studentsData = await (db as any)
        .select({
            id: users.id,
            name: users.name,
            username: users.username,
            createdAt: users.createdAt,
            classId: classes.id,
            className: classes.name,
            classGrade: classes.grade,
            clearanceId: studentClearances.id,
            status: studentClearances.status,
            notes: studentClearances.notes,
            validUntil: studentClearances.validUntil,
            updatedAt: studentClearances.updatedAt,
            updatedBy: studentClearances.updatedBy,
        })
        .from(users)
        .leftJoin(classStudents, eq(users.id, classStudents.studentId))
        .leftJoin(classes, eq(classStudents.classId, classes.id))
        .leftJoin(studentClearances, eq(users.id, studentClearances.studentId))
        .where(and(...conditions))
        .orderBy(classes.name, users.name);

    const now = new Date();

    // Auto-sync: Find any dispensations whose validUntil has expired, and lock them in database
    const expiredClearances = studentsData.filter(
        (item: any) =>
            item.status === "dispensation" &&
            item.validUntil &&
            new Date(item.validUntil) < now
    );

    if (expiredClearances.length > 0) {
        const expiredIds = expiredClearances
            .map((item: any) => item.clearanceId)
            .filter(Boolean);

        if (expiredIds.length > 0) {
            try {
                await (db as any)
                    .update(studentClearances)
                    .set({
                        status: "locked",
                        updatedAt: now,
                    })
                    .where(inArray(studentClearances.id, expiredIds));
            } catch (err) {
                console.error("Error auto-locking expired dispensations:", err);
            }
        }
    }

    // Map clearance status: default to "cleared" if no clearance record exists,
    // and reflect "locked" if dispensation has expired
    const mappedStudents = studentsData.map((item: any) => {
        const isExpired =
            item.status === "dispensation" &&
            item.validUntil &&
            new Date(item.validUntil) < now;
        const effectiveStatus = isExpired ? "locked" : (item.status || "cleared");

        return {
            id: item.id,
            name: item.name,
            username: item.username,
            class: item.classId ? {
                id: item.classId,
                name: item.className,
                grade: item.classGrade,
            } : null,
            clearance: {
                id: item.clearanceId,
                status: effectiveStatus,
                notes: item.notes,
                validUntil: item.validUntil,
                updatedAt: item.updatedAt,
                updatedBy: item.updatedBy,
            }
        };
    });

    // Filter by status if specified
    const filtered = status !== "all"
        ? mappedStudents.filter((s: any) => s.clearance.status === status)
        : mappedStudents;

    // Calculate overall stats from the unfiltered (or class-scoped) mapped list
    const stats = {
        total: mappedStudents.length,
        locked: mappedStudents.filter((s: any) => s.clearance.status === "locked").length,
        dispensation: mappedStudents.filter((s: any) => s.clearance.status === "dispensation").length,
        cleared: mappedStudents.filter((s: any) => s.clearance.status === "cleared").length,
    };

    return {
        students: filtered,
        stats,
    };
});

// POST /api/admin/clearance - Update administrative status for one or multiple students
export const POST = (req: Request) => apiHandler(async () => {
    const user = await requireAuth(["admin", "teacher"]);
    const body = await req.json();
    const { studentIds, status, notes, validUntil } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        throw new ApiError("studentIds array is required and must not be empty", 400);
    }

    if (!status || !["locked", "cleared", "dispensation"].includes(status)) {
        throw new ApiError("Invalid status. Must be locked, cleared, or dispensation", 400);
    }

    const now = new Date();
    const validUntilDate = validUntil ? new Date(validUntil) : null;

    // Process each student
    for (const studentId of studentIds) {
        const existing = await (db as any)
            .select()
            .from(studentClearances)
            .where(eq(studentClearances.studentId, studentId))
            .limit(1);

        if (existing.length > 0) {
            await (db as any)
                .update(studentClearances)
                .set({
                    status,
                    notes: notes !== undefined ? notes : existing[0].notes,
                    validUntil: validUntilDate,
                    updatedBy: user.id,
                    updatedAt: now,
                })
                .where(eq(studentClearances.id, existing[0].id));
        } else {
            await (db as any)
                .insert(studentClearances)
                .values({
                    id: crypto.randomUUID(),
                    studentId,
                    status,
                    notes: notes || null,
                    validUntil: validUntilDate,
                    updatedBy: user.id,
                    updatedAt: now,
                });
        }
    }

    return {
        success: true,
        updatedCount: studentIds.length,
        status,
    };
});
