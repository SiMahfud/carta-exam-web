import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag, ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";
import { QuestionRenderer } from "./QuestionRenderer";
import { Question, Answer } from "./types";

interface QuestionCardProps {
    currentQuestion: Question;
    currentAnswer: Answer | null | undefined;
    currentQuestionIndex: number;
    totalQuestions: number;
    examStarted: boolean;
    isFullscreen: boolean;
    fullscreenSupported: boolean;
    enterFullscreen: () => Promise<void>;
    exitFullscreen: () => Promise<void>;
    onToggleFlag: () => void;
    onAnswerChange: (questionId: string, answer: any) => void;
    onNavigate: (index: number) => void;
}

export function QuestionCard({
    currentQuestion,
    currentAnswer,
    currentQuestionIndex,
    totalQuestions,
    examStarted,
    isFullscreen,
    fullscreenSupported,
    enterFullscreen,
    exitFullscreen,
    onToggleFlag,
    onAnswerChange,
    onNavigate,
}: QuestionCardProps) {
    const getTypeBadgeText = (type: string) => {
        switch (type) {
            case "mc": return "Pilihan Ganda";
            case "complex_mc": return "Pilihan Ganda Kompleks";
            case "matching": return "Menjodohkan";
            case "short": return "Jawaban Singkat";
            case "true_false": return "Benar/Salah";
            default: return "Essay";
        }
    };

    return (
        <Card className="h-full flex flex-col shadow-sm border-none lg:border">
            <div className="p-6 border-b flex justify-between items-start gap-4 bg-muted/10">
                <div className="space-y-1">
                    <Badge variant="outline" className="bg-background">
                        {getTypeBadgeText(currentQuestion.type)}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                        Bobot: <span className="font-medium text-foreground">{currentQuestion.points} poin</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {fullscreenSupported && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => isFullscreen ? exitFullscreen() : enterFullscreen()}
                            className="hidden"
                            disabled={examStarted}
                        >
                            {isFullscreen ? (
                                <Minimize className="h-4 w-4" />
                            ) : (
                                <Maximize className="h-4 w-4" />
                            )}
                        </Button>
                    )}
                    <Button
                        variant={currentAnswer?.isFlagged ? "default" : "outline"}
                        size="sm"
                        onClick={onToggleFlag}
                        className={currentAnswer?.isFlagged ? "bg-yellow-500 hover:bg-yellow-600 text-white border-none" : "hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200"}
                    >
                        <Flag className={`mr-2 h-4 w-4 ${currentAnswer?.isFlagged ? "fill-current" : ""}`} />
                        {currentAnswer?.isFlagged ? "Ditandai" : "Tandai"}
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                <div className="prose max-w-none mb-8">
                    <div className="text-lg md:text-xl leading-relaxed text-foreground font-medium">
                        <MathHtmlRenderer html={currentQuestion.questionText} />
                    </div>
                </div>

                <QuestionRenderer
                    question={currentQuestion}
                    answer={currentAnswer?.answer}
                    onChange={(answer) => onAnswerChange(currentQuestion.id, answer)}
                />
            </div>

            <div className="p-4 border-t bg-muted/10 flex justify-between items-center gap-4">
                <Button
                    variant="outline"
                    onClick={() => onNavigate(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="w-32"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Sebelumnya
                </Button>

                <div className="flex gap-1 lg:hidden">
                    {Array.from({ length: totalQuestions }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 w-1.5 rounded-full ${i === currentQuestionIndex ? "bg-primary" : "bg-muted"}`}
                        />
                    )).slice(Math.max(0, currentQuestionIndex - 2), Math.min(totalQuestions, currentQuestionIndex + 3))}
                </div>

                <Button
                    onClick={() => onNavigate(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === totalQuestions - 1}
                    className="w-32 shadow-lg shadow-primary/10"
                >
                    Selanjutnya
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </Card>
    );
}
