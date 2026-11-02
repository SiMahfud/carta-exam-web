import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Tag, CheckCircle2, Circle, ArrowRight, MessageSquare } from "lucide-react";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";

export interface BankQuestion {
    id: string;
    type: string;
    content: any;
    answerKey?: any;
    tags: string[];
    difficulty: string;
    defaultPoints: number;
    createdAt: Date;
}

interface BankQuestionCardProps {
    question: BankQuestion;
    indexNumber: number;
    onEdit: (question: BankQuestion) => void;
    onDelete: (questionId: string) => void;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

// Helper to extract text from matching items that can be string or { id, text }
function getMatchingItemText(item: unknown): string {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "text" in item) return (item as { text: string }).text;
    return String(item);
}

function getMatchingItemId(item: unknown): string {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        if ("id" in obj) return String(obj.id);
        if ("text" in obj) return String(obj.text);
    }
    return String(item);
}

function AnswerPreview({ question }: { question: BankQuestion }) {
    const { type, content, answerKey } = question;

    // Multiple Choice
    if (type === "mc" && content?.options) {
        const correctIndex = answerKey?.correct;
        return (
            <div className="grid gap-1.5">
                {content.options.map((option: string, idx: number) => {
                    const isCorrect = correctIndex === idx;
                    return (
                        <div
                            key={idx}
                            className={`flex items-start gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                                isCorrect
                                    ? "bg-green-500/10 border border-green-500/30"
                                    : "bg-muted/40"
                            }`}
                        >
                            {isCorrect ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                            )}
                            <span className="font-medium text-muted-foreground mr-1">{OPTION_LABELS[idx]}.</span>
                            <span className={isCorrect ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}>
                                <MathHtmlRenderer html={option} />
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Complex Multiple Choice
    if (type === "complex_mc" && content?.options) {
        const correctIndices: number[] = answerKey?.correctIndices || answerKey?.correct || [];
        return (
            <div className="grid gap-1.5">
                {content.options.map((option: string, idx: number) => {
                    const isCorrect = correctIndices.includes(idx);
                    return (
                        <div
                            key={idx}
                            className={`flex items-start gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                                isCorrect
                                    ? "bg-green-500/10 border border-green-500/30"
                                    : "bg-muted/40"
                            }`}
                        >
                            {isCorrect ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                            )}
                            <span className="font-medium text-muted-foreground mr-1">{OPTION_LABELS[idx]}.</span>
                            <span className={isCorrect ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}>
                                <MathHtmlRenderer html={option} />
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    }

    // True/False
    if (type === "true_false" && content?.options) {
        const correctIndex = answerKey?.correct;
        return (
            <div className="grid gap-1.5">
                {content.options.map((option: string, idx: number) => {
                    const isCorrect = correctIndex === idx;
                    return (
                        <div
                            key={idx}
                            className={`flex items-start gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                                isCorrect
                                    ? "bg-green-500/10 border border-green-500/30"
                                    : "bg-muted/40"
                            }`}
                        >
                            {isCorrect ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                            )}
                            <span className={isCorrect ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                                <MathHtmlRenderer html={option} />
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Matching
    if (type === "matching" && content?.leftItems && content?.rightItems) {
        const leftItems: unknown[] = Array.isArray(content.leftItems) ? content.leftItems : [];
        const rightItems: unknown[] = Array.isArray(content.rightItems) ? content.rightItems : [];

        // Build a map from left item id/index → right item, supporting multiple answer formats:
        // Format 1: { pairs: { "0": 1, ... } } (index-based)
        // Format 2: { matches: [{ leftId, rightId }, ...] } (id-based)
        const resolvedPairs: { leftText: string; rightText: string | null }[] = leftItems.map((leftItem, idx) => {
            let rightText: string | null = null;

            if (answerKey?.matches && Array.isArray(answerKey.matches)) {
                const leftId = getMatchingItemId(leftItem);
                const match = answerKey.matches.find((m: any) => String(m.leftId) === String(leftId) || String(m.leftId) === String(idx));
                if (match) {
                    // Find right item by id
                    const rightItem = rightItems.find((r) => String(getMatchingItemId(r)) === String(match.rightId));
                    if (rightItem) {
                        rightText = getMatchingItemText(rightItem);
                    } else {
                        // Try by index
                        const rIdx = parseInt(String(match.rightId));
                        if (!isNaN(rIdx) && rightItems[rIdx]) {
                            rightText = getMatchingItemText(rightItems[rIdx]);
                        }
                    }
                }
            } else if (answerKey?.pairs) {
                const rIdx = answerKey.pairs[idx.toString()] ?? answerKey.pairs[idx];
                if (rIdx !== undefined && rightItems[rIdx]) {
                    rightText = getMatchingItemText(rightItems[rIdx]);
                }
            }

            return { leftText: getMatchingItemText(leftItem), rightText };
        });

        return (
            <div className="grid gap-1.5">
                {resolvedPairs.map((pair, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm bg-muted/40"
                    >
                        <span className="font-medium text-muted-foreground shrink-0">{idx + 1}.</span>
                        <span className="text-foreground">
                            <MathHtmlRenderer html={pair.leftText} />
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mx-1" />
                        {pair.rightText ? (
                            <span className="text-green-700 dark:text-green-400">
                                <MathHtmlRenderer html={pair.rightText} />
                            </span>
                        ) : (
                            <span className="text-muted-foreground italic">—</span>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    // Short Answer
    if (type === "short" && answerKey?.acceptedAnswers) {
        return (
            <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Jawaban diterima:</span>
                {answerKey.acceptedAnswers.map((answer: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                        {answer}
                    </Badge>
                ))}
            </div>
        );
    }

    // Essay
    if (type === "essay") {
        const maxWords = content?.maxWords;
        const rubric = answerKey?.rubric;
        const modelAnswer = answerKey?.modelAnswer;
        if (!maxWords && !rubric && !modelAnswer) return null;
        return (
            <div className="space-y-1.5 text-sm">
                {maxWords && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Maks. {maxWords} kata</span>
                    </div>
                )}
                {modelAnswer && (
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                        <span className="text-xs font-medium text-muted-foreground block mb-1">Jawaban Model:</span>
                        <span className="text-muted-foreground">
                            <MathHtmlRenderer html={modelAnswer} />
                        </span>
                    </div>
                )}
                {rubric && (
                    <div className="rounded-md bg-muted/40 px-3 py-2">
                        <span className="text-xs font-medium text-muted-foreground block mb-1">Rubrik Penilaian:</span>
                        <span className="text-muted-foreground">
                            <MathHtmlRenderer html={rubric} />
                        </span>
                    </div>
                )}
            </div>
        );
    }

    return null;
}

export function BankQuestionCard({
    question,
    indexNumber,
    onEdit,
    onDelete,
}: BankQuestionCardProps) {
    const getTypeLabel = (type: string) => {
        switch (type) {
            case "mc": return "Pilihan Ganda";
            case "complex_mc": return "PG Kompleks";
            case "matching": return "Menjodohkan";
            case "short": return "Jawaban Singkat";
            case "essay": return "Essay";
            case "true_false": return "Benar/Salah";
            default: return type;
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case "easy": return "bg-green-500/10 text-green-700 dark:text-green-400";
            case "medium": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
            case "hard": return "bg-red-500/10 text-red-700 dark:text-red-400";
            default: return "";
        }
    };

    const answerPreview = <AnswerPreview question={question} />;

    return (
        <Card>
            <CardHeader className={answerPreview ? "pb-2" : undefined}>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">
                                #{indexNumber}
                            </Badge>
                            <Badge>{getTypeLabel(question.type)}</Badge>
                            <Badge className={getDifficultyColor(question.difficulty)}>
                                {question.difficulty}
                            </Badge>
                            <Badge variant="outline">
                                {question.defaultPoints} poin
                            </Badge>
                        </div>
                        <CardTitle className="text-base">
                            <MathHtmlRenderer html={question.content?.question || "No question text"} />
                        </CardTitle>
                        {question.tags && question.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                                {question.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                        <Tag className="h-3 w-3 mr-1" />
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(question)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(question.id)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            {answerPreview && (
                <CardContent className="pt-0 pb-4">
                    {answerPreview}
                </CardContent>
            )}
        </Card>
    );
}
