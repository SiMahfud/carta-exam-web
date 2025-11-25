'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function QuestionPreview({ question }: { question: any }) {
    return (
        <Card className="w-full border-0 shadow-none">
            <CardHeader className="px-0">
                <CardTitle className="flex justify-between items-center text-base">
                    <span>Tampilan Siswa</span>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{question.type.toUpperCase()}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-0">
                <div className="prose max-w-none text-lg">
                    {/* @ts-ignore */}
                    {question.content.question}
                </div>

                {/* Question Inputs */}
                {question.type === "mc" && (
                    <RadioGroup disabled>
                        {/* @ts-ignore */}
                        {question.content.options.map((opt: string, i: number) => (
                            <div key={i} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                                <RadioGroupItem value={i.toString()} id={`opt-${i}`} />
                                <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">{opt}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                )}

                {question.type === "complex_mc" && (
                    <div className="space-y-2">
                        {/* @ts-ignore */}
                        {question.content.options.map((opt: string, i: number) => (
                            <div key={i} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                                <Checkbox id={`chk-${i}`} disabled />
                                <Label htmlFor={`chk-${i}`} className="flex-1 cursor-pointer">{opt}</Label>
                            </div>
                        ))}
                    </div>
                )}

                {question.type === "essay" && (
                    <Textarea
                        placeholder="Tulis jawaban Anda di sini..."
                        className="min-h-[200px]"
                        disabled
                    />
                )}

                {question.type === "short" && (
                    <Input
                        placeholder="Jawaban singkat..."
                        disabled
                    />
                )}

                {question.type === "matching" && (
                    <div className="space-y-2">
                        <p className="text-sm text-gray-500 italic">Mode menjodohkan (Drag & Drop atau Dropdown akan muncul di sini)</p>
                        {/* @ts-ignore */}
                        {question.content.pairs.map((pair: any, i: number) => (
                            <div key={i} className="flex gap-4 items-center p-2 border rounded">
                                <div className="flex-1 font-medium">{pair.left}</div>
                                <div className="w-8 text-center">➡️</div>
                                <div className="flex-1 p-2 bg-gray-50 rounded border border-dashed text-gray-400">
                                    Pilihan Jawaban
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </CardContent>
        </Card>
    )
}
