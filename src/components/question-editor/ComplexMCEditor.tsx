"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Tag as TagIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface QuestionEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bankId: string;
    onSuccess: () => void;
    availableTags: string[];
    questionToEdit?: any;
}

export function ComplexMCEditor({
    open,
    onOpenChange,
    bankId,
    onSuccess,
    availableTags,
    questionToEdit,
}: QuestionEditorProps) {
    const [formData, setFormData] = useState({
        question: "",
        options: ["", ""], // Minimum 2 options
        correctAnswers: [] as number[], // Multiple correct answers
        difficulty: "medium",
        defaultPoints: 1,
        tags: [] as string[],
    });
    const [newTag, setNewTag] = useState("");

    useEffect(() => {
        if (open) {
            if (questionToEdit) {
                setFormData({
                    question: questionToEdit.content.question,
                    options: questionToEdit.content.options || ["", ""],
                    correctAnswers: questionToEdit.answerKey.correct || [],
                    difficulty: questionToEdit.difficulty,
                    defaultPoints: questionToEdit.defaultPoints,
                    tags: questionToEdit.tags || [],
                });
            } else {
                resetForm();
            }
        }
    }, [open, questionToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.correctAnswers.length === 0) {
            alert("Pilih minimal satu jawaban yang benar");
            return;
        }

        const content = {
            question: formData.question,
            options: formData.options,
        };

        const answerKey = {
            correct: formData.correctAnswers, // Array of indices
        };

        try {
            const url = questionToEdit
                ? `/api/question-banks/${bankId}/questions/${questionToEdit.id}`
                : `/api/question-banks/${bankId}/questions`;

            const method = questionToEdit ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "complex_mc",
                    content,
                    answerKey,
                    tags: formData.tags,
                    difficulty: formData.difficulty,
                    defaultPoints: formData.defaultPoints,
                }),
            });

            if (response.ok) {
                resetForm();
                onSuccess();
                onOpenChange(false);
            } else {
                alert("Failed to save question");
            }
        } catch (error) {
            console.error("Error saving question:", error);
            alert("Failed to save question");
        }
    };

    const resetForm = () => {
        setFormData({
            question: "",
            options: ["", ""],
            correctAnswers: [],
            difficulty: "medium",
            defaultPoints: 1,
            tags: [],
        });
        setNewTag("");
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData({ ...formData, options: newOptions });
    };

    const toggleCorrectAnswer = (index: number) => {
        const newCorrectAnswers = formData.correctAnswers.includes(index)
            ? formData.correctAnswers.filter((i) => i !== index)
            : [...formData.correctAnswers, index];
        setFormData({ ...formData, correctAnswers: newCorrectAnswers });
    };

    const addTag = () => {
        if (newTag && !formData.tags.includes(newTag)) {
            setFormData({ ...formData, tags: [...formData.tags, newTag] });
            setNewTag("");
        }
    };

    const removeTag = (tag: string) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter((t) => t !== tag),
        });
    };

    const addExistingTag = (tag: string) => {
        if (!formData.tags.includes(tag)) {
            setFormData({ ...formData, tags: [...formData.tags, tag] });
        }
    };

    const addOption = () => {
        if (formData.options.length < 10) {
            setFormData({
                ...formData,
                options: [...formData.options, ""]
            });
        }
    };

    const removeOption = (index: number) => {
        if (formData.options.length > 2) {
            const newOptions = formData.options.filter((_, i) => i !== index);
            // Update correctAnswers: remove if it was marked correct, adjust indices
            const newCorrectAnswers = formData.correctAnswers
                .filter(i => i !== index) // Remove the deleted option
                .map(i => i > index ? i - 1 : i); // Adjust indices
            setFormData({
                ...formData,
                options: newOptions,
                correctAnswers: newCorrectAnswers
            });
        }
    };

    // Helper function to get letter for option index
    const getOptionLetter = (index: number) => {
        return String.fromCharCode(65 + index); // A=65, B=66, etc.
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {questionToEdit ? "Edit Soal Pilihan Ganda Kompleks" : "Tambah Soal Pilihan Ganda Kompleks"}
                    </DialogTitle>
                    <DialogDescription>
                        {questionToEdit ? "Edit detail soal PG kompleks" : "Buat soal PG kompleks dengan lebih dari satu jawaban benar"}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Question Text */}
                        <div>
                            <Label htmlFor="question">Pertanyaan *</Label>
                            <RichTextEditor
                                value={formData.question}
                                onChange={(value) =>
                                    setFormData({ ...formData, question: value })
                                }
                                placeholder="Masukkan pertanyaan..."
                            />
                        </div>

                        {/* Options */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>Opsi Jawaban * (Minimal 2, Maksimal 10)</Label>
                                <Button
                                    type="button"
                                    onClick={addOption}
                                    variant="outline"
                                    size="sm"
                                    disabled={formData.options.length >= 10}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Tambah Opsi
                                </Button>
                            </div>
                            <div className="space-y-2 mt-2">
                                {formData.options.map((option, index) => (
                                    <div key={index} className="flex gap-2 items-start">
                                        <Badge variant="outline" className="w-8 flex-shrink-0 mt-2">
                                            {getOptionLetter(index)}
                                        </Badge>
                                        <div className="flex-1">
                                            <RichTextEditor
                                                value={option}
                                                onChange={(value) =>
                                                    updateOption(index, value)
                                                }
                                                placeholder={`Opsi ${getOptionLetter(index)}`}
                                            />
                                        </div>
                                        <Checkbox
                                            checked={formData.correctAnswers.includes(index)}
                                            onCheckedChange={() => toggleCorrectAnswer(index)}
                                            className="mt-2"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeOption(index)}
                                            disabled={formData.options.length <= 2}
                                            className="flex-shrink-0 mt-1"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Centang checkbox untuk menandai jawaban yang benar (bisa lebih dari satu)
                            </p>
                        </div>

                        {/* Difficulty and Points */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="difficulty">Tingkat Kesulitan</Label>
                                <Select
                                    value={formData.difficulty}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, difficulty: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Mudah</SelectItem>
                                        <SelectItem value="medium">Sedang</SelectItem>
                                        <SelectItem value="hard">Sulit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="points">Poin Default</Label>
                                <Input
                                    id="points"
                                    type="number"
                                    min="1"
                                    value={formData.defaultPoints}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            defaultPoints: parseInt(e.target.value),
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <Label>Tags</Label>
                            <div className="flex gap-2 mt-2">
                                <Input
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    placeholder="Tambah tag baru..."
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addTag();
                                        }
                                    }}
                                />
                                <Button type="button" onClick={addTag} variant="outline">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.tags.map((tag) => (
                                        <Badge key={tag} className="cursor-pointer">
                                            <TagIcon className="h-3 w-3 mr-1" />
                                            {tag}
                                            <X
                                                className="h-3 w-3 ml-1"
                                                onClick={() => removeTag(tag)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            {availableTags.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Tag yang tersedia:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {availableTags
                                            .filter((tag) => !formData.tags.includes(tag))
                                            .map((tag) => (
                                                <Badge
                                                    key={tag}
                                                    variant="outline"
                                                    className="cursor-pointer"
                                                    onClick={() => addExistingTag(tag)}
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    {tag}
                                                </Badge>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                resetForm();
                                onOpenChange(false);
                            }}
                        >
                            Batal
                        </Button>
                        <Button type="submit">{questionToEdit ? "Simpan Perubahan" : "Simpan Soal"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
