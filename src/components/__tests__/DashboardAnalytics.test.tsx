import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardAnalytics } from "../admin/DashboardAnalytics";

describe("DashboardAnalytics Component", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("renders score distribution and question bank composition", async () => {
        const mockData = {
            scoreDistribution: {
                poor: 2,
                fair: 5,
                good: 10,
                excellent: 8,
                total: 25,
            },
            questionTypeDistribution: [
                { type: "mc", label: "Pilihan Ganda", count: 40 },
                { type: "essay", label: "Uraian", count: 10 },
            ],
            subjectPerformance: [
                {
                    id: "s-1",
                    name: "Matematika",
                    code: "MTK",
                    avgScore: 84.5,
                    submissionCount: 25,
                },
            ],
            summary: {
                totalSubmissions: 25,
                totalTeachers: 6,
                averageSystemScore: 81.2,
            },
        };

        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
        } as any);

        render(<DashboardAnalytics />);

        await waitFor(() => {
            expect(screen.getByText("Analitik Nilai & Pembelajaran")).toBeInTheDocument();
            expect(screen.getByText("Distribusi Nilai Siswa")).toBeInTheDocument();
            expect(screen.getByText("Komposisi Tipe Soal")).toBeInTheDocument();
            expect(screen.getByText("Matematika")).toBeInTheDocument();
            expect(screen.getByText("84.5")).toBeInTheDocument();
        });
    });
});
