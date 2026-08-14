import React from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Tag } from "lucide-react";
import { MathHtmlRenderer } from "@/components/ui/math-html-renderer";

export interface BankQuestion {
    id: string;
    type: string;
    content: any;
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

    return (
        <Card>
            <CardHeader>
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
        </Card>
    );
}
