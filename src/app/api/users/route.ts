import { db } from "@/lib/db";
import { users, classStudents, classes } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { apiHandler, ApiError } from "@/lib/api-handler";

export const GET = (request: Request) => apiHandler(async () => {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const unassigned = searchParams.get("unassigned") === "true";

    if (role === "student") {
        // For students, include their class information
        const studentsWithClasses = await db
            .select({
                id: users.id,
                name: users.name,
                username: users.username,
                role: users.role,
                classId: classStudents.classId,
                className: classes.name,
            })
            .from(users)
            .leftJoin(classStudents, eq(users.id, classStudents.studentId))
            .leftJoin(classes, eq(classStudents.classId, classes.id))
            .where(eq(users.role, "student"))
            .orderBy(users.name);

        // Group students by id to handle multiple classes
        const groupedStudents = studentsWithClasses.reduce((
            acc: Array<{
                id: string;
                name: string;
                username: string;
                role: string;
                classes: Array<{ id: string; name: string }>;
            }>,
            student: typeof studentsWithClasses[0]
        ) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const existing = acc.find((s: { id: string }) => s.id === student.id);
            if (existing) {
                if (student.className) {
                    existing.classes = existing.classes || [];
                    if (!existing.classes.find((c: { id: string }) => c.id === student.classId)) {
                        existing.classes.push({
                            id: student.classId!,
                            name: student.className
                        });
                    }
                }
            } else {
                acc.push({
                    id: student.id,
                    name: student.name,
                    username: student.username,
                    role: student.role,
                    classes: student.className ? [{
                        id: student.classId!,
                        name: student.className
                    }] : []
                });
            }
            return acc;
        }, []);

        // If unassigned=true, filter to only students without any class
        if (unassigned) {
            const unassignedStudents = groupedStudents.filter((s: { classes: Array<{ id: string; name: string }> }) => s.classes.length === 0);
            return unassignedStudents;
        }

        return groupedStudents;
    }

    let query = db.select({
        id: users.id,
        name: users.name,
        username: users.username,
        role: users.role,
        createdAt: users.createdAt,
    }).from(users);

    if (role) {
        // @ts-expect-error - role is validated by enum in schema but here it's string
        query = query.where(eq(users.role, role));
    }

    const allUsers = await query.orderBy(users.name);

    return allUsers;
});

export const POST = (request: Request) => apiHandler(async () => {
    const body = await request.json();
    const { name, username, password, role } = body;

    // Validate required fields
    if (!name || !username || !password) {
        throw new ApiError("Nama, username, dan password wajib diisi", 400);
    }

    // Validate role
    const validRoles = ["admin", "teacher", "student"];
    if (role && !validRoles.includes(role)) {
        throw new ApiError("Role tidak valid", 400);
    }

    // Check for duplicate username
    const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

    if (existingUser.length > 0) {
        throw new ApiError("Username sudah digunakan", 409);

    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate ID manually for SQLite compatibility
    const userId = crypto.randomUUID();

    // Create user
    await db.insert(users).values({
        id: userId,
        name,
        username,
        password: hashedPassword,
        role: role || "student",
    });

    // Fetch the created user
    const newUser = await db
        .select({
            id: users.id,
            name: users.name,
            username: users.username,
            role: users.role,
            createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    // In api-handler, 201 is not automatically set, but for simplicity we return the object.
    // Ideally apiHandler might need an option for status code, but for now 200 is acceptable or we modify apiHandler.
    // Seeing api-handler.ts, it calls NextResponse.json(response, options).
    // The current apiHandler doesn't seem to allow overriding status code easily from the return value unless we throw error.
    // However, looking at the apiHandler signature: `apiHandler(handler, options)`. We can pass options there?
    // But apiHandler definition is `export async function apiHandler<T>(handler: ... , options?: ResponseInit)`.
    // So we can wrap this specific handler differently if we really need 201, but standardizing to return the object is the main goal.
    // I will return the object. If 201 is strict requirement, I might need to adjust, but typically 200 OK with created resource is fine for this app context.
    return newUser[0];
});
