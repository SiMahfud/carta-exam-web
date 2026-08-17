import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationDropdown } from "../ui/notification-dropdown";

const mockNotifications = [
    {
        id: "notif-1",
        title: "Ujian Sedang Berlangsung",
        description: "Sesi Matematika siap dikerjakan.",
        type: "exam",
        timestamp: Date.now(),
        read: false,
        link: "/student/exams",
    },
    {
        id: "notif-2",
        title: "Hasil Ujian Dipublikasi",
        description: "Nilai Fisika Anda adalah 90.",
        type: "grading",
        timestamp: Date.now(),
        read: false,
        link: "/student/exams/1/review",
    },
];

describe("NotificationDropdown Component", () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
        vi.restoreAllMocks();

        vi.stubGlobal("localStorage", {
            getItem: (key: string) => mockStorage[key] || null,
            setItem: (key: string, value: string) => {
                mockStorage[key] = value;
            },
            removeItem: (key: string) => {
                delete mockStorage[key];
            },
            clear: () => {
                mockStorage = {};
            },
        });

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                notifications: mockNotifications,
                unreadCount: 2,
                userId: "user-123",
            }),
        }) as any;
    });

    it("fetches and renders unread notification count badge", async () => {
        render(<NotificationDropdown />);

        await waitFor(() => {
            expect(screen.getByText("2")).toBeInTheDocument();
        });
    });

    it("marks all as read, updates badge, and persists read IDs to localStorage", async () => {
        render(<NotificationDropdown />);

        await waitFor(() => {
            expect(screen.getByText("2")).toBeInTheDocument();
        });

        // Open dropdown trigger button in Radix UI
        const trigger = screen.getByRole("button");
        fireEvent.pointerDown(trigger);

        await waitFor(() => {
            expect(screen.getByText(/Tandai Sudah Dibaca/i)).toBeInTheDocument();
        });

        // Click 'Tandai Sudah Dibaca'
        const markAllBtn = screen.getByText(/Tandai Sudah Dibaca/i);
        fireEvent.click(markAllBtn);

        // Unread badge should disappear
        await waitFor(() => {
            expect(screen.queryByText("2")).not.toBeInTheDocument();
        });

        // Verify localStorage contains read IDs
        const stored = JSON.parse(mockStorage["carta_read_notifications_user-123"] || "[]");
        expect(stored).toEqual(expect.arrayContaining(["notif-1", "notif-2"]));
    });

    it("marks single notification as read when clicked and updates localStorage", async () => {
        render(<NotificationDropdown />);

        await waitFor(() => {
            expect(screen.getByText("2")).toBeInTheDocument();
        });

        const trigger = screen.getByRole("button");
        fireEvent.pointerDown(trigger);

        await waitFor(() => {
            expect(screen.getByText("Ujian Sedang Berlangsung")).toBeInTheDocument();
        });

        const notifItem = screen.getByText("Ujian Sedang Berlangsung");
        fireEvent.click(notifItem);

        // Badge should decrease to 1
        await waitFor(() => {
            expect(screen.getByText("1")).toBeInTheDocument();
        });

        const stored = JSON.parse(mockStorage["carta_read_notifications_user-123"] || "[]");
        expect(stored).toEqual(["notif-1"]);
    });

    it("retains read status upon reload/refetch when IDs are in localStorage", async () => {
        // Pre-fill localStorage as if user already read notif-1 & notif-2
        mockStorage["carta_read_notifications_user-123"] = JSON.stringify(["notif-1", "notif-2"]);

        render(<NotificationDropdown />);

        // Wait for fetch
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });

        // Badge should not appear
        expect(screen.queryByText("2")).not.toBeInTheDocument();
    });

    it("increments unread count only for newly arrived notifications not in localStorage", async () => {
        // Only notif-1 was previously read
        mockStorage["carta_read_notifications_user-123"] = JSON.stringify(["notif-1"]);

        render(<NotificationDropdown />);

        // Should show badge with count 1
        await waitFor(() => {
            expect(screen.getByText("1")).toBeInTheDocument();
        });
    });
});
