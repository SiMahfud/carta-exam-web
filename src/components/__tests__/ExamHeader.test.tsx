import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ExamHeader } from "../exam/take-exam/ExamHeader";

describe("ExamHeader", () => {
    const defaultProps = {
        currentQuestionIndex: 2,
        totalQuestions: 10,
        timeRemaining: 3661, // 1h 1m 1s
        autoSaving: false,
        onShowSubmit: vi.fn(),
        isSidebarOpen: false,
        setIsSidebarOpen: vi.fn(),
    };

    it("renders question number and total correctly", () => {
        render(<ExamHeader {...defaultProps} />);
        expect(screen.getByText("Soal 3")).toBeInTheDocument();
        expect(screen.getByText("/ 10")).toBeInTheDocument();
    });

    it("formats time remaining correctly (HH:MM:SS)", () => {
        render(<ExamHeader {...defaultProps} />);
        expect(screen.getByText("01:01:01")).toBeInTheDocument();
    });

    it("displays auto-saving indicator when autoSaving is true", () => {
        render(<ExamHeader {...defaultProps} autoSaving={true} />);
        expect(screen.getByText("Menyimpan...")).toBeInTheDocument();
    });

    it("does not display auto-saving indicator when autoSaving is false", () => {
        render(<ExamHeader {...defaultProps} autoSaving={false} />);
        expect(screen.queryByText("Menyimpan...")).not.toBeInTheDocument();
    });

    it("calls onShowSubmit when submit button clicked", () => {
        const handleSubmit = vi.fn();
        render(<ExamHeader {...defaultProps} onShowSubmit={handleSubmit} />);
        
        const submitBtn = screen.getByRole("button", { name: /Kumpulkan/i });
        fireEvent.click(submitBtn);
        expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it("applies destructive styling when time is under 5 minutes", () => {
        render(<ExamHeader {...defaultProps} timeRemaining={299} />);
        const timeText = screen.getByText("00:04:59");
        const container = timeText.closest("div");
        expect(container?.className).toContain("text-destructive");
    });

    it("applies primary styling when time is above 5 minutes", () => {
        render(<ExamHeader {...defaultProps} timeRemaining={301} />);
        const timeText = screen.getByText("00:05:01");
        const container = timeText.closest("div");
        expect(container?.className).toContain("text-primary");
    });
});
