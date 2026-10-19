import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { accessConfig, verifyAccessIdentity } from '@/lib/access-identity';

const config = { issuer: 'https://typheyes.cloudflareaccess.com', audience: 'openstock-app', email: 'owner@example.test' };
let pair: Awaited<ReturnType<typeof generateKeyPair>>;
let keys: ReturnType<typeof createLocalJWKSet>;
beforeAll(async () => {
    pair = await generateKeyPair('RS256');
    keys = createLocalJWKSet({ keys: [{ ...await exportJWK(pair.publicKey), kid: 'test-key', alg: 'RS256' }] });
});
afterEach(() => vi.unstubAllEnvs());

async function token(overrides: { email?: string; issuer?: string; audience?: string; expires?: string; noExpiry?: boolean } = {}) {
    const jwt = new SignJWT({ email: overrides.email ?? config.email })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(overrides.issuer ?? config.issuer).setAudience(overrides.audience ?? config.audience)
        .setSubject('owner-id').setIssuedAt();
    if (!overrides.noExpiry) jwt.setExpirationTime(overrides.expires ?? '1h');
    return jwt.sign(pair.privateKey);
}

describe('single-user Access identity boundary', () => {
    it('accepts the correctly signed owner token', async () => {
        expect((await verifyAccessIdentity(await token(), config, keys)).email).toBe(config.email);
    });
    it('rejects requests without a token', async () => {
        await expect(verifyAccessIdentity(null, config, keys)).rejects.toThrow();
    });
    it('rejects a forged token or plain email header', async () => {
        await expect(verifyAccessIdentity(config.email, config, keys)).rejects.toThrow();
    });
    it('rejects another email even when its token is signed', async () => {
        await expect(verifyAccessIdentity(await token({ email: 'other@example.com' }), config, keys)).rejects.toThrow();
    });
    it('rejects a token issued for a different Access application', async () => {
        await expect(verifyAccessIdentity(await token({ audience: 'other-app' }), config, keys)).rejects.toThrow();
    });
    it('rejects another issuer', async () => {
        await expect(verifyAccessIdentity(await token({ issuer: 'https://other.cloudflareaccess.com' }), config, keys)).rejects.toThrow();
    });
    it('rejects expired tokens', async () => {
        await expect(verifyAccessIdentity(await token({ expires: '-1s' }), config, keys)).rejects.toThrow();
    });
    it('requires an expiration', async () => {
        await expect(verifyAccessIdentity(await token({ noExpiry: true }), config, keys)).rejects.toThrow();
    });
    it('rejects a token signed by an unknown key', async () => {
        const other = await generateKeyPair('RS256');
        const fake = await new SignJWT({ email: config.email }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
            .setIssuer(config.issuer).setAudience(config.audience).setSubject('owner-id').setIssuedAt().setExpirationTime('1h').sign(other.privateKey);
        await expect(verifyAccessIdentity(fake, config, keys)).rejects.toThrow();
    });
    it('fails closed if the Access audience is missing', () => {
        vi.stubEnv('CLOUDFLARE_ACCESS_ISSUER', config.issuer);
        vi.stubEnv('OPENSTOCK_OWNER_EMAIL', config.email);
        vi.stubEnv('CLOUDFLARE_ACCESS_AUD', '');
        expect(() => accessConfig()).toThrow();
    });
});
