'use server'

import { db } from "@/lib/db"
import { questions } from "@/lib/schema"
import { redirect } from "next/navigation"

export async function createQuestion(formData: FormData) {
    const examId = formData.get("examId") as string
    const type = formData.get("type") as "mc" | "complex_mc" | "matching" | "short" | "essay"
    const questionText = formData.get("question") as string

    const content: any = { question: questionText }
    const answerKey: any = {}

    if (type === "mc") {
        const options = JSON.parse(formData.get("options") as string)
        const correct = parseInt(formData.get("correctMC") as string)
        content.options = options
        answerKey.correct = correct
    } else if (type === "complex_mc") {
        const options = JSON.parse(formData.get("options") as string)
        const correct = JSON.parse(formData.get("correctComplex") as string)
        content.options = options
        answerKey.correct = correct
    } else if (type === "matching") {
        const pairs = JSON.parse(formData.get("pairs") as string)
        content.pairs = pairs // For matching, the content contains the pairs. 
        // In a real exam, we would shuffle the right side.
        // Answer key is essentially the pairs themselves or indices.
        answerKey.pairs = pairs
    } else if (type === "short") {
        const answers = JSON.parse(formData.get("shortAnswers") as string)
        answerKey.correct = answers
    }

    // Get max order
    // const lastQ = await db.select().from(questions).where(eq(questions.examId, examId)).orderBy(desc(questions.order)).limit(1)
    // const newOrder = lastQ.length > 0 ? lastQ[0].order + 1 : 1

    await db.insert(questions).values({
        examId,
        type,
        content,
        answerKey,
        order: 0, // Todo: fix order
    })

    redirect(`/admin/exams/${examId}/questions`)
}
