'use server'

import { db } from "@/lib/db"
import { answers, submissions, questions } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function submitAnswer(
    submissionId: string,
    questionId: string,
    answerValue: any,
    isFlagged: boolean = false
) {
    // Check if answer exists
    const existing = await db.select().from(answers).where(
        and(
            eq(answers.submissionId, submissionId),
            eq(answers.questionId, questionId)
        )
    ).get()

    if (existing) {
        await db.update(answers).set({
            studentAnswer: answerValue,
            isFlagged
        }).where(eq(answers.id, existing.id))
    } else {
        await db.insert(answers).values({
            submissionId,
            questionId,
            studentAnswer: answerValue,
            isFlagged,
        })
    }

    return { success: true }
}

export async function finishExam(submissionId: string) {
    // Calculate score
    const submissionAnswers = await db.select().from(answers).where(eq(answers.submissionId, submissionId)).all()
    let totalScore = 0

    for (const ans of submissionAnswers) {
        const q = await db.select().from(questions).where(eq(questions.id, ans.questionId)).get()
        if (!q) continue

        let isCorrect = false
        // Auto-grading logic
        if (q.type === "mc") {
            // @ts-ignore
            if (ans.studentAnswer == q.answerKey.correct) isCorrect = true
        } else if (q.type === "short") {
            // @ts-ignore
            if (q.answerKey.correct.map(s => s.toLowerCase()).includes(ans.studentAnswer?.toLowerCase())) isCorrect = true
        }
        // Add other types logic here

        if (isCorrect) {
            totalScore += 10 // Default score per question, can be dynamic
            await db.update(answers).set({ isCorrect: true, score: 10 }).where(eq(answers.id, ans.id))
        } else {
            await db.update(answers).set({ isCorrect: false, score: 0 }).where(eq(answers.id, ans.id))
        }
    }

    await db.update(submissions).set({
        status: "completed",
        endTime: new Date(),
        score: totalScore
    }).where(eq(submissions.id, submissionId))

    revalidatePath("/exam")
}

export async function logViolation(
    submissionId: string,
    violationType: string,
    details?: string
) {
    const submission = await db.select().from(submissions).where(eq(submissions.id, submissionId)).get()

    if (!submission) return { success: false }

    const currentLog = (submission.violationLog as any[]) || []
    const newLog = [
        ...currentLog,
        {
            type: violationType,
            timestamp: Date.now(),
            details
        }
    ]

    const newCount = (submission.violationCount || 0) + 1

    await db.update(submissions).set({
        violationLog: newLog,
        violationCount: newCount
    }).where(eq(submissions.id, submissionId))

    return { success: true, violationCount: newCount }
}

export async function flagQuestion(submissionId: string, questionId: string, flag: boolean) {
    const existing = await db.select().from(answers).where(
        and(
            eq(answers.submissionId, submissionId),
            eq(answers.questionId, questionId)
        )
    ).get()

    if (existing) {
        await db.update(answers).set({ isFlagged: flag }).where(eq(answers.id, existing.id))
    } else {
        // Create empty answer with flag
        await db.insert(answers).values({
            submissionId,
            questionId,
            studentAnswer: null,
            isFlagged: flag,
        })
    }

    return { success: true }
}
