import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Redirect /exam to /student/exams (legacy to new exam system)
    if (request.nextUrl.pathname === '/exam') {
        return NextResponse.redirect(new URL('/student/exams', request.url))
    }

    // Redirect /exam/* to /student/exams (with optional deep paths)
    if (request.nextUrl.pathname.startsWith('/exam/')) {
        return NextResponse.redirect(new URL('/student/exams', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/exam/:path*']
}
