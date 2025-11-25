import { db } from "@/lib/db"
import { exams, questions, submissions } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ExamSession from "@/components/exam-session"

export default async function ExamPage({ params }: { params: { id: string } }) {
    const cookieStore = cookies()
    const session = cookieStore.get("user_session")

    if (!session) {
        redirect("/login")
    }

    const user = JSON.parse(session.value)
    const exam = await db.select().from(exams).where(eq(exams.id, params.id)).get()

    if (!exam) {
        return <div>Ujian tidak ditemukan</div>
    }

    // Check for existing submission
    let submission = await db.select().from(submissions).where(
        and(
            eq(submissions.examId, exam.id),
            eq(submissions.userId, user.id)
        )
    ).get()

    let questionList = await db.select().from(questions).where(eq(questions.examId, exam.id)).all()

    // Start exam if not started
    if (!submission) {
        let order = questionList.map(q => q.id)

        if (exam.randomizeQuestions) {
            order = order.sort(() => Math.random() - 0.5)
        }

        const [newSubmission] = await db.insert(submissions).values({
            examId: exam.id,
            userId: user.id,
            questionOrder: order,
            startTime: new Date(),
        }).returning()

        submission = newSubmission
    }

    // Reorder questions based on submission order
    if (submission.questionOrder) {
        const orderMap = new Map((submission.questionOrder as string[]).map((id: string, index: number) => [id, index]))
        questionList = questionList.sort((a, b) => {
            const indexA = orderMap.get(a.id) ?? 999
            const indexB = orderMap.get(b.id) ?? 999
            return indexA - indexB
        })
    }

    return (
        <ExamSession
            exam={exam}
            questions={questionList}
            submission={submission}
            user={user}
        />
    )
}
