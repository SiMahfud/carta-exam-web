import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/db"
import { questions, exams } from "@/lib/schema"
import { eq, asc } from "drizzle-orm"
import { notFound } from "next/navigation"

export default async function QuestionManagerPage({ params }: { params: { id: string } }) {
    const exam = await db.select().from(exams).where(eq(exams.id, params.id)).get()

    if (!exam) {
        notFound()
    }

    const examQuestions = await db.select().from(questions).where(eq(questions.examId, params.id)).orderBy(asc(questions.order))

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold">Kelola Soal</h2>
                    <p className="text-gray-500">{exam.title}</p>
                </div>
                <div className="flex gap-2">
                    <Link href={`/admin/exams/${params.id}/preview`}>
                        <Button variant="secondary">Preview Ujian</Button>
                    </Link>
                    <Link href={`/admin/exams/${params.id}/questions/add`}>
                        <Button>Tambah Soal</Button>
                    </Link>
                </div>
            </div>

            <div className="space-y-4">
                {examQuestions.map((q: typeof examQuestions[0], index: number) => (
                    <Card key={q.id}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium">
                                No. {index + 1} ({q.type.toUpperCase()})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="prose max-w-none line-clamp-2">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                <div dangerouslySetInnerHTML={{ __html: (q.content as any).question }} />
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Button variant="outline" size="sm">Edit</Button>
                                <Button variant="destructive" size="sm">Hapus</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {examQuestions.length === 0 && (
                    <p className="text-gray-500 text-center py-8">Belum ada soal.</p>
                )}
            </div>
        </div>
    )
}
