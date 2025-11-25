'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { createQuestion } from "@/actions/question"

export default function QuestionForm({ examId }: { examId: string }) {
    const [type, setType] = useState("mc")
    const [options, setOptions] = useState(["", "", "", "", ""])
    const [correctMC, setCorrectMC] = useState("0")
    const [correctComplex, setCorrectComplex] = useState<number[]>([])
    const [pairs, setPairs] = useState([{ left: "", right: "" }])
    const [shortAnswers, setShortAnswers] = useState([""])

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options]
        newOptions[index] = value
        setOptions(newOptions)
    }

    const toggleComplex = (index: number) => {
        if (correctComplex.includes(index)) {
            setCorrectComplex(correctComplex.filter(i => i !== index))
        } else {
            setCorrectComplex([...correctComplex, index])
        }
    }

    const addPair = () => setPairs([...pairs, { left: "", right: "" }])
    const updatePair = (index: number, field: 'left' | 'right', value: string) => {
        const newPairs = [...pairs]
        newPairs[index][field] = value
        setPairs(newPairs)
    }

    return (
        <Card>
            <CardContent className="p-6">
                <form action={createQuestion} className="space-y-6">
                    <input type="hidden" name="examId" value={examId} />
                    <input type="hidden" name="type" value={type} />

                    {/* JSON Data Hidden Inputs */}
                    <input type="hidden" name="options" value={JSON.stringify(options)} />
                    <input type="hidden" name="correctMC" value={correctMC} />
                    <input type="hidden" name="correctComplex" value={JSON.stringify(correctComplex)} />
                    <input type="hidden" name="pairs" value={JSON.stringify(pairs)} />
                    <input type="hidden" name="shortAnswers" value={JSON.stringify(shortAnswers)} />

                    <div className="space-y-2">
                        <Label>Tipe Soal</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mc">Pilihan Ganda</SelectItem>
                                <SelectItem value="complex_mc">Pilihan Ganda Kompleks</SelectItem>
                                <SelectItem value="matching">Menjodohkan</SelectItem>
                                <SelectItem value="short">Isian Singkat</SelectItem>
                                <SelectItem value="essay">Uraian</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Pertanyaan</Label>
                        <Textarea name="question" required placeholder="Tulis pertanyaan di sini..." className="min-h-[100px]" />
                    </div>

                    {type === "mc" && (
                        <div className="space-y-4">
                            <Label>Pilihan Jawaban (Pilih satu yang benar)</Label>
                            <RadioGroup value={correctMC} onValueChange={setCorrectMC}>
                                {options.map((opt, i) => (
                                    <div key={i} className="flex items-center space-x-2">
                                        <RadioGroupItem value={i.toString()} id={`opt-${i}`} />
                                        <Input
                                            value={opt}
                                            onChange={(e) => handleOptionChange(i, e.target.value)}
                                            placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                                            required
                                        />
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    )}

                    {type === "complex_mc" && (
                        <div className="space-y-4">
                            <Label>Pilihan Jawaban (Pilih lebih dari satu yang benar)</Label>
                            {options.map((opt, i) => (
                                <div key={i} className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={correctComplex.includes(i)}
                                        onCheckedChange={() => toggleComplex(i)}
                                    />
                                    <Input
                                        value={opt}
                                        onChange={(e) => handleOptionChange(i, e.target.value)}
                                        placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {type === "matching" && (
                        <div className="space-y-4">
                            <Label>Pasangan Jawaban</Label>
                            {pairs.map((pair, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <Input
                                        value={pair.left}
                                        onChange={(e) => updatePair(i, 'left', e.target.value)}
                                        placeholder="Kiri (Pertanyaan)"
                                    />
                                    <span>-</span>
                                    <Input
                                        value={pair.right}
                                        onChange={(e) => updatePair(i, 'right', e.target.value)}
                                        placeholder="Kanan (Jawaban)"
                                    />
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={addPair}>Tambah Pasangan</Button>
                        </div>
                    )}

                    {type === "short" && (
                        <div className="space-y-4">
                            <Label>Kunci Jawaban (Bisa lebih dari satu variasi)</Label>
                            {shortAnswers.map((ans, i) => (
                                <Input
                                    key={i}
                                    value={ans}
                                    onChange={(e) => {
                                        const newAns = [...shortAnswers]
                                        newAns[i] = e.target.value
                                        setShortAnswers(newAns)
                                    }}
                                    placeholder="Jawaban Benar"
                                />
                            ))}
                            <Button type="button" variant="outline" onClick={() => setShortAnswers([...shortAnswers, ""])}>Tambah Variasi</Button>
                        </div>
                    )}

                    <Button type="submit" className="w-full">Simpan Soal</Button>
                </form>
            </CardContent>
        </Card>
    )
}
