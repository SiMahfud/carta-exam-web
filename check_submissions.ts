import { db } from "@/lib/db";
import { submissions } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("--- Checking Submissions ---");

    const studentId = "354f7895-9164-4f0c-9124-57cd18b4866f";
    const sessionId = "624c3a42-0791-46e1-9b67-8a18327dad77"; // From earlier debug output

    console.log(`Student ID: ${studentId}`);
    console.log(`Session ID: ${sessionId}`);

    const allSubmissions = await db.select().from(submissions);
    console.log("\nAll submissions:", allSubmissions);

    const studentSubmissions = await db.select()
        .from(submissions)
        .where(eq(submissions.userId, studentId));

    console.log("\nStudent submissions:", studentSubmissions);

    const sessionSubmissions = await db.select()
        .from(submissions)
        .where(eq(submissions.sessionId, sessionId));

    console.log("\nSession submissions:", sessionSubmissions);

    // Check if there's a submission for this specific student and session
    const existingSubmission = studentSubmissions.filter(s => s.sessionId === sessionId);
    console.log("\nExisting submission for this student and session:", existingSubmission);

    if (existingSubmission.length > 0) {
        console.log("\n⚠️ Found existing submission! This is why 'Exam already started' error occurs.");
        console.log("Submission ID:", existingSubmission[0].id);
        console.log("Status:", existingSubmission[0].status);
        console.log("Started at:", existingSubmission[0].startTime);
    }
}

main().catch(console.error);
