import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/db"
import { exams } from "@/lib/schema"
import { desc } from "drizzle-orm"

export default async function StudentExamListPage() {
    const availableExams = await db.select().from(exams).orderBy(desc(exams.createdAt))

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Daftar Ujian</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableExams.map((exam) => (
                    <Card key={exam.id}>
                        <CardHeader>
                            <CardTitle>{exam.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-500 mb-4">{exam.description}</p>
                            <p className="text-sm text-gray-400 mb-4">Durasi: {exam.durationMinutes} menit</p>
                            <Link href={`/exam/${exam.id}`}>
                                <Button className="w-full">Mulai Ujian</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ))}
                {availableExams.length === 0 && (
                    <p className="text-gray-500">Tidak ada ujian yang tersedia saat ini.</p>
                )}
            </div>
        </div>
    )
}
