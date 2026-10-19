import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from "better-auth/cookies";
import { singleUserEnabled, verifyAccessIdentity } from '@/lib/access-identity';

import { isPublicPath } from '@/lib/public-paths';

export async function middleware(request: NextRequest) {
    if (singleUserEnabled()) {
        try {
            await verifyAccessIdentity(request.headers.get('cf-access-jwt-assertion'));
        } catch {
            return new NextResponse('Access denied. Sign in through Cloudflare Access.', { status: 403 });
        }
        if (request.nextUrl.pathname.startsWith('/api/auth') || request.nextUrl.pathname.startsWith('/api/inngest')) {
            return new NextResponse('Not available in single-user mode.', { status: 404 });
        }
        if (['/', '/sign-in', '/sign-up', '/forgot-password', '/reset-password'].includes(request.nextUrl.pathname)) {
            // Redirect GET navigation only; preserve Server Action POST requests for validation.
            if (request.method === 'GET') {
                return NextResponse.redirect(new URL('/dashboard', process.env.BETTER_AUTH_URL || request.url));
            }
        }
        return NextResponse.next();
    }
    if (request.nextUrl.pathname.startsWith('/api/') ||
        ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'].includes(request.nextUrl.pathname)) {
        return NextResponse.next();
    }
    // The marketing site is public
    if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();

    const sessionCookie = getSessionCookie(request);

    // Check cookie presence - prevents obviously unauthorized users
    if (!sessionCookie) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|assets).*)',
    ],
};
