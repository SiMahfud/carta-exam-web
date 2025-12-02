"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileCheck, FileX, Files, Clock } from "lucide-react";

interface GradingStats {
    pendingCount: number;
    completedCount: number;
    publishedCount: number;
    autoGradedCount: number;
    totalSubmissions: number;
    avgGradingTime: number;
}

export function GradingStatsCard() {
    const [stats, setStats] = useState<GradingStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch("/api/grading/stats");
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <div className="animate-pulse">
                                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                                <div className="h-8 bg-muted rounded w-3/4"></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const estimatedTime = stats.pendingCount * stats.avgGradingTime;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Pending */}
            <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Perlu Dinilai</p>
                            <p className="text-3xl font-bold text-red-600">{stats.pendingCount}</p>
                        </div>
                        <FileX className="h-10 w-10 text-red-500 opacity-20" />
                    </div>
                </CardContent>
            </Card>

            {/* Completed */}
            <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Selesai Dinilai</p>
                            <p className="text-3xl font-bold text-green-600">{stats.completedCount}</p>
                        </div>
                        <FileCheck className="h-10 w-10 text-green-500 opacity-20" />
                    </div>
                </CardContent>
            </Card>

            {/* Total */}
            <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Pengumpulan</p>
                            <p className="text-3xl font-bold text-blue-600">{stats.totalSubmissions}</p>
                        </div>
                        <Files className="h-10 w-10 text-blue-500 opacity-20" />
                    </div>
                </CardContent>
            </Card>

            {/* Estimated Time */}
            <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Est. Waktu Tersisa</p>
                            <p className="text-3xl font-bold text-orange-600">
                                {estimatedTime < 60 ? `${estimatedTime}m` : `${Math.floor(estimatedTime / 60)}h ${estimatedTime % 60}m`}
                            </p>
                        </div>
                        <Clock className="h-10 w-10 text-orange-500 opacity-20" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
