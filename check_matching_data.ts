import { db } from "@/lib/db";
import { bankQuestions } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function main() {
    // Get matching questions
    const questions = await db.select().from(bankQuestions).where(eq(bankQuestions.type, 'matching'));

    console.log("Matching questions found:", questions.length);

    questions.forEach((q, i) => {
        console.log(`\n=== Matching Question ${i + 1} ===`);
        console.log("ID:", q.id);
        console.log("Content:", JSON.stringify(q.content, null, 2));
    });
}

main().catch(console.error);
