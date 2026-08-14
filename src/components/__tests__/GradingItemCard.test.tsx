import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradingItemCard, GradingAnswer } from "../grading/GradingItemCard";

describe("GradingItemCard", () => {
    it("renders multiple choice question and choices correctly", () => {
        const mockMCAnswer: GradingAnswer = {
            answerId: "ans-1",
            questionId: "q-1",
            type: "mc",
            questionText: "Ibukota Indonesia adalah?",
            questionContent: {
                options: ["Jakarta", "Bandung", "Surabaya", "Medan"],
            },
            studentAnswer: "A",
            correctAnswer: "A",
            isFlagged: false,
            isCorrect: true,
            score: 1,
            maxPoints: 1,
            partialPoints: 1,
            gradingStatus: "completed",
            gradingNotes: null,
            defaultPoints: 1,
        };

        render(
            <GradingItemCard
                answer={mockMCAnswer}
                index={0}
                grade={{ score: 1, comment: "" }}
                onGradeChange={vi.fn()}
            />
        );

        expect(screen.getByText("No. 1")).toBeInTheDocument();
        expect(screen.getByText("Pilihan Ganda")).toBeInTheDocument();
        expect(screen.getByText("Benar")).toBeInTheDocument();
        expect(screen.getByText("Jakarta")).toBeInTheDocument();
    });

    it("renders essay question with manual score input", () => {
        const mockEssayAnswer: GradingAnswer = {
            answerId: "ans-2",
            questionId: "q-2",
            type: "essay",
            questionText: "Jelaskan proses fotosintesis!",
            questionContent: {
                guidelines: "Harus menyebutkan cahaya matahari, klorofil, CO2, dan air",
                rubric: [{ points: 5, criteria: "Lengkap dan runtut" }],
            },
            studentAnswer: "Fotosintesis adalah proses pembentukan karbohidrat dengan bantuan cahaya matahari.",
            correctAnswer: "",
            isFlagged: false,
            isCorrect: false,
            score: 0,
            maxPoints: 10,
            partialPoints: 0,
            gradingStatus: "manual",
            gradingNotes: null,
            defaultPoints: 10,
        };

        const handleGradeChange = vi.fn();

        render(
            <GradingItemCard
                answer={mockEssayAnswer}
                index={1}
                grade={{ score: 8, comment: "Penjelasan cukup baik" }}
                onGradeChange={handleGradeChange}
            />
        );

        expect(screen.getByText("No. 2")).toBeInTheDocument();
        expect(screen.getByText("Essay")).toBeInTheDocument();
        expect(screen.getByText("Panduan Penilaian:")).toBeInTheDocument();
        expect(screen.getByText("Rubrik:")).toBeInTheDocument();

        const scoreInput = screen.getByRole("spinbutton");
        expect(scoreInput).toHaveValue(8);

        fireEvent.change(scoreInput, { target: { value: "9" } });
        expect(handleGradeChange).toHaveBeenCalledWith("ans-2", 9, "Penjelasan cukup baik");
    });
});
