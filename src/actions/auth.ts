'use server'

import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { z } from "zod"

// Login Schema for validation
const LoginSchema = z.object({
    username: z.string()
        .min(1, "Username wajib diisi")
        .max(50, "Username maksimal 50 karakter"),
    password: z.string()
        .min(1, "Password wajib diisi")
})

export type LoginResult = {
    success: boolean
    error?: string
    fieldErrors?: {
        username?: string[]
        password?: string[]
    }
}

export async function login(formData: FormData): Promise<LoginResult> {
    // Validate input
    const result = LoginSchema.safeParse({
        username: formData.get("username"),
        password: formData.get("password")
    })

    if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors
        return {
            success: false,
            error: "Data tidak valid",
            fieldErrors: {
                username: fieldErrors.username,
                password: fieldErrors.password
            }
        }
    }

    const { username, password } = result.data

    // Rate Limiting
    const headersList = await headers()
    const ip = headersList.get("x-forwarded-for") || "127.0.0.1"

    try {
        const { authRateLimiter } = await import("@/lib/rate-limit")
        await authRateLimiter.getCheck()(5, ip) // 5 login attempts per min
    } catch {
        return {
            success: false,
            error: "Terlalu banyak percobaan login. Coba lagi dalam 1 menit."
        }
    }

    // Find user
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)

    if (!user) {
        // Use same error message for security (don't reveal if user exists)
        return {
            success: false,
            error: "Username atau password salah"
        }
    }

    // Compare password with bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return {
            success: false,
            error: "Username atau password salah"
        }
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set("user_session", JSON.stringify({
        id: user.id,
        role: user.role,
        name: user.name
    }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 1 day
        path: "/",
    })

    // Redirect based on role
    if (user.role === "admin") {
        redirect("/admin")
    } else if (user.role === "teacher") {
        redirect("/admin") // Teachers use admin dashboard
    } else {
        redirect("/student/exams")
    }
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete("user_session")
    redirect("/login")
}

export async function getCurrentUser() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("user_session")

    if (!sessionCookie) {
        return null
    }

    try {
        const session = JSON.parse(sessionCookie.value)
        return session // { id, role, name }
    } catch {
        return null
    }
}
