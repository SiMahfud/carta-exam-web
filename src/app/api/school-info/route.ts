import { NextResponse } from "next/server";
import { getSchoolSettings } from "@/actions/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/school-info
 * Public endpoint returning non-sensitive school branding and optional SSO configuration.
 */
export async function GET() {
    try {
        const settings = await getSchoolSettings();
        const portoCartaUrl = (
            process.env.NEXT_PUBLIC_PORTOCARTA_URL ||
            process.env.PORTOCARTA_URL ||
            ""
        )
            .trim()
            .replace(/\/+$/, "");

        const portoCartaEnabled = Boolean(
            portoCartaUrl && process.env.PORTOCARTA_API_KEY?.trim()
        );

        return NextResponse.json({
            success: true,
            data: {
                schoolName: settings?.schoolName || "CartaExam",
                schoolDescription: settings?.schoolDescription || "",
                logoUrl: settings?.logoUrl || null,
                address: settings?.address || null,
                contactEmail: settings?.contactEmail || null,
                contactPhone: settings?.contactPhone || null,
                portoCartaEnabled,
                portoCartaUrl: portoCartaEnabled ? portoCartaUrl : null,
            },
        });
    } catch {
        return NextResponse.json({
            success: true,
            data: {
                schoolName: "CartaExam",
                schoolDescription: "",
                logoUrl: null,
                address: null,
                contactEmail: null,
                contactPhone: null,
                portoCartaEnabled: false,
                portoCartaUrl: null,
            },
        });
    }
}
