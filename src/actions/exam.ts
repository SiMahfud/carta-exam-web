'use server'

import { db } from "@/lib/db"
import { exams } from "@/lib/schema"
import { redirect } from "next/navigation"

export async function createExam(formData: FormData) {
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const durationMinutes = parseInt(formData.get("duration") as string)
    const minDurationMinutes = parseInt(formData.get("minDuration") as string)
    const randomizeQuestions = formData.get("randomizeQuestions") === "on"
    const randomizeAnswers = formData.get("randomizeAnswers") === "on"

    const [newExam] = await db.insert(exams).values({
        title,
        description,
        durationMinutes,
        minDurationMinutes,
        randomizeQuestions,
        randomizeAnswers,
    }).returning()

    redirect(`/admin/exams/${newExam.id}/questions`)
}
