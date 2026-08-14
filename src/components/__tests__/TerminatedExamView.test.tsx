import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TerminatedExamView } from "../exam/take-exam/TerminatedExamView";

describe("TerminatedExamView", () => {
    it("renders termination message and violation count", () => {
        const handleReturn = vi.fn();
        render(<TerminatedExamView violationCount={3} onReturn={handleReturn} />);

        expect(screen.getByText(/Ujian Dihentikan/i)).toBeInTheDocument();
        expect(screen.getByText(/3/)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Kembali ke Daftar Ujian/i })).toBeInTheDocument();
    });

    it("triggers onReturn callback when button clicked", () => {
        const handleReturn = vi.fn();
        render(<TerminatedExamView violationCount={5} onReturn={handleReturn} />);

        const button = screen.getByRole("button", { name: /Kembali ke Daftar Ujian/i });
        fireEvent.click(button);
        expect(handleReturn).toHaveBeenCalledTimes(1);
    });
});
