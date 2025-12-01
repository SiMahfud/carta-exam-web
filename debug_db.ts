
import { db } from "@/lib/db";
import { users, classes, classStudents, examSessions } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("--- Debugging Student Exams ---");

    const studentId = "354f7895-9164-4f0c-9124-57cd18b4866f";
    console.log(`Checking student: ${studentId}`);

    const student = await db.select().from(users).where(eq(users.id, studentId));
    console.log("Student found:", student.length > 0 ? student[0] : "No");

    if (student.length === 0) {
        console.log("Student 'student-1' does not exist. Listing all students:");
        const allStudents = await db.select().from(users).where(eq(users.role, "student"));
        console.log(allStudents.map(s => ({ id: s.id, name: s.name })));
        return;
    }

    const enrollments = await db.select().from(classStudents).where(eq(classStudents.studentId, studentId));
    console.log("Enrollments:", enrollments);

    if (enrollments.length === 0) {
        console.log("Student is not enrolled in any class.");
    } else {
        const classIds = enrollments.map(e => e.classId);
        console.log("Student Class IDs:", classIds);

        const studentClasses = await db.select().from(classes).where(inArray(classes.id, classIds));
        console.log("Student Classes:", studentClasses.map(c => ({ id: c.id, name: c.name })));
    }

    console.log("--- Checking Exam Sessions ---");
    const sessions = await db.select().from(examSessions);
    console.log("Total sessions:", sessions.length);

    sessions.forEach(s => {
        console.log(`Session: ${s.sessionName} (ID: ${s.id})`);
        console.log(`  Target Type: ${s.targetType}`);
        console.log(`  Target IDs: ${s.targetIds} (Type: ${typeof s.targetIds})`);
        if (Array.isArray(s.targetIds)) {
            console.log("  Is Array: Yes");
        } else {
            console.log("  Is Array: No");
        }
        console.log(`  Status: ${s.status}`);
    });
}

// Helper for inArray since I can't import it easily in this standalone script context without more setup
// actually I can import it from drizzle-orm
import { inArray } from "drizzle-orm";

main().catch(console.error);
