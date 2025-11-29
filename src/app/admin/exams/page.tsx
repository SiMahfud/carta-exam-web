import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { db } from "@/lib/db"
import { exams } from "@/lib/schema"
import { desc } from "drizzle-orm"
import { Plus, Search, FileText, Clock, MoreVertical, Edit, Trash2, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default async function ExamListPage() {
    const allExams = await db.select().from(exams).orderBy(desc(exams.createdAt))

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Manajemen Ujian</h2>
                    <p className="text-muted-foreground mt-1">
                        Buat dan kelola paket ujian (Legacy).
                    </p>
                </div>
                <Link href="/admin/exams/create">
                    <Button className="shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" />
                        Buat Ujian Baru
                    </Button>
                </Link>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Cari ujian..." className="pl-9" />
                </div>
                <div className="flex gap-2 ml-auto">
                    <Button variant="outline" size="sm">Filter</Button>
                    <Button variant="outline" size="sm">Sort</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allExams.map((exam) => (
                    <Card key={exam.id} className="group hover:shadow-lg transition-all duration-200 border-slate-200">
                        <CardHeader className="relative pb-3">
                            <div className="flex justify-between items-start">
                                <div className="bg-primary/10 p-2 rounded-lg text-primary mb-3">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <CardTitle className="line-clamp-1 text-lg">{exam.title}</CardTitle>
                            <CardDescription className="line-clamp-2 mt-1 h-10">
                                {exam.description || "Tidak ada deskripsi"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-3">
                            <div className="flex items-center text-sm text-muted-foreground gap-4">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{exam.durationMinutes} menit</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Settings className="h-4 w-4" />
                                    <span>Legacy</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-3 border-t bg-slate-50/50">
                            <div className="flex gap-2 w-full">
                                <Link href={`/admin/exams/${exam.id}`} className="flex-1">
                                    <Button variant="outline" className="w-full text-xs">
                                        Edit Detail
                                    </Button>
                                </Link>
                                <Link href={`/admin/exams/${exam.id}/questions`} className="flex-1">
                                    <Button variant="secondary" className="w-full text-xs bg-slate-200 hover:bg-slate-300 text-slate-800">
                                        Kelola Soal
                                    </Button>
                                </Link>
                            </div>
                        </CardFooter>
                    </Card>
                ))}

                {/* Empty State */}
                {allExams.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-slate-50/50">
                        <div className="bg-slate-100 p-4 rounded-full mb-4">
                            <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">Belum ada ujian</h3>
                        <p className="text-muted-foreground max-w-sm mt-1 mb-6">
                            Mulai dengan membuat ujian baru untuk siswa Anda.
                        </p>
                        <Link href="/admin/exams/create">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Buat Ujian Pertama
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
