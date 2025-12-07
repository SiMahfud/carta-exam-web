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
import { Plus, X, Tag as TagIcon, Trash2, ArrowRight } from "lucide-react";

interface QuestionEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bankId: string;
    onSuccess: () => void;
    availableTags: string[];
    questionToEdit?: any;
}

export function MatchingEditor({
    open,
    onOpenChange,
    bankId,
    onSuccess,
    availableTags,
    questionToEdit,
}: QuestionEditorProps) {
    const [formData, setFormData] = useState({
        question: "",
        leftItems: ["", ""], // Minimum 2 items
        rightItems: ["", ""], // Minimum 2 items
        pairs: {} as { [key: number]: number[] }, // leftIndex -> rightIndex[]
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
                    leftItems: (questionToEdit.content.leftItems || []).map((item: any) => typeof item === 'object' && item !== null ? item.text : item),
                    rightItems: (questionToEdit.content.rightItems || []).map((item: any) => typeof item === 'object' && item !== null ? item.text : item),
                    pairs: normalizePairs(questionToEdit.answerKey, questionToEdit.content.leftItems, questionToEdit.content.rightItems),
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

        // Validate all items have text
        const hasEmptyLeft = formData.leftItems.some(item => !item.trim());
        const hasEmptyRight = formData.rightItems.some(item => !item.trim());

        if (hasEmptyLeft || hasEmptyRight) {
            alert("Semua item harus diisi");
            return;
        }

        // Validate all pairs are defined
        for (let i = 0; i < formData.leftItems.length; i++) {
            if (!formData.pairs[i] || formData.pairs[i].length === 0) {
                alert(`Pilih pasangan untuk item kiri ${i + 1}`);
                return;
            }
        }

        const content = {
            question: formData.question,
            leftItems: formData.leftItems,
            rightItems: formData.rightItems,
        };

        const answerKey = {
            pairs: formData.pairs,
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
                    type: "matching",
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
            leftItems: ["", ""],
            rightItems: ["", ""],
            pairs: {},
            difficulty: "medium",
            defaultPoints: 1,
            tags: [],
        });
        setNewTag("");
    };

    const addLeftItem = () => {
        setFormData({
            ...formData,
            leftItems: [...formData.leftItems, ""],
        });
    };

    const addRightItem = () => {
        setFormData({
            ...formData,
            rightItems: [...formData.rightItems, ""],
        });
    };

    const removeLeftItem = (index: number) => {
        if (formData.leftItems.length > 1) {
            const newLeftItems = formData.leftItems.filter((_, i) => i !== index);

            // Rebuild pairs after removal of LEFT item
            const newPairs: { [key: number]: number[] } = {};
            Object.keys(formData.pairs).forEach((key) => {
                const oldLeftIndex = parseInt(key);
                const rightIndices = formData.pairs[oldLeftIndex];

                if (oldLeftIndex < index) {
                    newPairs[oldLeftIndex] = rightIndices;
                } else if (oldLeftIndex > index) {
                    newPairs[oldLeftIndex - 1] = rightIndices;
                }
                // If oldLeftIndex === index, it's removed
            });

            setFormData({
                ...formData,
                leftItems: newLeftItems,
                pairs: newPairs,
            });
        }
    };

    const removeRightItem = (index: number) => {
        if (formData.rightItems.length > 1) {
            const newRightItems = formData.rightItems.filter((_, i) => i !== index);

            // Rebuild pairs after removal of RIGHT item
            const newPairs: { [key: number]: number[] } = {};
            Object.keys(formData.pairs).forEach((key) => {
                const leftIndex = parseInt(key);
                const oldRightIndices = formData.pairs[leftIndex];

                const newRightIndices = oldRightIndices
                    .filter(ri => ri !== index) // Remove connection to deleted item
                    .map(ri => ri > index ? ri - 1 : ri); // Shift indices

                if (newRightIndices.length > 0) {
                    newPairs[leftIndex] = newRightIndices;
                }
            });

            setFormData({
                ...formData,
                rightItems: newRightItems,
                pairs: newPairs,
            });
        }
    };

    const updateLeftItem = (index: number, value: string) => {
        const newLeftItems = [...formData.leftItems];
        newLeftItems[index] = value;
        setFormData({ ...formData, leftItems: newLeftItems });
    };

    const updateRightItem = (index: number, value: string) => {
        const newRightItems = [...formData.rightItems];
        newRightItems[index] = value;
        setFormData({ ...formData, rightItems: newRightItems });
    };

    const togglePair = (leftIndex: number, rightIndex: number) => {
        const currentPairs = formData.pairs[leftIndex] || [];
        let newPairs;

        if (currentPairs.includes(rightIndex)) {
            newPairs = currentPairs.filter(i => i !== rightIndex);
        } else {
            newPairs = [...currentPairs, rightIndex];
        }

        setFormData({
            ...formData,
            pairs: {
                ...formData.pairs,
                [leftIndex]: newPairs,
            },
        });
    };

    // Helper to normalize pairs from DB (which might be 1-to-1 or 1-to-many)

    // Helper to normalize pairs from DB (which can be stored in different formats)
    const normalizePairs = (answerKey: any, rawLeftItems: any[] = [], rawRightItems: any[] = []): { [key: number]: number[] } => {
        if (!answerKey) return {};
        const normalized: { [key: number]: number[] } = {};

        // Debug logging
        console.log('Normalizing answerKey:', JSON.stringify(answerKey));
        console.log('Left items:', rawLeftItems?.length, rawLeftItems);
        console.log('Right items:', rawRightItems?.length, rawRightItems);

        // Format 1: matches array (from import) - [ { leftId, rightId } ]
        if (answerKey.matches && Array.isArray(answerKey.matches)) {
            answerKey.matches.forEach((match: { leftId: string; rightId: string }) => {
                // Find left index by matching ID
                const leftIndex = rawLeftItems.findIndex((item: any) =>
                    typeof item === 'object' && item !== null && String(item.id) === String(match.leftId)
                );
                // Find right index by matching ID
                const rightIndex = rawRightItems.findIndex((item: any) =>
                    typeof item === 'object' && item !== null && String(item.id) === String(match.rightId)
                );

                if (leftIndex !== -1 && rightIndex !== -1) {
                    if (!normalized[leftIndex]) {
                        normalized[leftIndex] = [];
                    }
                    if (!normalized[leftIndex].includes(rightIndex)) {
                        normalized[leftIndex].push(rightIndex);
                    }
                } else {
                    console.warn('Could not resolve match:', match, 'leftIndex:', leftIndex, 'rightIndex:', rightIndex);
                }
            });
            console.log('Normalized from matches:', normalized);
            return normalized;
        }

        // Format 2: pairs object (from manual creation/old format) - { leftIndex: rightIndex | rightIndex[] }
        if (answerKey.pairs) {
            const pairs = answerKey.pairs;

            const getLeftIndex = (key: string): number => {
                if (/^\d+$/.test(key)) return parseInt(key);
                return rawLeftItems.findIndex((item: any) =>
                    typeof item === 'object' && item !== null && String(item.id) === String(key)
                );
            };

            const getRightIndices = (values: any): number[] => {
                const vals = Array.isArray(values) ? values : [values];
                return vals.map((val: any) => {
                    if (typeof val === 'number') return val;
                    if (typeof val === 'string' && /^\d+$/.test(val)) return parseInt(val);
                    return rawRightItems.findIndex((item: any) =>
                        typeof item === 'object' && item !== null && String(item.id) === String(val)
                    );
                }).filter((i: number) => i !== -1);
            };

            Object.keys(pairs).forEach(key => {
                const leftIndex = getLeftIndex(key);
                if (leftIndex !== -1) {
                    const rightIndices = getRightIndices(pairs[key]);
                    if (rightIndices.length > 0) {
                        normalized[leftIndex] = rightIndices;
                    }
                }
            });
            console.log('Normalized from pairs:', normalized);
            return normalized;
        }

        console.warn('answerKey has neither matches nor pairs:', answerKey);
        return normalized;
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {questionToEdit ? "Edit Soal Menjodohkan" : "Tambah Soal Menjodohkan"}
                    </DialogTitle>
                    <DialogDescription>
                        {questionToEdit ? "Edit detail soal menjodohkan" : "Buat soal menjodohkan dengan pasangan item kiri dan kanan"}
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

                        {/* Items and Pairing */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>Item yang Dijodohkan *</Label>
                                <Button
                                    type="button"
                                    onClick={addLeftItem}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Tambah Item Kiri
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {formData.leftItems.map((leftItem, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-start">
                                        {/* Left Item */}
                                        <div className="col-span-5">
                                            <RichTextEditor
                                                value={leftItem}
                                                onChange={(value) =>
                                                    updateLeftItem(index, value)
                                                }
                                                placeholder={`Item Kiri ${index + 1}`}
                                            />
                                        </div>

                                        {/* Arrow */}
                                        <div className="col-span-1 flex justify-center mt-2">
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        </div>

                                        {/* Pairing Area */}
                                        <div className="col-span-5 space-y-2">
                                            <Select
                                                onValueChange={(value) =>
                                                    togglePair(index, parseInt(value))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tambah pasangan..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {formData.rightItems.map((rightItem, rIndex) => {
                                                        const isSelected = (formData.pairs[index] || []).includes(rIndex);
                                                        if (isSelected) return null; // Hide already selected
                                                        // For dropdown, we need plain text or a snippet. Rich text might be too much.
                                                        // Let's strip HTML tags for the dropdown label or just show "Item Kanan X"
                                                        // A simple regex to strip tags:
                                                        const safeRightItem = String(rightItem || "");
                                                        const plainText = safeRightItem.replace(/<[^>]+>/g, '') || `Item Kanan ${rIndex + 1}`;
                                                        return (
                                                            <SelectItem
                                                                key={rIndex}
                                                                value={rIndex.toString()}
                                                            >
                                                                {plainText.substring(0, 30) + (plainText.length > 30 ? "..." : "")}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>

                                            {/* Selected Pairs Badges */}
                                            <div className="flex flex-wrap gap-1">
                                                {(formData.pairs[index] || []).map((rIndex) => {
                                                    const rightItemContent = formData.rightItems[rIndex];
                                                    const safeRightItemContent = String(rightItemContent || "");
                                                    const plainText = safeRightItemContent.replace(/<[^>]+>/g, '') || `Item Kanan ${rIndex + 1}`;
                                                    return (
                                                        <Badge key={rIndex} variant="secondary" className="text-xs">
                                                            {plainText.substring(0, 20) + (plainText.length > 20 ? "..." : "")}
                                                            <button
                                                                type="button"
                                                                onClick={() => togglePair(index, rIndex)}
                                                                className="ml-1 hover:text-destructive"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Remove Button */}
                                        <div className="col-span-1">
                                            {formData.leftItems.length > 2 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeLeftItem(index)}
                                                    className="mt-1"
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Minimal 2 item kiri
                            </p>
                        </div>

                        {/* Right Items */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <Label>Item Kanan (akan diacak saat ujian)</Label>
                                <Button
                                    type="button"
                                    onClick={addRightItem}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Tambah Item Kanan
                                </Button>
                            </div>
                            <div className="space-y-2 mt-2">
                                {formData.rightItems.map((rightItem, index) => (
                                    <div key={index} className="flex gap-2 items-start">
                                        <div className="flex-1">
                                            <RichTextEditor
                                                value={rightItem}
                                                onChange={(value) =>
                                                    updateRightItem(index, value)
                                                }
                                                placeholder={`Item Kanan ${index + 1}`}
                                            />
                                        </div>
                                        {formData.rightItems.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeRightItem(index)}
                                                className="mt-1"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
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
