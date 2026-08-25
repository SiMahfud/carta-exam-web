import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ViolationDetailDialog } from "../exam/take-exam/ViolationDetailDialog";

describe("ViolationDetailDialog", () => {
    const mockLogs = [
        {
            type: "TAB_SWITCH",
            details: "User switched to another tab",
            timestamp: "2026-08-25T10:15:30.000Z",
        },
        {
            type: "FULLSCREEN_EXIT",
            details: "User attempted to exit fullscreen",
            timestamp: "2026-08-25T10:18:12.000Z",
        }
    ];

    it("should render dialog title, status, and violation logs when open", () => {
        const onOpenChange = vi.fn();
        render(
            <ViolationDetailDialog
                open={true}
                onOpenChange={onOpenChange}
                violationCount={2}
                maxViolations={3}
                violationMode="strict"
                violationLogs={mockLogs}
            />
        );

        expect(screen.getByText(/Riwayat Pelanggaran Ujian/i)).toBeInTheDocument();
        expect(screen.getByText(/2 \/ 3 Pelanggaran/i)).toBeInTheDocument();
        expect(screen.getByText(/Pindah Tab Browser/i)).toBeInTheDocument();
        expect(screen.getByText(/Keluar dari Layar Penuh/i)).toBeInTheDocument();
    });

    it("should display remaining chances warning in strict mode", () => {
        const onOpenChange = vi.fn();
        render(
            <ViolationDetailDialog
                open={true}
                onOpenChange={onOpenChange}
                violationCount={2}
                maxViolations={3}
                violationMode="strict"
                violationLogs={mockLogs}
            />
        );

        expect(screen.getByText(/1 kesempatan lagi/i)).toBeInTheDocument();
    });

    it("should call onOpenChange when close button is clicked", () => {
        const onOpenChange = vi.fn();
        render(
            <ViolationDetailDialog
                open={true}
                onOpenChange={onOpenChange}
                violationCount={2}
                maxViolations={3}
                violationMode="strict"
                violationLogs={mockLogs}
            />
        );

        const closeBtn = screen.getByRole("button", { name: /Saya Paham/i });
        fireEvent.click(closeBtn);
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
