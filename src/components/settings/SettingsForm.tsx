"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast-store";
import { updateSchoolSettings, type SchoolSettings } from "@/actions/settings";
import { useState } from "react";

const settingsSchema = z.object({
    schoolName: z.string().min(1, "School name is required"),
    schoolDescription: z.string().optional(),
    logoUrl: z.string().optional(),
    heroTitle: z.string().min(1, "Hero title is required"),
    heroDescription: z.string().min(1, "Hero description is required"),
    heroShowStats: z.boolean(),
    featuresTitle: z.string().optional(),
    featuresSubtitle: z.string().optional(),
    footerText: z.string().optional(),
    contactEmail: z.string().optional().or(z.literal("")),
    contactPhone: z.string().optional(),
    address: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
    initialSettings: SchoolSettings | null;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
    const [isSaving, setIsSaving] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            schoolName: initialSettings?.schoolName || "SMAN 1 Campurdarat",
            schoolDescription: initialSettings?.schoolDescription || "",
            logoUrl: initialSettings?.logoUrl || "",
            heroTitle: initialSettings?.heroTitle || "Ujian Modern untuk Generasi Digital",
            heroDescription: initialSettings?.heroDescription || "Platform ujian yang aman, cerdas, dan mudah digunakan.",
            heroShowStats: initialSettings?.heroShowStats ?? true,
            featuresTitle: initialSettings?.featuresTitle || "Fitur Unggulan",
            featuresSubtitle: initialSettings?.featuresSubtitle || "Dirancang khusus untuk kebutuhan evaluasi akademik modern.",
            footerText: initialSettings?.footerText || "Built with ❤️ for education.",
            contactEmail: initialSettings?.contactEmail || "",
            contactPhone: initialSettings?.contactPhone || "",
            address: initialSettings?.address || "",
        },
    });

    const heroShowStats = watch("heroShowStats");

    async function onSubmit(data: SettingsFormValues) {
        setIsSaving(true);
        try {
            const result = await updateSchoolSettings(data);
            if (result.success) {
                toast({ title: "Success", description: "Settings updated successfully", variant: "success" });
            } else {
                toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">School Settings</h2>
                    <p className="text-muted-foreground">
                        Manage your school&apos;s information and landing page content.
                    </p>
                </div>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>General Information</CardTitle>
                        <CardDescription>
                            Basic details about your school.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="schoolName">School Name</Label>
                            <Input id="schoolName" placeholder="e.g. SMAN 1 Campurdarat" {...register("schoolName")} />
                            {errors.schoolName && <p className="text-sm text-red-500">{errors.schoolName.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="schoolDescription">Description</Label>
                            <Textarea id="schoolDescription" placeholder="Short description of the school" {...register("schoolDescription")} />
                            {errors.schoolDescription && <p className="text-sm text-red-500">{errors.schoolDescription.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="logoUrl">Logo URL</Label>
                            <Input id="logoUrl" placeholder="https://..." {...register("logoUrl")} />
                            <p className="text-sm text-muted-foreground">Direct link to the school logo image.</p>
                            {errors.logoUrl && <p className="text-sm text-red-500">{errors.logoUrl.message}</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Landing Page - Hero Section</CardTitle>
                        <CardDescription>
                            Customize the main banner of your landing page.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="heroTitle">Hero Title</Label>
                            <Input id="heroTitle" placeholder="e.g. Ujian Modern..." {...register("heroTitle")} />
                            {errors.heroTitle && <p className="text-sm text-red-500">{errors.heroTitle.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="heroDescription">Hero Description</Label>
                            <Textarea id="heroDescription" placeholder="e.g. Platform ujian yang aman..." {...register("heroDescription")} />
                            {errors.heroDescription && <p className="text-sm text-red-500">{errors.heroDescription.message}</p>}
                        </div>
                        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="heroShowStats" className="text-base">Show Statistics</Label>
                                <p className="text-sm text-muted-foreground">
                                    Display quick stats (Students, Exams, etc.) on the landing page.
                                </p>
                            </div>
                            <Switch
                                id="heroShowStats"
                                checked={heroShowStats}
                                onCheckedChange={(checked) => setValue("heroShowStats", checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Landing Page - Features Section</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="featuresTitle">Features Title</Label>
                            <Input id="featuresTitle" placeholder="Fitur Unggulan" {...register("featuresTitle")} />
                            {errors.featuresTitle && <p className="text-sm text-red-500">{errors.featuresTitle.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="featuresSubtitle">Features Subtitle</Label>
                            <Input id="featuresSubtitle" placeholder="Subtitle..." {...register("featuresSubtitle")} />
                            {errors.featuresSubtitle && <p className="text-sm text-red-500">{errors.featuresSubtitle.message}</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Contact & Footer</CardTitle>
                        <CardDescription>
                            Contact information displayed in the footer.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="footerText">Footer Text</Label>
                            <Input id="footerText" placeholder="Copyright text..." {...register("footerText")} />
                            {errors.footerText && <p className="text-sm text-red-500">{errors.footerText.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contactEmail">Email</Label>
                                <Input id="contactEmail" placeholder="admin@school.sch.id" {...register("contactEmail")} />
                                {errors.contactEmail && <p className="text-sm text-red-500">{errors.contactEmail.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contactPhone">Phone</Label>
                                <Input id="contactPhone" placeholder="+62..." {...register("contactPhone")} />
                                {errors.contactPhone && <p className="text-sm text-red-500">{errors.contactPhone.message}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea id="address" placeholder="Jl. Raya..." {...register("address")} />
                            {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </form>
    );
}
