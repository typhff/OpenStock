import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const verify = vi.hoisted(() => vi.fn());
vi.mock('@/lib/access-identity', () => ({
    singleUserEnabled: () => true,
    verifyAccessIdentity: (...args: unknown[]) => verify(...args),
}));
import { middleware } from '@/middleware';

beforeEach(() => {
    verify.mockReset().mockResolvedValue({ email: 'owner@example.test' });
    vi.stubEnv('BETTER_AUTH_URL', 'https://stocks.example.test');
});
afterEach(() => vi.unstubAllEnvs());

const request = (path: string, method = 'GET') => new NextRequest(`http://localhost:3108${path}`, {
    method, headers: { 'cf-access-jwt-assertion': 'signed-token' },
});

describe('single-user request routing', () => {
    it('keeps the authenticated dashboard redirect on the public domain', async () => {
        const response = await middleware(request('/'));
        expect(response.headers.get('location')).toBe('https://stocks.example.test/dashboard');
        expect(verify).toHaveBeenCalledWith('signed-token');
    });
    it('does not redirect POST Server Actions', async () => {
        const response = await middleware(request('/', 'POST'));
        expect(response.headers.get('location')).toBeNull();
        expect(response.headers.get('x-middleware-next')).toBe('1');
    });
    it('blocks the password auth API even with a valid Access identity', async () => {
        expect((await middleware(request('/api/auth/sign-up/email', 'POST'))).status).toBe(404);
    });
    it('protects quote API calls', async () => {
        verify.mockRejectedValue(new Error('invalid'));
        expect((await middleware(request('/api/quotes'))).status).toBe(403);
    });
    it.each(['/robots.txt', '/sitemap.xml', '/s/AAPL', '/compare'])('protects new public route %s in single-user mode', async (path) => {
        verify.mockRejectedValue(new Error('missing'));
        expect((await middleware(request(path))).status).toBe(403);
    });
    it('protects previously public pages too', async () => {
        verify.mockRejectedValue(new Error('missing'));
        expect((await middleware(request('/help'))).status).toBe(403);
    });
});
