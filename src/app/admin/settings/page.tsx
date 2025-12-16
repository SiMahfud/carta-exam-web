import { Metadata } from "next";
import { getSchoolSettings } from "@/actions/settings";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata: Metadata = {
    title: "School Settings | CartaExam Admin",
    description: "Manage school and landing page settings",
};

export default async function SettingsPage() {
    const settings = await getSchoolSettings();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <SettingsForm initialSettings={settings} />
        </div>
    );
}
