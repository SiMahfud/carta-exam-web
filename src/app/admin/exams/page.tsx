import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/db"
import { exams } from "@/lib/schema"
import { desc } from "drizzle-orm"

export default async function ExamListPage() {
    const allExams = await db.select().from(exams).orderBy(desc(exams.createdAt))

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Manajemen Ujian</h2>
                <Link href="/admin/exams/create">
                    <Button>Buat Ujian Baru</Button>
                </Link>
            </div>

            <div className="grid gap-4">
                {allExams.map((exam) => (
                    <Card key={exam.id}>
                        <CardHeader>
                            <CardTitle>{exam.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-500">{exam.description}</p>
                            <div className="mt-4 flex gap-2">
                                <Link href={`/admin/exams/${exam.id}`}>
                                    <Button variant="outline">Edit</Button>
                                </Link>
                                <Link href={`/admin/exams/${exam.id}/questions`}>
                                    <Button variant="secondary">Kelola Soal</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {allExams.length === 0 && (
                    <p className="text-gray-500 text-center py-8">Belum ada ujian yang dibuat.</p>
                )}
            </div>
        </div>
    )
}
