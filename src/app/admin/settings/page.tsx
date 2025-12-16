import { Suspense } from "react";
import { getSchoolSettings } from "@/actions/settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage() {
    const settings = await getSchoolSettings();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Pengaturan Sekolah</h3>
                <p className="text-sm text-muted-foreground">
                    Konfigurasi informasi sekolah dan tampilan halaman utama.
                </p>
            </div>
            <Separator />
            <Suspense fallback={<div>Loading settings...</div>}>
                <SettingsForm initialSettings={settings} />
            </Suspense>
        </div>
    );
}
