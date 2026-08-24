import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/auth";
import { db } from "@/lib/db";
import { users, classStudents, classes } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/student/profile - Get current logged-in student profile with class details
export async function GET() {
    try {
        const sessionUser = await getCurrentUser();

        if (!sessionUser) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        // Get full user details from database
        const [userData] = await (db as any)
            .select({
                id: users.id,
                name: users.name,
                username: users.username,
                role: users.role,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.id, sessionUser.id))
            .limit(1);

        if (!userData) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Get student's enrolled classes
        const enrolledClasses = await (db as any)
            .select({
                id: classes.id,
                name: classes.name,
                grade: classes.grade,
                academicYear: classes.academicYear,
                teacherId: classes.teacherId,
            })
            .from(classStudents)
            .innerJoin(classes, eq(classStudents.classId, classes.id))
            .where(eq(classStudents.studentId, sessionUser.id));

        const primaryClass = enrolledClasses.length > 0 ? enrolledClasses[0] : null;

        return NextResponse.json({
            success: true,
            data: {
                id: userData.id,
                name: userData.name,
                username: userData.username, // NIS or Student Username
                role: userData.role,
                createdAt: userData.createdAt,
                primaryClass: primaryClass ? {
                    id: primaryClass.id,
                    name: primaryClass.name,
                    grade: primaryClass.grade,
                    academicYear: primaryClass.academicYear,
                } : null,
                classes: enrolledClasses.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    grade: c.grade,
                    academicYear: c.academicYear,
                })),
            }
        });
    } catch (error) {
        console.error("Error fetching student profile:", error);
        return NextResponse.json(
            { error: "Failed to fetch student profile" },
            { status: 500 }
        );
    }
}
