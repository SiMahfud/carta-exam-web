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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Tag as TagIcon, Trash2 } from "lucide-react";

interface QuestionEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bankId: string;
    onSuccess: () => void;
    availableTags: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questionToEdit?: any;
}

export function ShortAnswerEditor({
    open,
    onOpenChange,
    bankId,
    onSuccess,
    availableTags,
    questionToEdit,
}: QuestionEditorProps) {
    const [formData, setFormData] = useState({
        question: "",
        acceptedAnswers: [""], // At least one answer
        caseSensitive: false,
        exactMatch: true,
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
                    acceptedAnswers: questionToEdit.answerKey.acceptedAnswers || [""],
                    caseSensitive: questionToEdit.content.caseSensitive,
                    exactMatch: questionToEdit.content.exactMatch,
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

        if (formData.acceptedAnswers.filter(a => a.trim()).length === 0) {
            alert("Tambahkan minimal satu jawaban yang diterima");
            return;
        }

        const content = {
            question: formData.question,
            caseSensitive: formData.caseSensitive,
            exactMatch: formData.exactMatch,
        };

        const answerKey = {
            acceptedAnswers: formData.acceptedAnswers.filter(a => a.trim()),
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
                    type: "short",
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
            acceptedAnswers: [""],
            caseSensitive: false,
            exactMatch: true,
            difficulty: "medium",
            defaultPoints: 1,
            tags: [],
        });
        setNewTag("");
    };

    const addAnswer = () => {
        setFormData({
            ...formData,
            acceptedAnswers: [...formData.acceptedAnswers, ""],
        });
    };

    const updateAnswer = (index: number, value: string) => {
        const newAnswers = [...formData.acceptedAnswers];
        newAnswers[index] = value;
        setFormData({ ...formData, acceptedAnswers: newAnswers });
    };

    const removeAnswer = (index: number) => {
        if (formData.acceptedAnswers.length > 1) {
            const newAnswers = formData.acceptedAnswers.filter((_, i) => i !== index);
            setFormData({ ...formData, acceptedAnswers: newAnswers });
        }
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {questionToEdit ? "Edit Soal Isian Singkat" : "Tambah Soal Isian Singkat"}
                    </DialogTitle>
                    <DialogDescription>
                        {questionToEdit ? "Edit detail soal isian singkat" : "Buat soal isian singkat dengan beberapa kemungkinan jawaban"}
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

                        {/* Accepted Answers */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>Jawaban yang Diterima *</Label>
                                <Button
                                    type="button"
                                    onClick={addAnswer}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Tambah Jawaban
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {formData.acceptedAnswers.map((answer, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <Input
                                            value={answer}
                                            onChange={(e) =>
                                                updateAnswer(index, e.target.value)
                                            }
                                            placeholder={`Jawaban ${index + 1}`}
                                            required
                                        />
                                        {formData.acceptedAnswers.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeAnswer(index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="caseSensitive"
                                    checked={formData.caseSensitive}
                                    onCheckedChange={(checked) =>
                                        setFormData({
                                            ...formData,
                                            caseSensitive: checked as boolean,
                                        })
                                    }
                                />
                                <Label htmlFor="caseSensitive" className="cursor-pointer">
                                    Case Sensitive (membedakan huruf besar/kecil)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="exactMatch"
                                    checked={formData.exactMatch}
                                    onCheckedChange={(checked) =>
                                        setFormData({
                                            ...formData,
                                            exactMatch: checked as boolean,
                                        })
                                    }
                                />
                                <Label htmlFor="exactMatch" className="cursor-pointer">
                                    Exact Match (harus sama persis, jika tidak maka hanya mengandung)
                                </Label>
                            </div>
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
