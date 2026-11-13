import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Tag, MessageSquare } from "lucide-react";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";
import { MatchingQuestionRenderer } from "@/components/exam/MatchingQuestionRenderer";

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

function resolveMatchingAnswers(leftItems: any[], rightItems: any[], answerKey: any) {
    if (!leftItems || !rightItems || !answerKey) return [];

    const getItemId = (item: any) =>
        typeof item === "object" && item !== null ? (item.id || item.text) : String(item);

    // Format 1: matches array [{ leftId, rightId }]
    if (answerKey.matches && Array.isArray(answerKey.matches)) {
        return answerKey.matches.map((m: any) => {
            const leftItem = leftItems.find((l: any, idx: number) => {
                const id = getItemId(l);
                return String(id) === String(m.leftId) || String(idx) === String(m.leftId);
            });
            const rightItem = rightItems.find((r: any, idx: number) => {
                const id = getItemId(r);
                return String(id) === String(m.rightId) || String(idx) === String(m.rightId);
            });
            return {
                left: leftItem ? getItemId(leftItem) : String(m.leftId),
                right: rightItem ? getItemId(rightItem) : String(m.rightId),
            };
        });
    }

    // Format 2: pairs object { [leftIndex]: rightIndex | rightIndex[] }
    if (answerKey.pairs) {
        const answers: { left: string; right: string }[] = [];
        Object.entries(answerKey.pairs).forEach(([leftIdx, rightIndices]) => {
            const lIdx = parseInt(leftIdx);
            const lItem = leftItems[lIdx];
            if (!lItem) return;
            const lId = getItemId(lItem);

            const rIndices = Array.isArray(rightIndices) ? rightIndices : [rightIndices];
            rIndices.forEach((rIdx: any) => {
                const rNum = typeof rIdx === "number" ? rIdx : parseInt(String(rIdx));
                const rItem = !isNaN(rNum)
                    ? rightItems[rNum]
                    : rightItems.find((r: any) => getItemId(r) === String(rIdx));
                if (rItem) {
                    answers.push({ left: lId, right: getItemId(rItem) });
                }
            });
        });
        return answers;
    }

    return [];
}

