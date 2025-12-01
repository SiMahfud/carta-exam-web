import { db } from "@/lib/db";
import { exams, examSessions } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function main() {
    const sessionId = "624c3a42-0791-46e1-9b67-8a18327dad77";

    console.log("Checking session:", sessionId);

    const session = await db.select().from(examSessions).where(eq(examSessions.id, sessionId));
    console.log("Session:", session);

    console.log("\nAll exams:");
    const allExams = await db.select().from(exams);
    console.log(allExams);

    // Check if there's an exam linked to this session
    const linkedExams = allExams.filter(e => e.sessionId === sessionId);
    console.log("\nExams linked to this session:", linkedExams);
}

main().catch(console.error);
