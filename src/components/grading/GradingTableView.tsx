"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface Submission {
    id: string;
    sessionId: string;
    userId: string;
    studentName: string;
    sessionName: string;
    templateName: string;
    status: string;
    gradingStatus: "auto" | "pending_manual" | "manual" | "completed" | "published";
    score: number | null;
    earnedPoints: number | null;
    totalPoints: number | null;
    endTime: string;
    createdAt: string;
}

interface GradingTableViewProps {
    submissions: Submission[];
    selectedIds: Set<string>;
    onSelectChange: (id: string, checked: boolean) => void;
    onSelectAll: (checked: boolean) => void;
    onGrade: (submissionId: string) => void;
}

export function GradingTableView({
    submissions,
    selectedIds,
    onSelectChange,
    onSelectAll,
    onGrade,
}: GradingTableViewProps) {
    const getGradingStatusBadge = (status: string) => {
        switch (status) {
            case "pending_manual":
                return <Badge variant="destructive">Perlu Dinilai</Badge>;
            case "completed":
                return <Badge className="bg-green-500">Selesai Dinilai</Badge>;
            case "published":
                return <Badge variant="secondary">Dipublikasi</Badge>;
            case "auto":
                return <Badge variant="outline">Auto</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const allSelected = submissions.length > 0 && submissions.every(s => selectedIds.has(s.id));
    const someSelected = submissions.some(s => selectedIds.has(s.id));

    return (
        <div className="border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-muted">
                        <tr>
                            <th className="w-12 p-4">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={(checked) => onSelectAll(!!checked)}
                                    aria-label="Select all"
                                />
                            </th>
                            <th className="text-left p-4 font-medium">Siswa</th>
                            <th className="text-left p-4 font-medium">Sesi Ujian</th>
                            <th className="text-left p-4 font-medium">Tanggal</th>
                            <th className="text-left p-4 font-medium">Status</th>
                            <th className="text-left p-4 font-medium">Nilai</th>
                            <th className="text-right p-4 font-medium">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {submissions.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            submissions.map((submission) => (
                                <tr key={submission.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-4">
                                        <Checkbox
                                            checked={selectedIds.has(submission.id)}
                                            onCheckedChange={(checked) => onSelectChange(submission.id, !!checked)}
                                            aria-label={`Select ${submission.studentName}`}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium">{submission.studentName}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium">{submission.sessionName}</div>
                                        <div className="text-sm text-muted-foreground">{submission.templateName}</div>
                                    </td>
                                    <td className="p-4 text-sm text-muted-foreground">
                                        {format(new Date(submission.endTime), "d MMM yyyy, HH:mm", { locale: idLocale })}
                                    </td>
                                    <td className="p-4">
                                        {getGradingStatusBadge(submission.gradingStatus)}
                                    </td>
                                    <td className="p-4">
                                        {submission.score !== null ? (
                                            <div>
                                                <span className="font-semibold">{submission.score}</span>
                                                <span className="text-sm text-muted-foreground ml-1">
                                                    ({submission.earnedPoints}/{submission.totalPoints})
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button size="sm" onClick={() => onGrade(submission.id)}>
                                            <Edit className="mr-2 h-3 w-3" />
                                            {submission.gradingStatus === "pending_manual" ? "Nilai" : "Lihat"}
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
