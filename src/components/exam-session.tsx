'use client'

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { submitAnswer, finishExam, logViolation, flagQuestion } from "@/actions/exam-session"
import { useRouter } from "next/navigation"
import { useLockdownMode, type ViolationEvent } from "@/lib/lockdown"
import { ViolationWarning } from "@/components/violation-warning"
import { Flag, AlertCircle } from "lucide-react"

export default function ExamSession({ exam, questions, submission, user }: { exam: any, questions: any[], submission: any, user: any }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set())
    const totalDurationMinutes = exam.durationMinutes + (submission.bonusTimeMinutes || 0)
    const [timeLeft, setTimeLeft] = useState(totalDurationMinutes * 60)
    const [isFinished, setIsFinished] = useState(false)
    const [violationCount, setViolationCount] = useState(submission.violationCount || 0)
    const [showViolationWarning, setShowViolationWarning] = useState(false)
    const [currentViolation, setCurrentViolation] = useState<ViolationEvent | null>(null)
    const router = useRouter()

    // Initialize timer based on start time
    useEffect(() => {
        const startTime = new Date(submission.startTime).getTime()
        const now = new Date().getTime()
        const elapsedSeconds = Math.floor((now - startTime) / 1000)
        const remaining = (totalDurationMinutes * 60) - elapsedSeconds
        setTimeLeft(remaining > 0 ? remaining : 0)
    }, [submission.startTime, totalDurationMinutes])

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

    // Lockdown integration
    const handleViolation = useCallback(async (event: ViolationEvent) => {
        setCurrentViolation(event)
        setShowViolationWarning(true)

        const result = await logViolation(submission.id, event.type, event.details)
        if (result.success && result.violationCount) {
            setViolationCount(result.violationCount)

            // Auto-terminate if max violations reached
            if (result.violationCount >= (exam.maxViolations || 3)) {
                setTimeout(() => handleFinish(), 2000)
            }
        }
    }, [submission.id, exam.maxViolations])

    // Enable lockdown if exam requires it
    useLockdownMode(
        user?.name || 'Siswa',
        handleViolation,
        exam.enableLockdown !== false
    )

    // Handle answer change
    const handleAnswer = async (value: any) => {
        const newAnswers = { ...answers, [currentQuestion.id]: value }
        setAnswers(newAnswers)
        // Auto-save to server with flag status
        const isFlagged = flaggedQuestions.has(currentQuestion.id)
        await submitAnswer(submission.id, currentQuestion.id, value, isFlagged)
    }

    // Handle question flagging
    const handleToggleFlag = async () => {
        const newFlagged = new Set(flaggedQuestions)
        const isFlagged = newFlagged.has(currentQuestion.id)

        if (isFlagged) {
            newFlagged.delete(currentQuestion.id)
        } else {
            newFlagged.add(currentQuestion.id)
        }

        setFlaggedQuestions(newFlagged)
        await flagQuestion(submission.id, currentQuestion.id, !isFlagged)
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
                    {questions.map((q, i) => {
                        const isAnswered = answers[q.id] !== undefined
                        const isFlagged = flaggedQuestions.has(q.id)
                        const isCurrent = currentIndex === i

                        let bgColor = 'bg-white'
                        let textColor = 'text-gray-700'

                        if (isCurrent) {
                            bgColor = 'bg-blue-600'
                            textColor = 'text-white'
                        } else if (isFlagged) {
                            bgColor = 'bg-yellow-400'
                            textColor = 'text-gray-900'
                        } else if (isAnswered) {
                            bgColor = 'bg-green-500'
                            textColor = 'text-white'
                        }

                        return (
                            <Button
                                key={q.id}
                                variant="outline"
                                className={`w-full h-10 p-0 ${bgColor} ${textColor} hover:opacity-80`}
                                onClick={() => setCurrentIndex(i)}
                            >
                                {i + 1}
                            </Button>
                        )
                    })}
                </div>
                <div className="mt-4 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span>Sudah Dijawab</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                        <span>Ragu-Ragu</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border rounded"></div>
                        <span>Belum Dijawab</span>
                    </div>
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
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                                disabled={currentIndex === 0}
                            >
                                Sebelumnya
                            </Button>
                            <Button
                                variant={flaggedQuestions.has(currentQuestion.id) ? "default" : "outline"}
                                onClick={handleToggleFlag}
                                className={flaggedQuestions.has(currentQuestion.id) ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                            >
                                <Flag className="w-4 h-4 mr-2" />
                                {flaggedQuestions.has(currentQuestion.id) ? 'Ragu-Ragu' : 'Tandai Ragu'}
                            </Button>
                        </div>
                        <Button
                            onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                            disabled={currentIndex === questions.length - 1}
                        >
                            Selanjutnya
                        </Button>
                    </CardFooter>
                </Card>
            </main>

            {/* Violation Warning Modal */}
            {currentViolation && (
                <ViolationWarning
                    open={showViolationWarning}
                    violationType={currentViolation.type}
                    violationCount={violationCount}
                    maxViolations={exam.maxViolations || 3}
                    onClose={() => setShowViolationWarning(false)}
                    onTerminate={handleFinish}
                />
            )}

            {/* Violation Counter Display */}
            {exam.enableLockdown && violationCount > 0 && (
                <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Pelanggaran: {violationCount}/{exam.maxViolations || 3}</span>
                </div>
            )}
        </div>
    )
}
