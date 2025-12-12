import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, classStudents, classes } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
    try {
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
                return NextResponse.json(unassignedStudents);
            }

            return NextResponse.json(groupedStudents);
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

        return NextResponse.json(allUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, username, password, role } = body;

        // Validate required fields
        if (!name || !username || !password) {
            return NextResponse.json(
                { error: "Nama, username, dan password wajib diisi" },
                { status: 400 }
            );
        }

        // Validate role
        const validRoles = ["admin", "teacher", "student"];
        if (role && !validRoles.includes(role)) {
            return NextResponse.json(
                { error: "Role tidak valid" },
                { status: 400 }
            );
        }

        // Check for duplicate username
        const existingUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

        if (existingUser.length > 0) {
            return NextResponse.json(
                { error: "Username sudah digunakan" },
                { status: 409 }
            );
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

        return NextResponse.json(newUser[0], { status: 201 });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json(
            { error: "Gagal membuat user" },
            { status: 500 }
        );
    }
}
