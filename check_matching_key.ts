import { db } from "@/lib/db";
import { bankQuestions } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function main() {
    const questions = await db.select().from(bankQuestions).where(eq(bankQuestions.type, 'matching'));

    questions.forEach((q, i) => {
        console.log(`\n=== Matching Question ${i + 1} ===`);
        console.log("Answer Key:", JSON.stringify(q.answerKey, null, 2));
    });
}

main().catch(console.error);
