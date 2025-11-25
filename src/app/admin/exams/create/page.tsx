import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { createExam } from "@/actions/exam"

export default function CreateExamPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Buat Ujian Baru</CardTitle>
                </CardHeader>
                <form action={createExam}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Judul Ujian</Label>
                            <Input id="title" name="title" required placeholder="Contoh: Ujian Akhir Semester Matematika" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Deskripsi</Label>
                            <Textarea id="description" name="description" placeholder="Deskripsi singkat ujian..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="duration">Durasi (Menit)</Label>
                                <Input id="duration" name="duration" type="number" required min="1" defaultValue="60" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="minDuration">Minimal Waktu (Menit)</Label>
                                <Input id="minDuration" name="minDuration" type="number" min="0" defaultValue="30" />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="randomizeQuestions" name="randomizeQuestions" />
                            <Label htmlFor="randomizeQuestions">Acak Urutan Soal</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="randomizeAnswers" name="randomizeAnswers" />
                            <Label htmlFor="randomizeAnswers">Acak Urutan Jawaban</Label>
                        </div>
                    </CardContent>
                    <div className="p-6 pt-0">
                        <Button type="submit" className="w-full">Simpan & Lanjut ke Soal</Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
