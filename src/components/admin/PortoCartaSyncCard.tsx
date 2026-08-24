"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, ExternalLink, ShieldCheck, Database, Layers, Activity, AlertCircle, Wifi } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PortoCartaSyncCard() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isPinging, setIsPinging] = useState(false);
    const [pingStatus, setPingStatus] = useState<{
        checked: boolean;
        connected: boolean;
        latencyMs?: number;
        message?: string;
    }>({ checked: false, connected: false });
    const [lastSyncResult, setLastSyncResult] = useState<any>(null);
    const { toast } = useToast();

    const portoCartaUrl = "https://porto.sman1campurdarat.sch.id";

    async function handlePing() {
        setIsPinging(true);
        try {
            const res = await fetch("/api/integration/ping");
            const data = await res.json();

            setPingStatus({
                checked: true,
                connected: !!data.connected,
                latencyMs: data.latencyMs,
                message: data.message
            });

            if (data.connected) {
                toast({
                    title: "Koneksi Hub Aktif",
                    description: `${data.message} (Latensi: ${data.latencyMs}ms)`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Koneksi Gagal",
                    description: data.message || "Tidak dapat terhubung ke PortoCarta.",
                });
            }
        } catch (err: any) {
            setPingStatus({
                checked: true,
                connected: false,
                message: err.message
            });
            toast({
                variant: "destructive",
                title: "Gagal Menguji Koneksi",
                description: err.message || "Network error.",
            });
        } finally {
            setIsPinging(false);
        }
    }

    async function handleSync() {
        setIsSyncing(true);
        try {
            const res = await fetch("/api/integration/pull-sync", {
                method: "POST",
            });
            const data = await res.json();

            if (data.success) {
                setLastSyncResult(data.data);
                toast({
                    title: "Sinkronisasi Berhasil!",
                    description: data.message,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Sinkronisasi Gagal",
                    description: data.message || "Terjadi kesalahan saat sinkronisasi.",
                });
            }
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Gagal Menghubungi Server",
                description: err.message || "Koneksi ke endpoint sinkronisasi gagal.",
            });
        } finally {
            setIsSyncing(false);
        }
    }

    return (
        <Card className="border shadow-sm bg-card">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Database className="h-5 w-5 text-indigo-500" />
                                Integrasi Data Master PortoCarta
                            </CardTitle>
                            {pingStatus.checked ? (
                                pingStatus.connected ? (
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Hub Terhubung ({pingStatus.latencyMs}ms)
                                    </Badge>
                                ) : (
                                    <Badge variant="destructive" className="text-xs">
                                        <AlertCircle className="h-3 w-3 mr-1" /> Hub Terputus
                                    </Badge>
                                )
                            ) : (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Integrasi Aktif
                                </Badge>
                            )}
                        </div>
                        <CardDescription className="text-xs">
                            Pusat data terintegrasi untuk menyelaraskan akun Siswa, Guru/PTK, Kelas, dan Mata Pelajaran secara otomatis dari portal induk PortoCarta.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Button
                            onClick={handlePing}
                            disabled={isPinging || isSyncing}
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                        >
                            <Wifi className={`h-3.5 w-3.5 mr-1.5 ${isPinging ? "animate-pulse text-indigo-500" : "text-muted-foreground"}`} />
                            {isPinging ? "Menguji..." : "Uji Koneksi Hub"}
                        </Button>
                        <a
                            href={`${portoCartaUrl}/admin/integrations`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border bg-background hover:bg-muted transition-colors h-8"
                        >
                            <span>Panel PortoCarta</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <Button
                            onClick={handleSync}
                            disabled={isSyncing}
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm h-8"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
                            {isSyncing ? "Menyinkronkan..." : "Tarik Data Sekarang"}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/50 border text-xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Layers className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-[11px]">Tahun Ajaran Aktif</span>
                            <span className="font-semibold text-foreground">
                                {lastSyncResult?.academic_year || "2026/2027 (Auto)"}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-[11px]">Single Sign-On (SSO)</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                Aktif (Admin, Guru, Siswa)
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Activity className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-[11px]">Status Sinkronisasi</span>
                            <span className="font-semibold text-foreground">
                                {lastSyncResult ? `${lastSyncResult.synced_students} siswa, ${lastSyncResult.synced_classes} kelas` : "Siap Ditarik / Didorong"}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
