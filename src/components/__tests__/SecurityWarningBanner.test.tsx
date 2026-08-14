import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SecurityWarningBanner } from "../exam/take-exam/SecurityWarningBanner";

describe("SecurityWarningBanner", () => {
    it("returns null if violationCount is 0", () => {
        const { container } = render(<SecurityWarningBanner violationCount={0} />);
        expect(container.firstChild).toBeNull();
    });

    it("renders banner with count and translated violation type", () => {
        render(
            <SecurityWarningBanner
                violationCount={2}
                violationType="TAB_SWITCH"
            />
        );

        expect(screen.getByText(/Pelanggaran Terdeteksi!/i)).toBeInTheDocument();
        expect(screen.getByText("Pindah Tab")).toBeInTheDocument();
        expect(screen.getByText(/Total: 2 pelanggaran/i)).toBeInTheDocument();
    });

    it("handles onDismiss callback", () => {
        const handleDismiss = vi.fn();
        render(
            <SecurityWarningBanner
                violationCount={1}
                onDismiss={handleDismiss}
            />
        );

        const dismissButton = screen.getByRole("button");
        fireEvent.click(dismissButton);
        expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
});
