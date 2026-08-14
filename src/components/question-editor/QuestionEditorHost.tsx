import React from "react";
import { MultipleChoiceEditor } from "./MultipleChoiceEditor";
import { ComplexMCEditor } from "./ComplexMCEditor";
import { ShortAnswerEditor } from "./ShortAnswerEditor";
import { MatchingEditor } from "./MatchingEditor";
import { EssayEditor } from "./EssayEditor";
import { TrueFalseEditor } from "./TrueFalseEditor";

interface QuestionEditorHostProps {
    selectedType: string;
    onClose: () => void;
    bankId: string;
    onSuccess: () => void;
    availableTags: string[];
    editingQuestion?: any;
}

export function QuestionEditorHost({
    selectedType,
    onClose,
    bankId,
    onSuccess,
    availableTags,
    editingQuestion,
}: QuestionEditorHostProps) {
    return (
        <>
            <MultipleChoiceEditor
                open={selectedType === "mc"}
                onOpenChange={(open) => { if (!open) onClose(); }}
                bankId={bankId}
                onSuccess={onSuccess}
                availableTags={availableTags}
                questionToEdit={editingQuestion}
            />
            <ComplexMCEditor
                open={selectedType === "complex_mc"}
                onOpenChange={(open) => { if (!open) onClose(); }}
                bankId={bankId}
                onSuccess={onSuccess}
                availableTags={availableTags}
                questionToEdit={editingQuestion}
            />
            <ShortAnswerEditor
                open={selectedType === "short"}
                onOpenChange={(open) => { if (!open) onClose(); }}
                bankId={bankId}
                onSuccess={onSuccess}
                availableTags={availableTags}
                questionToEdit={editingQuestion}
            />
            <MatchingEditor
                open={selectedType === "matching"}
                onOpenChange={(open) => { if (!open) onClose(); }}
                bankId={bankId}
                onSuccess={onSuccess}
                availableTags={availableTags}
                questionToEdit={editingQuestion}
            />
            <EssayEditor
                open={selectedType === "essay"}
                onOpenChange={(open) => { if (!open) onClose(); }}
                bankId={bankId}
                onSuccess={onSuccess}
                availableTags={availableTags}
                questionToEdit={editingQuestion}
            />
            <TrueFalseEditor
                open={selectedType === "true_false"}
                onOpenChange={(open) => { if (!open) onClose(); }}
                bankId={bankId}
                onSuccess={onSuccess}
                availableTags={availableTags}
                questionToEdit={editingQuestion}
            />
        </>
    );
}
