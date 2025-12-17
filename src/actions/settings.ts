'use server';

import { db } from "@/lib/db";
import { schoolSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type SchoolSettings = typeof schoolSettings.$inferSelect;
export type SchoolSettingsInsert = typeof schoolSettings.$inferInsert;

export async function getSchoolSettings() {
    try {
        const settings = await db.select().from(schoolSettings).limit(1);
        return settings[0] || null;
    } catch (error) {
        console.error("Error fetching school settings:", error);
        return null;
    }
}

export async function updateSchoolSettings(data: Partial<SchoolSettingsInsert>) {
    try {
        const existingSettings = await getSchoolSettings();

        if (existingSettings) {
            await db.update(schoolSettings)
                .set({
                    ...data,
                    updatedAt: new Date(),
                })
                .where(eq(schoolSettings.id, existingSettings.id));
        } else {
            await db.insert(schoolSettings).values({
                id: crypto.randomUUID(),
                ...data,
                // Ensure defaults are favored if data fields are undefined, but Drizzle does this on DB level usually.
                // However, we need to pass mandatory fields if any. 
                // In our schema, almost everything is nullable or has default.
            });
        }

        revalidatePath("/");
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error) {
        console.error("Error updating school settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
}
