import { db } from "@/lib/db";
import { examSessions, examTemplates, bankQuestions } from "@/lib/schema";
import { eq, inArray } from "drizzle-orm";

async function main() {
    const sessionId = "624c3a42-0791-46e1-9b67-8a18327dad77";

    console.log("Checking session and its questions...\n");

    // Get session
    const session = await db.select().from(examSessions).where(eq(examSessions.id, sessionId));
    console.log("Session:", session[0]);

    if (session.length === 0) {
        console.log("Session not found!");
        return;
    }

    // Get template
    const template = await db.select().from(examTemplates).where(eq(examTemplates.id, session[0].templateId));
    console.log("\nTemplate:", template[0]);

    if (template.length === 0) {
        console.log("Template not found!");
        return;
    }

    const composition = template[0].questionComposition;
    const bankIds = template[0].bankIds as string[];

    console.log("\nQuestion composition:", composition);
    console.log("Bank IDs:", bankIds);

    // Get questions from banks
    const allQuestions = await db.select().from(bankQuestions).where(inArray(bankQuestions.bankId, bankIds));

    console.log("\nTotal questions in banks:", allQuestions.length);
    console.log("Questions by type:");

    const byType = allQuestions.reduce((acc: any, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1;
        return acc;
    }, {});

    console.log(byType);

    if (allQuestions.length === 0) {
        console.log("\n⚠️ NO QUESTIONS FOUND IN THE QUESTION BANKS!");
        console.log("This is why no questions appear in the exam.");
    } else {
        console.log("\nSample questions:");
        allQuestions.slice(0, 3).forEach(q => {
            console.log(`- [${q.type}] ${JSON.stringify(q.content).substring(0, 100)}...`);
        });
    }
}

main().catch(console.error);
