"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "../../lib/toast-store";
import { updateSchoolSettings, SchoolSettings } from "../../actions/settings";
import { Loader2 } from "lucide-react";

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

    // Features Section
    featuresTitle: z.string().optional(),
    featuresSubtitle: z.string().optional(),

    // Contact
    contactEmail: z.string().email("Email tidak valid").optional().or(z.literal("")),
    contactPhone: z.string().optional(),
    address: z.string().optional(),
    footerText: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
    initialSettings: SchoolSettings | null;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            schoolName: initialSettings?.schoolName || "SMAN 1 Campurdarat",
            schoolDescription: initialSettings?.schoolDescription || "",
            logoUrl: initialSettings?.logoUrl || "",
            htmlTitle: initialSettings?.htmlTitle || "CartaExam",
            faviconUrl: initialSettings?.faviconUrl || "",
            heroTitle: initialSettings?.heroTitle || "Ujian Modern untuk Generasi Digital",
            heroDescription: initialSettings?.heroDescription || "Platform ujian yang aman, cerdas, dan mudah digunakan.",
            heroShowStats: initialSettings?.heroShowStats ?? true,
            featuresTitle: initialSettings?.featuresTitle || "Fitur Unggulan",
            featuresSubtitle: initialSettings?.featuresSubtitle || "Dirancang khusus untuk kebutuhan evaluasi akademik modern.",
            contactEmail: initialSettings?.contactEmail || "",
            contactPhone: initialSettings?.contactPhone || "",
            address: initialSettings?.address || "",
            footerText: initialSettings?.footerText || "Built with ❤️ for education.",
        },
    });

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, fieldName: "logoUrl" | "faviconUrl") {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (res.ok) {
                form.setValue(fieldName, data.url);
                toast({ title: "Sukses", description: "File berhasil diupload", variant: "success" });
            } else {
                toast({ title: "Gagal", description: data.error || "Gagal upload file", variant: "destructive" });
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast({ title: "Error", description: "Terjadi kesalahan saat upload", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    }

    async function onSubmit(data: SettingsFormValues) {
        setIsSubmitting(true);
        try {
            const result = await updateSchoolSettings(data);
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
                                        <div className="flex gap-2">
                                            <FormControl>
                                                <Input placeholder="https://..." {...field} />
                                            </FormControl>
                                            <Input
                                                type="file"
                                                className="w-[150px]"
                                                onChange={(e) => handleFileUpload(e, "logoUrl")}
                                                disabled={isUploading}
                                            />
                                        </div>
                                        <FormDescription>
                                            Masukkan URL atau upload gambar logo sekolah (PNG/Transparan).
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
