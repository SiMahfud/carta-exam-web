import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BankQuestionCard, BankQuestion } from "../question-editor/BankQuestionCard";

describe("BankQuestionCard", () => {
    const mockQuestion: BankQuestion = {
        id: "q-1",
        type: "mc",
        content: { question: "<p>Berapakah hasil dari 2 + 2?</p>" },
        tags: ["Matematika", "Aljabar"],
        difficulty: "easy",
        defaultPoints: 2,
        createdAt: new Date(),
    };

    it("renders question details, tags, and points", () => {
        render(
            <BankQuestionCard
                question={mockQuestion}
                indexNumber={1}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />
        );

        expect(screen.getByText("#1")).toBeInTheDocument();
        expect(screen.getByText("Pilihan Ganda")).toBeInTheDocument();
        expect(screen.getByText("easy")).toBeInTheDocument();
        expect(screen.getByText("2 poin")).toBeInTheDocument();
        expect(screen.getByText("Matematika")).toBeInTheDocument();
        expect(screen.getByText("Aljabar")).toBeInTheDocument();
    });

    it("handles edit and delete actions", () => {
        const handleEdit = vi.fn();
        const handleDelete = vi.fn();

        render(
            <BankQuestionCard
                question={mockQuestion}
                indexNumber={1}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />
        );

        const buttons = screen.getAllByRole("button");
        // Button 0: edit, Button 1: delete
        fireEvent.click(buttons[0]);
        expect(handleEdit).toHaveBeenCalledWith(mockQuestion);

        fireEvent.click(buttons[1]);
        expect(handleDelete).toHaveBeenCalledWith("q-1");
    });
});
