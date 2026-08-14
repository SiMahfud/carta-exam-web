import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradingDetailHeader } from "../grading/GradingDetailHeader";

// Mock next/link
vi.mock("next/link", () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

describe("GradingDetailHeader", () => {
    const mockSubmission = {
        id: "sub-1",
        studentName: "Budi Setiawan",
        sessionName: "UTS Matematika",
        status: "submitted",
        gradingStatus: "draft",
        score: 85,
        earnedPoints: 85,
        totalPoints: 100,
    };

    const defaultProps = {
        submission: mockSubmission,
        pendingSubmissions: ["sub-1", "sub-2", "sub-3"],
        currentIndex: 1,
        saving: false,
        publishing: false,
        onNavigatePrevious: vi.fn(),
        onNavigateNext: vi.fn(),
        onSave: vi.fn(),
        onPublish: vi.fn(),
    };

    it("returns null when submission is null", () => {
        const { container } = render(
            <GradingDetailHeader {...defaultProps} submission={null} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders student name and session name", () => {
        render(<GradingDetailHeader {...defaultProps} />);

        expect(screen.getByText("Budi Setiawan")).toBeInTheDocument();
        expect(screen.getByText("UTS Matematika")).toBeInTheDocument();
    });

    it("shows draft badge when gradingStatus is draft", () => {
        render(<GradingDetailHeader {...defaultProps} />);
        expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("shows published badge when gradingStatus is published", () => {
        render(
            <GradingDetailHeader
                {...defaultProps}
                submission={{ ...mockSubmission, gradingStatus: "published" }}
            />
        );
        expect(screen.getByText("Dipublikasi")).toBeInTheDocument();
    });

    it("renders score correctly", () => {
        render(<GradingDetailHeader {...defaultProps} />);
        expect(screen.getByText("Total: 85 / 100 (85)")).toBeInTheDocument();
    });

    it("calls onSave when save button is clicked", () => {
        const handleSave = vi.fn();
        render(<GradingDetailHeader {...defaultProps} onSave={handleSave} />);

        const saveBtn = screen.getByRole("button", { name: /Simpan Nilai/i });
        fireEvent.click(saveBtn);
        expect(handleSave).toHaveBeenCalledTimes(1);
    });

    it("calls onPublish when publish button is clicked", () => {
        const handlePublish = vi.fn();
        render(<GradingDetailHeader {...defaultProps} onPublish={handlePublish} />);

        const publishBtn = screen.getByRole("button", { name: /Publikasi/i });
        fireEvent.click(publishBtn);
        expect(handlePublish).toHaveBeenCalledTimes(1);
    });

    it("disables save button when saving is true", () => {
        render(<GradingDetailHeader {...defaultProps} saving={true} />);
        const saveBtn = screen.getByRole("button", { name: /Menyimpan/i });
        expect(saveBtn).toBeDisabled();
    });

    it("navigates between submissions", () => {
        const handlePrev = vi.fn();
        const handleNext = vi.fn();
        render(
            <GradingDetailHeader
                {...defaultProps}
                onNavigatePrevious={handlePrev}
                onNavigateNext={handleNext}
            />
        );

        const prevBtn = screen.getByTitle("Siswa Sebelumnya");
        const nextBtn = screen.getByTitle("Siswa Selanjutnya");
        
        fireEvent.click(prevBtn);
        expect(handlePrev).toHaveBeenCalledTimes(1);

        fireEvent.click(nextBtn);
        expect(handleNext).toHaveBeenCalledTimes(1);
    });

    it("renders navigation counter text", () => {
        render(<GradingDetailHeader {...defaultProps} />);
        expect(screen.getByText("2 dari 3")).toBeInTheDocument();
    });
});
