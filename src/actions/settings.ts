'use server';

import { db } from "@/lib/db";
import { schoolSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import path from "path";

async function deleteOldFile(url: string | null | undefined) {
    if (!url || !url.startsWith("/uploads/")) return;
    try {
        const filename = url.split("/uploads/")[1];
        if (!filename) return; // Basic safety
        const filepath = path.join(process.cwd(), "public", "uploads", filename);
        await unlink(filepath);
    } catch (error) {
        // Ignore "ENOENT" (file not found), log others
        if ((error as { code?: string }).code !== "ENOENT") {
            console.error(`Failed to delete old file: ${url}`, error);
        }
    }
}

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
            // Handle cleanup of replaced files
            if (data.logoUrl !== undefined && existingSettings.logoUrl !== data.logoUrl) {
                await deleteOldFile(existingSettings.logoUrl);
            }
            if (data.faviconUrl !== undefined && existingSettings.faviconUrl !== data.faviconUrl) {
                await deleteOldFile(existingSettings.faviconUrl);
            }

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
