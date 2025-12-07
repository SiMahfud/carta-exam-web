import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
    matcher: ['/exam/:path*', '/api/:path*']
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
    // 1. Redirect /exam to /student/exams (legacy)
    if (request.nextUrl.pathname === '/exam' || request.nextUrl.pathname.startsWith('/exam/')) {
        const path = request.nextUrl.pathname === '/exam' ? '' : request.nextUrl.pathname.replace('/exam', '');
        return NextResponse.redirect(new URL(`/student/exams${path}`, request.url))
    }

    // 2. Rate Limiting for API
    if (request.nextUrl.pathname.startsWith('/api')) {
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        try {
            await apiRateLimiter.getCheck()(100, ip) // 100 req/min
        } catch (error) {
            return new NextResponse('Too Many Requests', { status: 429 });
        }
    }

    return NextResponse.next()
}
