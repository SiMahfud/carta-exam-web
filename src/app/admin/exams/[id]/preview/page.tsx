import { db } from "@/lib/db"
import { questions, exams } from "@/lib/schema"
import { eq, asc } from "drizzle-orm"
import { notFound } from "next/navigation"
import QuestionPreview from "@/components/question-preview"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function ExamPreviewPage({ params }: { params: { id: string } }) {
    const exam = await db.select().from(exams).where(eq(exams.id, params.id)).get()

    if (!exam) {
        notFound()
    }

    const examQuestions = await db.select().from(questions).where(eq(questions.examId, params.id)).orderBy(asc(questions.order))

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-8">
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold">Preview Ujian: {exam.title}</h1>
                    <p className="text-gray-500">{exam.description}</p>
                    <p className="text-sm text-gray-400 mt-1">Total Soal: {examQuestions.length} | Durasi: {exam.durationMinutes} menit</p>
                </div>
                <Link href={`/admin/exams/${params.id}/questions`}>
                    <Button variant="outline">Kembali</Button>
                </Link>
            </div>

            <div className="space-y-8">
                {examQuestions.map((q, index) => (
                    <div key={q.id} className="border rounded-lg p-6 bg-white shadow-sm">
                        <div className="mb-4 font-semibold text-lg border-b pb-2">
                            Soal No. {index + 1}
                        </div>
                        <QuestionPreview question={q} />
                    </div>
                ))}
                {examQuestions.length === 0 && (
                    <p className="text-gray-500 text-center py-12">Belum ada soal dalam ujian ini.</p>
                )}
            </div>
        </div>
    )
}
