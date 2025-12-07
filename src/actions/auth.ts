'use server'

import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"
import { z } from "zod"

export async function login(formData: FormData) {
    // Validation Schema
    const LoginSchema = z.object({
        username: z.string().min(1, "Username is required").max(50),
        password: z.string().min(1, "Password is required")
    });

    const result = LoginSchema.safeParse({
        username: formData.get("username"),
        password: formData.get("password")
    });

    if (!result.success) {
        console.log("Validation error:", result.error.flatten());
        return;
    }

    const { username, password } = result.data;

    // Rate Limiting
    const headersList = cookies() // Hack: in server actions we can gets headers via headers() but we are importing cookies
    const { headers } = await import("next/headers");
    const ip = headers().get("x-forwarded-for") || "127.0.0.1";

    try {
        const { authRateLimiter } = await import("@/lib/rate-limit");
        await authRateLimiter.getCheck()(5, ip); // 5 login attempts per min
    } catch (e) {
        console.log("Rate limit exceeded for login attempt from", ip);
        // Simple return for now, ideally return error state to UI
        return;
    }

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)

    if (!user) {
        console.log("Invalid credentials - user not found")
        return
    }

    // Compare password with bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (isPasswordValid) {
        // Set session cookie
        cookies().set("user_session", JSON.stringify({ id: user.id, role: user.role, name: user.name }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
        })

        if (user.role === "admin") {
            redirect("/admin")
        } else if (user.role === "teacher") {
            redirect("/teacher")
        } else {
            redirect("/student/exams")
        }
    } else {
        // Handle error (todo: return error state)
        console.log("Invalid credentials - wrong password")
    }
}

export async function logout() {
    cookies().delete("user_session")
    redirect("/login")
}

export async function getCurrentUser() {
    const sessionCookie = cookies().get("user_session")

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
