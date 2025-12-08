import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}

import { apiRateLimiter } from "@/lib/rate-limit";

// Initial set of rate limited IPs (simple in-memory cache for middleware is tricky on serverless)
// Note: Middleware in Next.js Edge Runtime has limited simple state sharing.
// For a robust solution in Vercel/Edge, we'd need KV or Upstash. 
// However, assuming Node.js runtime or single instance for now as per plan.
// But wait, Middleware runs on Edge. Global variables might reset.
// Let's implement a lighter check or basic headers.
// Actually, `rate-limit.ts` uses Map which works if middleware is not strictly edge or if it's stateful enough.
// PROVISO: If deployed to Vercel, this Map will be per-request/per-isolate and thus ineffective.
// But for local/VPS (Node) it works.

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // 1. Redirect /exam to /student/exams (legacy)
    if (path === '/exam' || path.startsWith('/exam/')) {
        const newPath = path === '/exam' ? '' : path.replace('/exam', '');
        return NextResponse.redirect(new URL(`/student/exams${newPath}`, request.url))
    }

    // 2. Rate Limiting for API
    if (path.startsWith('/api')) {
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        try {
            await apiRateLimiter.getCheck()(100, ip) // 100 req/min
        } catch (error) {
            return new NextResponse('Too Many Requests', { status: 429 });
        }
    }

    // 3. Authentication & Authorization
    const sessionCookie = request.cookies.get('user_session')
    let userSession = null

    if (sessionCookie) {
        try {
            userSession = JSON.parse(sessionCookie.value)
        } catch (e) {
            // Invalid cookie value
        }
    }

    const isInternalApi = path.startsWith('/api/') || path.startsWith('/_next/') || path.includes('/static/') || path.includes('/favicon.ico')
    if (isInternalApi) {
        return NextResponse.next()
    }

    // Protected Routes
    const isAdminRoute = path.startsWith('/admin')
    const isStudentRoute = path.startsWith('/student')
    const isLoginRoute = path === '/login' || path === '/'

    // Unauthenticated User trying to access protected routes
    if (!userSession && (isAdminRoute || isStudentRoute)) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Authenticated User trying to access login page
    if (userSession && isLoginRoute) {
        if (userSession.role === 'admin' || userSession.role === 'teacher') {
            return NextResponse.redirect(new URL('/admin', request.url))
        } else if (userSession.role === 'student') {
            return NextResponse.redirect(new URL('/student/exams', request.url))
        }
    }

    // Role-based Access Control
    if (userSession) {
        if (isAdminRoute && userSession.role === 'student') {
            return NextResponse.redirect(new URL('/student/exams', request.url))
        }
        if (isStudentRoute && (userSession.role === 'admin' || userSession.role === 'teacher')) {
            // Optional: You might want to allow admins to see student pages, but for now strict separation
            // return NextResponse.redirect(new URL('/admin', request.url))
            // Actually, admins often need to see student views. Let's allowing it for now or keep strict?
            // Prompt asked for "pastikan yang tidak login tidak bisa memasuki halaman".
            // It didn't explicitly say "student cannot enter admin". But implicit safety.
            // "pastikan admin, guru maupun siswa" implies strict roles.
            // Let's enforce strict role for admin route, student route let's be lenient or Strict? 
            // "authentication, make sure not logged in cannot enter... for admin, teacher or student"
            // Safe bet: Student cannot enter Admin. Admin accessing Student is PROBABLY fine or redirect to admin.
            // Use strict for now to be safe.
            return NextResponse.redirect(new URL('/admin', request.url))
        }
    }

    return NextResponse.next()
}
