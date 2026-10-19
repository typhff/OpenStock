import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export const singleUserEnabled = () => process.env.OPENSTOCK_SINGLE_USER === 'true';

export type AccessConfig = { issuer: string; audience: string; email: string };

export function accessConfig(): AccessConfig {
    const issuer = process.env.CLOUDFLARE_ACCESS_ISSUER || '';
    const audience = process.env.CLOUDFLARE_ACCESS_AUD || '';
    const email = (process.env.OPENSTOCK_OWNER_EMAIL || '').trim().toLowerCase();
    if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || !audience || !email) {
        throw new Error('Single-user access configuration is incomplete');
    }
    return { issuer, audience, email };
}

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function verifyAccessIdentity(token: string | null, config = accessConfig(), keys?: JWTVerifyGetKey) {
    if (!token) throw new Error('Access authentication required');
    if (!keys) {
        if (!keySets.has(config.issuer)) {
            keySets.set(config.issuer, createRemoteJWKSet(new URL(`${config.issuer}/cdn-cgi/access/certs`)));
        }
        keys = keySets.get(config.issuer)!;
    }
    const { payload } = await jwtVerify(token, keys, {
        issuer: config.issuer,
        audience: config.audience,
        algorithms: ['RS256'],
        requiredClaims: ['exp', 'iat', 'sub', 'email'],
    });
    if (typeof payload.email !== 'string' || payload.email.toLowerCase() !== config.email) {
        throw new Error('Access identity is not the owner');
    }
    return payload;
}
