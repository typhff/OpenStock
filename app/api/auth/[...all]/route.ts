import { auth } from "@/lib/better-auth/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { singleUserEnabled } from '@/lib/access-identity';

// Needed for OAuth callbacks (/api/auth/callback/google, /api/auth/callback/github)
const handlers = toNextJsHandler(auth);
export async function GET(request: Request) {
    if (singleUserEnabled()) return new Response('Not available in single-user mode.', { status: 404 });
    return handlers.GET(request);
}
export async function POST(request: Request) {
    if (singleUserEnabled()) return new Response('Not available in single-user mode.', { status: 404 });
    return handlers.POST(request);
}