function AnswerPreview({ question }: { question: BankQuestion }) {
    const { type, content, answerKey } = question;

    // Multiple Choice
    if (type === "mc" && content?.options) {
        let correctLabel = answerKey?.correct;
        if (typeof correctLabel === "number" || (!isNaN(Number(correctLabel)) && correctLabel !== "")) {
            correctLabel = OPTION_LABELS[Number(correctLabel)];
        }

        return (
            <div className="space-y-3 pt-1">
                <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                    💡 Cara menjawab: Klik salah satu pilihan jawaban
                </p>
                <div className="space-y-2">
                    {content.options.map((option: string, idx: number) => {
                        const label = OPTION_LABELS[idx];
                        const isCorrect = (
                            answerKey?.correct === idx ||
                            answerKey?.correct === label ||
                            correctLabel === label
                        );

                        return (
                            <div
                                key={idx}
                                className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${
                                    isCorrect
                                        ? "bg-green-100/70 dark:bg-green-950/40 border-green-500 dark:border-green-600"
                                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name={`q-preview-${question.id}`}
                                    checked={isCorrect}
                                    readOnly
                                    className="mt-0.5 accent-primary pointer-events-none"
                                />
                                <span className="font-semibold text-sm min-w-[20px]">{label}.</span>
                                <div className="text-sm flex-1">
                                    <MathHtmlRenderer html={option} />
                                </div>
                                {isCorrect && (
                                    <span className="ml-auto text-green-700 dark:text-green-400 font-semibold text-xs whitespace-nowrap">
                                        ✓ BENAR
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Complex Multiple Choice
    if (type === "complex_mc" && content?.options) {
        let correctLabels: string[] = [];
        const rawAnswers = answerKey?.correctIndices || answerKey?.correct || [];
        if (Array.isArray(rawAnswers)) {
            correctLabels = rawAnswers.map((ans: any) => {
                if (typeof ans === "number" || (!isNaN(Number(ans)) && ans !== "")) {
                    return OPTION_LABELS[Number(ans)];
                }
                return String(ans);
            });
        }

        return (
            <div className="space-y-3 pt-1">
                <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                    💡 Cara menjawab: Centang satu atau lebih pilihan jawaban yang benar
                </p>
                <div className="space-y-2">
                    {content.options.map((option: string, idx: number) => {
                        const label = OPTION_LABELS[idx];
                        const isCorrect = (
                            correctLabels.includes(label) ||
                            correctLabels.includes(String(idx))
                        );

                        return (
                            <div
                                key={idx}
                                className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${
                                    isCorrect
                                        ? "bg-green-100/70 dark:bg-green-950/40 border-green-500 dark:border-green-600"
                                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isCorrect}
                                    readOnly
                                    className="mt-0.5 accent-primary pointer-events-none"
                                />
                                <span className="font-semibold text-sm min-w-[20px]">{label}.</span>
                                <div className="text-sm flex-1">
                                    <MathHtmlRenderer html={option} />
                                </div>
                                {isCorrect && (
                                    <span className="ml-auto text-green-700 dark:text-green-400 font-semibold text-xs whitespace-nowrap">
                                        ✓ BENAR
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // True/False
    if (type === "true_false") {
        return (
            <div className="space-y-3 pt-1">
                <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                    💡 Cara menjawab: Pilih Benar atau Salah
                </p>
                <div className="space-y-2">
                    {["Benar", "Salah"].map((opt, i) => {
                        const isCorrect = (
                            (answerKey?.correct === 0 && i === 0) ||
                            (answerKey?.correct === 1 && i === 1) ||
                            (String(answerKey?.correct).toLowerCase() === "true" && i === 0) ||
                            (String(answerKey?.correct).toLowerCase() === "false" && i === 1) ||
                            (String(answerKey?.correct).toLowerCase() === "benar" && i === 0) ||
                            (String(answerKey?.correct).toLowerCase() === "salah" && i === 1)
                        );

                        return (
                            <div
                                key={i}
                                className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${
                                    isCorrect
                                        ? "bg-green-100/70 dark:bg-green-950/40 border-green-500 dark:border-green-600"
                                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name={`tf-preview-${question.id}`}
                                    checked={!!isCorrect}
                                    readOnly
                                    className="mt-0.5 accent-primary pointer-events-none"
                                />
                                <span className="font-semibold text-sm min-w-[20px]">{opt === "Benar" ? "B." : "S."}</span>
                                <div className="text-sm font-medium flex-1">{opt}</div>
                                {isCorrect && (
                                    <span className="ml-auto text-green-700 dark:text-green-400 font-semibold text-xs whitespace-nowrap">
                                        ✓ BENAR
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Matching
    if (type === "matching") {
        const leftItems: any[] = Array.isArray(content?.leftItems) ? content.leftItems : [];
        const rightItems: any[] = Array.isArray(content?.rightItems) ? content.rightItems : [];
        const matchingAnswers = resolveMatchingAnswers(leftItems, rightItems, answerKey);

        if (leftItems.length === 0 || rightItems.length === 0) {
            return (
                <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                    Belum ada data item menjodohkan.
                </div>
            );
        }

        return (
            <div className="space-y-3 pt-1">
                <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                    💡 Cara menjawab: Pasangkan item kiri dengan item kanan yang sesuai
                </p>
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Kunci Jawaban (Pasangan Benar):
                    </span>
                    <Badge variant="outline" className="text-[11px] font-normal">
                        {matchingAnswers.length} Pasangan
                    </Badge>
                </div>
                <div className="border rounded-lg p-4 bg-muted/10 overflow-hidden">
                    <MatchingQuestionRenderer
                        question={{
                            id: `bank-q-${question.id}`,
                            questionText: "",
                            leftItems,
                            rightItems,
                        }}
                        answer={matchingAnswers}
                        readOnly={true}
                    />
                </div>
            </div>
        );
    }

    // Short Answer
    if (type === "short") {
        const answers: string[] = answerKey?.acceptedAnswers || [];
        return (
            <div className="space-y-2 pt-1">
                <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                    💡 Cara menjawab: Ketik jawaban singkat Anda pada kotak di bawah
                </p>
                <input
                    type="text"
                    value={answers.join(" / ")}
                    placeholder="Ketik jawaban Anda di sini..."
                    className="w-full p-2.5 border rounded-lg bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300 font-semibold text-sm"
                    disabled
                    readOnly
                />
                {answers.length > 0 && (
                    <p className="text-xs text-green-700 dark:text-green-400 italic">
                        🔑 Kunci jawaban yang diterima: {answers.join(", ")}
                    </p>
                )}
            </div>
        );
    }

    // Essay
    if (type === "essay") {
        const maxWords = content?.maxWords;
        const rubric = answerKey?.rubric;
        const modelAnswer = answerKey?.modelAnswer;
        const guidelines = content?.guidelines;

        return (
            <div className="space-y-2 pt-1">
                <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                    💡 Cara menjawab: Tulis jawaban uraian Anda dengan lengkap dan jelas
                </p>
                <textarea
                    placeholder="Area jawaban uraian siswa..."
                    rows={3}
                    className="w-full p-2.5 border rounded-lg resize-none bg-muted/20 text-sm text-muted-foreground"
                    disabled
                    readOnly
                />
                {maxWords && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Batas maksimal: {maxWords} kata</span>
                    </div>
                )}
                {(guidelines || rubric || modelAnswer) && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg space-y-1.5 text-xs">
                        {guidelines && (
                            <div>
                                <span className="font-semibold text-blue-900 dark:text-blue-200">Panduan Penilaian: </span>
                                <span className="text-blue-800 dark:text-blue-300">{guidelines}</span>
                            </div>
                        )}
                        {modelAnswer && (
                            <div>
                                <span className="font-semibold text-blue-900 dark:text-blue-200">Model Jawaban: </span>
                                <div className="text-blue-800 dark:text-blue-300 mt-0.5">
                                    <MathHtmlRenderer html={modelAnswer} />
                                </div>
                            </div>
                        )}
                        {rubric && (
                            <div>
                                <span className="font-semibold text-blue-900 dark:text-blue-200">Rubrik: </span>
                                <div className="text-blue-800 dark:text-blue-300 mt-0.5">
                                    <MathHtmlRenderer html={rubric} />
                                </div>
                            </div>
                        )}
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
