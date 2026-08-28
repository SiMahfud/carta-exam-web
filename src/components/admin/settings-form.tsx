"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "../ui/form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../ui/card";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "../../lib/toast-store";
import { updateSchoolSettings, SchoolSettings } from "../../actions/settings";
import { Loader2, Eye, EyeOff, Sparkles, CheckCircle2, XCircle, Zap } from "lucide-react";

const settingsSchema = z.object({
    schoolName: z.string().min(1, "Nama sekolah wajib diisi"),
    schoolDescription: z.string().optional(),
    logoUrl: z.string().optional(),
    htmlTitle: z.string().optional(),
    faviconUrl: z.string().optional(),

    // Landing Page
    heroTitle: z.string().min(1, "Judul Hero wajib diisi"),
    heroDescription: z.string().min(1, "Deskripsi Hero wajib diisi"),
    heroShowStats: z.boolean(),

    // Announcement (NEW)
    announcementTitle: z.string().optional(),
    announcementContent: z.string().optional(),

    // Features Section
    featuresTitle: z.string().optional(),
    featuresSubtitle: z.string().optional(),

    // Contact
    contactEmail: z.string().email("Email tidak valid").optional().or(z.literal("")),
    contactPhone: z.string().optional(),
    address: z.string().optional(),
    footerText: z.string().optional(),

    // AI Configuration
    aiProvider: z.enum(["gemini", "openrouter", "openai_compatible"]).default("gemini"),
    geminiApiKey: z.string().optional(),
    geminiModel: z.string().optional(),
    openrouterApiKey: z.string().optional(),
    openrouterModel: z.string().optional(),
    openaiApiKey: z.string().optional(),
    openaiBaseUrl: z.string().optional(),
    openaiModel: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
    initialSettings: SchoolSettings | null;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiConfig = (initialSettings as any)?.aiConfig as {
        provider?: string;
        geminiApiKey?: string;
        geminiModel?: string;
        openrouterApiKey?: string;
        openrouterModel?: string;
        openaiApiKey?: string;
        openaiBaseUrl?: string;
        openaiModel?: string;
    } | null;

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema) as any,
        defaultValues: {
            schoolName: initialSettings?.schoolName || "SMAN 1 Campurdarat",
            schoolDescription: initialSettings?.schoolDescription || "",
            logoUrl: initialSettings?.logoUrl || "",
            htmlTitle: initialSettings?.htmlTitle || "CartaExam",
            faviconUrl: initialSettings?.faviconUrl || "",
            heroTitle: initialSettings?.heroTitle || "Ujian Modern untuk Generasi Digital",
            heroDescription: initialSettings?.heroDescription || "Platform ujian yang aman, cerdas, dan mudah digunakan.",
            heroShowStats: initialSettings?.heroShowStats ?? true,
            announcementTitle: (initialSettings as any)?.announcementTitle || "",
            announcementContent: (initialSettings as any)?.announcementContent || "",
            featuresTitle: initialSettings?.featuresTitle || "Fitur Unggulan",
            featuresSubtitle: initialSettings?.featuresSubtitle || "Dirancang khusus untuk kebutuhan evaluasi akademik modern.",
            contactEmail: initialSettings?.contactEmail || "",
            contactPhone: initialSettings?.contactPhone || "",
            address: initialSettings?.address || "",
            footerText: initialSettings?.footerText || "Built with ❤️ for education.",
            // AI Config
            aiProvider: (aiConfig?.provider as "gemini" | "openrouter" | "openai_compatible") || "gemini",
            geminiApiKey: aiConfig?.geminiApiKey || "",
            geminiModel: aiConfig?.geminiModel || "",
            openrouterApiKey: aiConfig?.openrouterApiKey || "",
            openrouterModel: aiConfig?.openrouterModel || "",
            openaiApiKey: aiConfig?.openaiApiKey || "",
            openaiBaseUrl: aiConfig?.openaiBaseUrl || "",
            openaiModel: aiConfig?.openaiModel || "",
        },
    });

    const selectedProvider = form.watch("aiProvider");

    // Clear test result when provider changes
    useEffect(() => {
        setTestResult(null);
    }, [selectedProvider]);

    async function handleTestConnection() {
        const provider = form.getValues("aiProvider");
        const apiKey = provider === "gemini"
            ? form.getValues("geminiApiKey")
            : provider === "openrouter"
            ? form.getValues("openrouterApiKey")
            : form.getValues("openaiApiKey");

        const model = provider === "gemini"
            ? form.getValues("geminiModel")
            : provider === "openrouter"
            ? form.getValues("openrouterModel")
            : form.getValues("openaiModel");

        const baseUrl = provider === "openai_compatible"
            ? form.getValues("openaiBaseUrl")
            : undefined;

        if (!apiKey) {
            setTestResult({ success: false, message: "API Key wajib diisi untuk menguji koneksi." });
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            const response = await fetch("/api/admin/ai-test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider, apiKey, model, baseUrl }),
            });

            const result = await response.json();
            setTestResult(result);
        } catch {
            setTestResult({ success: false, message: "Gagal menguji koneksi. Periksa jaringan Anda." });
        } finally {
            setIsTesting(false);
        }
    }

    async function onSubmit(data: SettingsFormValues) {
        setIsSubmitting(true);
        try {
            // Extract AI config into the JSON column format
            const {
                aiProvider,
                geminiApiKey,
                geminiModel,
                openrouterApiKey,
                openrouterModel,
                openaiApiKey,
                openaiBaseUrl,
                openaiModel,
                ...rest
            } = data;

            const payload = {
                ...rest,
                aiConfig: {
                    provider: aiProvider,
                    geminiApiKey: geminiApiKey || undefined,
                    geminiModel: geminiModel || undefined,
                    openrouterApiKey: openrouterApiKey || undefined,
                    openrouterModel: openrouterModel || undefined,
                    openaiApiKey: openaiApiKey || undefined,
                    openaiBaseUrl: openaiBaseUrl || undefined,
                    openaiModel: openaiModel || undefined,
                },
            };

            const result = await updateSchoolSettings(payload);
            if (result.success) {
                toast({ title: "Sukses", description: "Pengaturan berhasil disimpan", variant: "success" });
            } else {
                toast({ title: "Gagal", description: result.error || "Gagal menyimpan pengaturan", variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Terjadi kesalahan saat menyimpan", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* Identitas Sekolah */}
                <Card>
                    <CardHeader>
                        <CardTitle>Identitas Sekolah</CardTitle>
                        <CardDescription>
                            Informasi dasar mengenai sekolah atau instansi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="schoolName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nama Sekolah</FormLabel>
                                        <FormControl>
                                            <Input placeholder="SMAN 1 Campurdarat" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="logoUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>URL Logo</FormLabel>
                                        <FormControl>
                                            <FileUpload
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Upload gambar logo sekolah (PNG/Transparan).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="faviconUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Favicon</FormLabel>
                                        <FormControl>
                                            <FileUpload
                                                value={field.value}
                                                onChange={field.onChange}
                                                accept="image/x-icon,image/png,image/svg+xml"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Upload ikon tab browser (ICO, PNG, SVG).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="schoolDescription"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Deskripsi Singkat</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Deskripsi sekolah..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Landing Page - Hero Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Halaman Utama (Landing Page)</CardTitle>
                        <CardDescription>
                            Kustomisasi tampilan awal yang dilihat oleh siswa dan guru sebelum login.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="heroTitle"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Judul Utama (Hero Title)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Selamat Datang..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="heroDescription"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sub-judul / Deskripsi</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Keterangan singkat di bawah judul..." className="min-h-[100px]" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="heroShowStats"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Tampilkan Statistik</FormLabel>
                                        <FormDescription>
                                            Menampilkan jumlah siswa, ujian, dll di halaman depan.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Announcement Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pengumuman (Penting)</CardTitle>
                        <CardDescription>
                            Tampilkan pesan penting di halaman depan. Kosongkan untuk menyembunyikan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="announcementTitle"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Judul Pengumuman</FormLabel>
                                    <FormControl>
                                        <Input placeholder="PENGUMUMAN PENTING" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="announcementContent"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Isi Pengumuman</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Isi pesan pengumuman..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* Features Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bagian Fitur</CardTitle>
                        <CardDescription>
                            Judul dan deskripsi untuk bagian fitur unggulan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="featuresTitle"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Judul Bagian Fitur</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Fitur Unggulan" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="featuresSubtitle"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sub-judul Bagian Fitur</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Deskripsi singkat fitur..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* AI Configuration */}
                <Card className="border-purple-200 dark:border-purple-800/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                            Konfigurasi AI
                        </CardTitle>
                        <CardDescription>
                            Pilih provider AI dan konfigurasi API Key untuk fitur AI Generator dan AI Grading.
                            Jika dikosongkan, sistem akan menggunakan konfigurasi dari environment variables.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Provider Selection */}
                        <FormField
                            control={form.control}
                            name="aiProvider"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>AI Provider</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih provider..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="gemini">
                                                <div className="flex items-center gap-2">
                                                    <span>🔷</span>
                                                    <span>Google Gemini</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="openrouter">
                                                <div className="flex items-center gap-2">
                                                    <span>🌐</span>
                                                    <span>OpenRouter</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="openai_compatible">
                                                <div className="flex items-center gap-2">
                                                    <span>🤖</span>
                                                    <span>OpenAI Compatible (Custom Base URL)</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {selectedProvider === "gemini" && "Gunakan Google Gemini langsung. Dapatkan API Key di: https://aistudio.google.com/apikey"}
                                        {selectedProvider === "openrouter" && "Gunakan OpenRouter untuk akses ke berbagai model AI (Gemini, Claude, GPT, dll). Dapatkan API Key di: https://openrouter.ai/keys"}
                                        {selectedProvider === "openai_compatible" && "Gunakan endpoint standar OpenAI Chat Completions (seperti OpenAI resmi, Local LLM via Ollama/vLLM/LM Studio, DeepSeek API, Groq, Together AI, dll)."}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Provider-specific fields */}
                        <div className="rounded-lg border p-4 bg-muted/30 space-y-4">
                            {selectedProvider === "gemini" && (
                                <>
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        <span>🔷</span> Konfigurasi Google Gemini
                                    </h4>
                                    <FormField
                                        control={form.control}
                                        name="geminiApiKey"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>API Key</FormLabel>
                                                <FormControl>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <Input
                                                                type={showGeminiKey ? "text" : "password"}
                                                                placeholder="AIzaSy..."
                                                                {...field}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                                onClick={() => setShowGeminiKey(!showGeminiKey)}
                                                            >
                                                                {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    Kosongkan untuk menggunakan env var GOOGLE_GENERATIVE_AI_API_KEY.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="geminiModel"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Model</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="gemini-2.5-flash (default)"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Nama model Gemini. Kosongkan untuk default (gemini-2.5-flash).
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {selectedProvider === "openrouter" && (
                                <>
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        <span>🌐</span> Konfigurasi OpenRouter
                                    </h4>
                                    <FormField
                                        control={form.control}
                                        name="openrouterApiKey"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>API Key</FormLabel>
                                                <FormControl>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <Input
                                                                type={showOpenRouterKey ? "text" : "password"}
                                                                placeholder="sk-or-..."
                                                                {...field}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                                onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                                                            >
                                                                {showOpenRouterKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="openrouterModel"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Model</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="google/gemini-2.5-flash (default)"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Model dari OpenRouter. Contoh: google/gemini-2.5-flash, anthropic/claude-sonnet-4, openai/gpt-4o, dll.
                                                    Lihat daftar model di: https://openrouter.ai/models
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {selectedProvider === "openai_compatible" && (
                                <>
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        <span>🤖</span> Konfigurasi OpenAI Compatible
                                    </h4>
                                    <FormField
                                        control={form.control}
                                        name="openaiBaseUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Base URL</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="https://api.openai.com/v1 (atau http://localhost:11434/v1)"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Endpoint Base URL (otomatis diarahkan ke /chat/completions). Contoh: <code>https://api.openai.com/v1</code>, <code>https://api.deepseek.com/v1</code>, <code>https://api.groq.com/openai/v1</code>, atau <code>http://localhost:11434/v1</code> (Ollama).
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="openaiApiKey"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>API Key</FormLabel>
                                                <FormControl>
                                                    <div className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <Input
                                                                type={showOpenAIKey ? "text" : "password"}
                                                                placeholder="sk-..."
                                                                {...field}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                                onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                                                            >
                                                                {showOpenAIKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </FormControl>
                                                <FormDescription>
                                                    API Key otentikasi. Untuk local LLM tanpa password (seperti Ollama), isi sembarang teks (misal: <code>ollama</code>).
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="openaiModel"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Model</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="gpt-4o-mini (default)"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Nama identifier model pada endpoint. Contoh: <code>gpt-4o-mini</code>, <code>deepseek-chat</code>, <code>llama-3.3-70b-versatile</code>, <code>qwen2.5:7b</code>. Default: gpt-4o-mini.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            {/* Test Connection Button */}
                            <div className="flex items-center gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTestConnection}
                                    disabled={isTesting}
                                    className="gap-2"
                                >
                                    {isTesting ? (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Menguji...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="h-3 w-3" />
                                            Test Koneksi
                                        </>
                                    )}
                                </Button>

                                {testResult && (
                                    <div className={`flex items-center gap-1.5 text-sm ${testResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                        {testResult.success ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <XCircle className="h-4 w-4" />
                                        )}
                                        <span>{testResult.message}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact & Footer */}
                <Card>
                    <CardHeader>
                        <CardTitle>Kontak & Footer</CardTitle>
                        <CardDescription>
                            Informasi kontak yang ditampilkan di bagian bawah halaman.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="contactEmail"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Kontak</FormLabel>
                                        <FormControl>
                                            <Input placeholder="admin@sekolah.sch.id" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="contactPhone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nomor Telepon</FormLabel>
                                        <FormControl>
                                            <Input placeholder="(021) 1234567" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Alamat</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Jl. Raya..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="footerText"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Teks Footer</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Copyright..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            "Simpan Pengaturan"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
