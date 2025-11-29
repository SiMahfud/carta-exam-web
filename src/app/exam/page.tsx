import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/db"
import { exams } from "@/lib/schema"
import { desc } from "drizzle-orm"
import { Clock, FileText, ArrowRight } from "lucide-react"

export default async function StudentExamListPage() {
    const availableExams = await db.select().from(exams).orderBy(desc(exams.createdAt))

    return (
        <div className="container mx-auto py-12 px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Daftar Ujian</h1>
                    <p className="text-muted-foreground mt-1">Pilih ujian yang tersedia untuk dikerjakan.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {availableExams.map((exam) => (
                    <Card key={exam.id} className="flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <CardHeader>
                            <CardTitle className="line-clamp-2">{exam.title}</CardTitle>
                            <CardDescription className="line-clamp-2 mt-2">{exam.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span>{exam.durationMinutes} menit</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span>Ujian</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/exam/${exam.id}`} className="w-full">
                                <Button className="w-full shadow-md shadow-primary/20 group">
                                    Mulai Ujian
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
                {availableExams.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-muted/30 rounded-xl border-dashed border-2">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">Tidak ada ujian tersedia</h3>
                        <p className="text-muted-foreground">Silakan cek kembali nanti.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
