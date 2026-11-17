import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExamResetView } from "@/components/exam/take-exam/ExamResetView";

describe("ExamResetView", () => {
    it("renders default title, message, and warnings correctly", () => {
        const onRestartMock = vi.fn();
        render(<ExamResetView onRestart={onRestartMock} />);

        expect(screen.getByText("Ujian Direset oleh Pengawas")).toBeDefined();
        expect(screen.getByText(/Pengerjaan Anda sebelumnya telah dibatalkan/i)).toBeDefined();
        expect(screen.getByText("Harap Mulai Ujian dari Menu Utama")).toBeDefined();
    });

    it("renders custom title and message when provided", () => {
        const onRestartMock = vi.fn();
        render(
            <ExamResetView
                title="Pemberitahuan Reset"
                message="Soal ujian telah diperbaiki oleh admin."
                onRestart={onRestartMock}
            />
        );

        expect(screen.getByText("Pemberitahuan Reset")).toBeDefined();
        expect(screen.getByText("Soal ujian telah diperbaiki oleh admin.")).toBeDefined();
    });

    it("triggers onRestart callback when button is clicked", () => {
        const onRestartMock = vi.fn();
        render(<ExamResetView onRestart={onRestartMock} autoRedirectSeconds={60} />);

        const button = screen.getByRole("button", { name: /Mulai Ujian dari Awal/i });
        fireEvent.click(button);

        expect(onRestartMock).toHaveBeenCalledTimes(1);
    });
});
