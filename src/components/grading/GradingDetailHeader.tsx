import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Send, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface SubmissionSummary {
    id: string;
    studentName: string;
    sessionName: string;
    status: string;
    gradingStatus: string;
    score: number | null;
    earnedPoints: number | null;
    totalPoints: number | null;
}

interface GradingDetailHeaderProps {
    submission: SubmissionSummary | null;
    pendingSubmissions: string[];
    currentIndex: number;
    saving: boolean;
    publishing: boolean;
    onNavigatePrevious: () => void;
    onNavigateNext: () => void;
    onSave: () => void;
    onPublish: () => void;
}

export function GradingDetailHeader({
    submission,
    pendingSubmissions,
    currentIndex,
    saving,
    publishing,
    onNavigatePrevious,
    onNavigateNext,
    onSave,
    onPublish,
}: GradingDetailHeaderProps) {
    if (!submission) return null;

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm sticky top-4 z-10">
            <div className="flex items-center gap-4">
                <Link href="/admin/grading">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold">{submission.studentName}</h1>
                    <p className="text-sm text-muted-foreground">{submission.sessionName}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                {/* Navigation between submissions */}
                {pendingSubmissions.length > 0 && (
                    <div className="flex items-center gap-1 mr-2 border-r pr-3">
                        <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">
                            {currentIndex + 1} dari {pendingSubmissions.length}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onNavigatePrevious}
                            disabled={currentIndex <= 0}
                            title="Siswa Sebelumnya"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onNavigateNext}
                            disabled={currentIndex < 0 || currentIndex >= pendingSubmissions.length - 1}
                            title="Siswa Selanjutnya"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                <div className="flex items-center gap-2 mr-2">
                    <Badge variant={submission.gradingStatus === "published" ? "default" : "secondary"}>
                        {submission.gradingStatus === "published" ? "Dipublikasi" : "Draft"}
                    </Badge>
                    <div className="text-sm font-semibold">
                        Total: {submission.earnedPoints || 0} / {submission.totalPoints || 0} ({submission.score || 0})
                    </div>
                </div>

                <Button variant="outline" onClick={onSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Menyimpan..." : "Simpan Nilai"}
                </Button>

                <Button
                    onClick={onPublish}
                    disabled={publishing}
                    className="bg-green-600 hover:bg-green-700"
                >
                    <Send className="h-4 w-4 mr-2" />
                    {publishing ? "Mempublikasi..." : "Publikasi"}
                </Button>
            </div>
        </div>
    );
}
