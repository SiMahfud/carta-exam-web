'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { submitAnswer, finishExam } from "@/actions/exam-session"
import { useRouter } from "next/navigation"

export default function ExamSession({ exam, questions, submission }: { exam: any, questions: any[], submission: any }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60)
    const [isFinished, setIsFinished] = useState(false)
    const router = useRouter()

    // Initialize timer based on start time
    useEffect(() => {
        const startTime = new Date(submission.startTime).getTime()
        const now = new Date().getTime()
        const elapsedSeconds = Math.floor((now - startTime) / 1000)
        const remaining = (exam.durationMinutes * 60) - elapsedSeconds
        setTimeLeft(remaining > 0 ? remaining : 0)
    }, [submission.startTime, exam.durationMinutes])

    // Timer tick
    useEffect(() => {
        if (timeLeft <= 0) {
            handleFinish()
            return
        }
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [timeLeft])

    const currentQuestion = questions[currentIndex]

    // Handle answer change
    const handleAnswer = async (value: any) => {
        const newAnswers = { ...answers, [currentQuestion.id]: value }
        setAnswers(newAnswers)
        // Auto-save to server
        await submitAnswer(submission.id, currentQuestion.id, value)
    }

    const handleFinish = async () => {
        setIsFinished(true)
        await finishExam(submission.id)
        router.push("/exam") // Redirect to result or list
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const canFinish = () => {
        const startTime = new Date(submission.startTime).getTime()
        const now = new Date().getTime()
        const elapsedMinutes = (now - startTime) / 1000 / 60
        return elapsedMinutes >= (exam.minDurationMinutes || 0)
    }

    if (isFinished) return <div className="text-center p-8">Ujian Selesai. Terima kasih.</div>

    return (
        <div className="flex h-screen flex-col md:flex-row">
            {/* Sidebar / Navigation */}
            <aside className="w-full md:w-64 bg-gray-100 p-4 overflow-y-auto border-r">
                <div className="mb-6 text-center">
                    <h2 className="text-xl font-bold">Sisa Waktu</h2>
                    <div className="text-3xl font-mono text-blue-600">{formatTime(timeLeft)}</div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, i) => (
                        <Button
                            key={q.id}
                            variant={currentIndex === i ? "default" : (answers[q.id] ? "secondary" : "outline")}
                            className="w-full h-10 p-0"
                            onClick={() => setCurrentIndex(i)}
                        >
                            {i + 1}
                        </Button>
                    ))}
                </div>
                <div className="mt-8">
                    {canFinish() && currentIndex === questions.length - 1 && (
                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleFinish}>
                            Selesai Ujian
                        </Button>
                    )}
                </div>
            </aside>

            {/* Main Question Area */}
            <main className="flex-1 p-6 md:p-12 overflow-y-auto">
                <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex justify-between">
                            <span>Soal No. {currentIndex + 1}</span>
                            <span className="text-sm text-gray-500">{currentQuestion.type.toUpperCase()}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="prose max-w-none text-lg">
                            {/* @ts-ignore */}
                            {currentQuestion.content.question}
                        </div>

                        {/* Question Inputs */}
                        {currentQuestion.type === "mc" && (
                            <RadioGroup
                                value={answers[currentQuestion.id] || ""}
                                onValueChange={handleAnswer}
                            >
                                {/* @ts-ignore */}
                                {currentQuestion.content.options.map((opt: string, i: number) => (
                                    <div key={i} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                                        <RadioGroupItem value={i.toString()} id={`opt-${i}`} />
                                        <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">{opt}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        )}

                        {currentQuestion.type === "complex_mc" && (
                            <div className="space-y-2">
                                {/* @ts-ignore */}
                                {currentQuestion.content.options.map((opt: string, i: number) => {
                                    const currentAns = answers[currentQuestion.id] || []
                                    return (
                                        <div key={i} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                                            <Checkbox
                                                id={`chk-${i}`}
                                                checked={currentAns.includes(i)}
                                                onCheckedChange={(checked) => {
                                                    const newAns = checked
                                                        ? [...currentAns, i]
                                                        : currentAns.filter((x: number) => x !== i)
                                                    handleAnswer(newAns)
                                                }}
                                            />
                                            <Label htmlFor={`chk-${i}`} className="flex-1 cursor-pointer">{opt}</Label>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {currentQuestion.type === "essay" && (
                            <Textarea
                                value={answers[currentQuestion.id] || ""}
                                onChange={(e) => handleAnswer(e.target.value)}
                                placeholder="Tulis jawaban Anda di sini..."
                                className="min-h-[200px]"
                            />
                        )}

                        {/* Add handlers for Matching and Short Answer as needed */}
                        {currentQuestion.type === "short" && (
                            <Input
                                value={answers[currentQuestion.id] || ""}
                                onChange={(e) => handleAnswer(e.target.value)}
                                placeholder="Jawaban singkat..."
                            />
                        )}

                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                            disabled={currentIndex === 0}
                        >
                            Sebelumnya
                        </Button>
                        <Button
                            onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                            disabled={currentIndex === questions.length - 1}
                        >
                            Selanjutnya
                        </Button>
                    </CardFooter>
                </Card>
            </main>
        </div>
    )
}
