import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, classStudents, classes } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const role = searchParams.get("role");

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
                const existing = acc.find((s: any) => s.id === student.id);
                if (existing) {
                    if (student.className) {
                        existing.classes = existing.classes || [];
                        if (!existing.classes.find((c: any) => c.id === student.classId)) {
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

            return NextResponse.json(groupedStudents);
        }

        let query = db.select({
            id: users.id,
            name: users.name,
            username: users.username,
            role: users.role,
        }).from(users);

        if (role) {
            // @ts-ignore - role is validated by enum in schema but here it's string
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
