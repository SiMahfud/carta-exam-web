import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExamCompletedView } from "@/components/exam/take-exam/ExamCompletedView";

describe("ExamCompletedView", () => {
    it("renders default title and message correctly", () => {
        const onReturnMock = vi.fn();
        render(<ExamCompletedView onReturn={onReturnMock} />);

        expect(screen.getByText("Ujian Telah Selesai")).toBeDefined();
        expect(screen.getByText("Ujian Anda telah dikumpulkan oleh pengawas.")).toBeDefined();
        expect(screen.getByText("Jawaban Anda Aman")).toBeDefined();
    });

    it("renders custom message when provided", () => {
        const onReturnMock = vi.fn();
        render(
            <ExamCompletedView
                title="Sesi Berakhir"
                message="Waktu telah habis dan lembar jawaban dikumpulkan."
                onReturn={onReturnMock}
            />
        );

        expect(screen.getByText("Sesi Berakhir")).toBeDefined();
        expect(screen.getByText("Waktu telah habis dan lembar jawaban dikumpulkan.")).toBeDefined();
    });

    it("triggers onReturn callback when button is clicked", () => {
        const onReturnMock = vi.fn();
        render(<ExamCompletedView onReturn={onReturnMock} autoRedirectSeconds={60} />);

        const button = screen.getByRole("button", { name: /Kembali ke Daftar Ujian/i });
        fireEvent.click(button);

        expect(onReturnMock).toHaveBeenCalledTimes(1);
    });
});
