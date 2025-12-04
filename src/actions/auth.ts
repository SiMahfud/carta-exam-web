'use server'

import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

export async function login(formData: FormData) {
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    if (!username || !password) {
        return
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
            redirect("/exam")
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
