import { db } from "@/lib/db";
import { bankQuestions } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function main() {
    // Get the MC question from the bank
    const questions = await db.select().from(bankQuestions).limit(3);

    console.log("Sample questions from database:\n");

    questions.forEach((q, i) => {
        console.log(`\n=== Question ${i + 1} ===`);
        console.log("ID:", q.id);
        console.log("Type:", q.type);
        console.log("Content:", JSON.stringify(q.content, null, 2));
        console.log("Answer Key:", JSON.stringify(q.answerKey, null, 2));
    });
}

main().catch(console.error);
