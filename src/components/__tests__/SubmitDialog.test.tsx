import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SubmitDialog } from "../exam/take-exam/SubmitDialog";

describe("SubmitDialog", () => {
    it("renders answered status and total questions", () => {
        render(
            <SubmitDialog
                open={true}
                onOpenChange={vi.fn()}
                answeredCount={8}
                totalQuestions={10}
                onSubmit={vi.fn()}
                submitting={false}
            />
        );

        expect(screen.getByText(/Kumpulkan Ujian\?/i)).toBeInTheDocument();
        expect(screen.getByText(/Anda telah menjawab 8 dari 10 soal/i)).toBeInTheDocument();
        expect(screen.getByText(/Masih ada/i)).toBeInTheDocument();
        expect(screen.getByText(/2/)).toBeInTheDocument();
    });

    it("disables submit button when minimum elapsed time is not met", () => {
        render(
            <SubmitDialog
                open={true}
                onOpenChange={vi.fn()}
                answeredCount={10}
                totalQuestions={10}
                onSubmit={vi.fn()}
                submitting={false}
                minSubmitMinutes={15}
                elapsedMinutes={5}
            />
        );

        const submitButton = screen.getByRole("button", { name: /Tunggu 10 menit/i });
        expect(submitButton).toBeDisabled();
    });

    it("triggers onSubmit callback when submit button clicked and allowed", () => {
        const handleSubmit = vi.fn();
        render(
            <SubmitDialog
                open={true}
                onOpenChange={vi.fn()}
                answeredCount={10}
                totalQuestions={10}
                onSubmit={handleSubmit}
                submitting={false}
                minSubmitMinutes={10}
                elapsedMinutes={15}
            />
        );

        const submitButton = screen.getByRole("button", { name: /Ya, Kumpulkan/i });
        expect(submitButton).toBeEnabled();
        fireEvent.click(submitButton);
        expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
});
