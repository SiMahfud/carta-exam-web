import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OfflineSyncBanner } from "../exam/take-exam/OfflineSyncBanner";

describe("OfflineSyncBanner Component", () => {
    it("renders nothing when online and no pending answers", () => {
        const { container } = render(
            <OfflineSyncBanner isOnline={true} pendingCount={0} isSyncing={false} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("displays offline warning banner when offline", () => {
        render(
            <OfflineSyncBanner isOnline={false} pendingCount={3} isSyncing={false} />
        );

        expect(screen.getByText(/Koneksi Internet Terputus/i)).toBeInTheDocument();
        expect(screen.getByText(/3 antrean/i)).toBeInTheDocument();
    });

    it("displays syncing status when isSyncing is true", () => {
        render(
            <OfflineSyncBanner isOnline={true} pendingCount={2} isSyncing={true} />
        );

        expect(screen.getByText(/Menyinkronkan 2 jawaban tersimpan ke server/i)).toBeInTheDocument();
    });

    it("allows manual sync when back online with pending answers", () => {
        const handleManualSync = vi.fn();
        render(
            <OfflineSyncBanner
                isOnline={true}
                pendingCount={4}
                isSyncing={false}
                onManualSync={handleManualSync}
            />
        );

        expect(screen.getByText(/Koneksi kembali terhubung/i)).toBeInTheDocument();
        const syncBtn = screen.getByRole("button", { name: /Sinkronkan Sekarang/i });
        fireEvent.click(syncBtn);
        expect(handleManualSync).toHaveBeenCalledTimes(1);
    });
});
