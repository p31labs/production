// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  decodeRoleTokenOAuth21,
  isOAuth21Enabled,
  signRoleTokenOAuth21,
  verifyRoleTokenOAuth21,
} from './oauth21';
import { signRoleToken } from '../roles';

const SECRET = 'test-secret-oauth21';
const AUD = 'https://p31-monetization.trimtab-signal.workers.dev';
const NOW_MS = 1_800_000_000_000; // 2027-01-15T08:00:00Z

describe('signRoleTokenOAuth21', () => {
  it('issues a token whose decoded claims carry sub/role/aud/iat/exp/jti', async () => {
    const token = await signRoleTokenOAuth21(SECRET, 'did:key:zAlice', 'operator', AUD, { nowMs: NOW_MS });
    const claims = decodeRoleTokenOAuth21(token);
    expect(claims).not.toBeNull();
    expect(claims!.sub).toBe('did:key:zAlice');
    expect(claims!.role).toBe('operator');
    expect(claims!.aud).toBe(AUD);
    expect(claims!.exp - claims!.iat).toBe(900); // operator TTL from ROLE_TTL_SECONDS
    expect(typeof claims!.jti).toBe('string');
    expect(claims!.jti.length).toBeGreaterThan(0);
  });

  it('rejects issuance without a did or without an audience', async () => {
    await expect(signRoleTokenOAuth21(SECRET, '', 'viewer', AUD, { nowMs: NOW_MS })).rejects.toThrow();
    await expect(signRoleTokenOAuth21(SECRET, 'did:key:zX', 'viewer', '', { nowMs: NOW_MS })).rejects.toThrow();
  });

  it('rejects issuance for an unknown role', async () => {
    await expect(
      signRoleTokenOAuth21(SECRET, 'did:key:zX', 'root' as never, AUD, { nowMs: NOW_MS }),
    ).rejects.toThrow();
  });
});

describe('verifyRoleTokenOAuth21', () => {
  it('accepts a token with the matching audience and returns sub/role', async () => {
    const token = await signRoleTokenOAuth21(SECRET, 'did:key:zAlice', 'admin', AUD, { nowMs: NOW_MS });
    const verified = await verifyRoleTokenOAuth21(SECRET, token, AUD, { nowMs: NOW_MS + 60_000 });
    expect(verified).toEqual({ sub: 'did:key:zAlice', role: 'admin', exp: Math.floor(NOW_MS / 1000) + 900 });
  });

  it('rejects a token presented to a different audience (RFC 8707)', async () => {
    const token = await signRoleTokenOAuth21(SECRET, 'did:key:zAlice', 'viewer', AUD, { nowMs: NOW_MS });
    const verified = await verifyRoleTokenOAuth21(SECRET, token, 'https://evil.example.org', { nowMs: NOW_MS });
    expect(verified).toBeNull();
  });

  it('accepts an array aud containing the expected audience (RFC 8707)', async () => {
    // The signer emits a string aud; RFC 8707 also allows an array. Hand-craft an
    // array-aud token signed with the same HS256 secret and exercise membership.
    const { createHmac } = await import('node:crypto');
    const now = Math.floor(NOW_MS / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub: 'did:key:zBob', role: 'viewer', aud: [AUD, 'https://other.example'], iat: now, exp: now + 3600, jti: 'arr-aud-jti' }),
    ).toString('base64url');
    const sig = createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url');
    const token = `${header}.${payload}.${sig}`;

    const verified = await verifyRoleTokenOAuth21(SECRET, token, AUD, { nowMs: NOW_MS });
    expect(verified).toEqual({ sub: 'did:key:zBob', role: 'viewer', exp: now + 3600 });
    // Membership failure: an audience not listed in the array must be rejected.
    expect(await verifyRoleTokenOAuth21(SECRET, token, 'https://third.example', { nowMs: NOW_MS })).toBeNull();
  });

  it('rejects expired tokens', async () => {
    const token = await signRoleTokenOAuth21(SECRET, 'did:key:zAlice', 'viewer', AUD, { nowMs: NOW_MS });
    const verified = await verifyRoleTokenOAuth21(SECRET, token, AUD, { nowMs: NOW_MS + 3_601_000 });
    expect(verified).toBeNull();
  });

  it('rejects tampered signatures and malformed tokens', async () => {
    const token = await signRoleTokenOAuth21(SECRET, 'did:key:zAlice', 'viewer', AUD, { nowMs: NOW_MS });
    const tampered = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;
    expect(await verifyRoleTokenOAuth21(SECRET, tampered, AUD, { nowMs: NOW_MS })).toBeNull();
    expect(await verifyRoleTokenOAuth21(SECRET, 'not-a-jwt', AUD, { nowMs: NOW_MS })).toBeNull();
    expect(await verifyRoleTokenOAuth21(SECRET, 'a.b.c', AUD, { nowMs: NOW_MS })).toBeNull();
  });

  it('rejects tokens signed with a different secret', async () => {
    const token = await signRoleTokenOAuth21(SECRET, 'did:key:zAlice', 'viewer', AUD, { nowMs: NOW_MS });
    expect(await verifyRoleTokenOAuth21('other-secret', token, AUD, { nowMs: NOW_MS })).toBeNull();
  });

  it('rejects legacy roles.ts tokens (no aud claim)', async () => {
    const legacy = await signRoleToken(SECRET, 'did:key:zAlice', 'admin');
    expect(await verifyRoleTokenOAuth21(SECRET, legacy, AUD, { nowMs: NOW_MS })).toBeNull();
  });
});

describe('isOAuth21Enabled', () => {
  it('is opt-in: only the literal string "true" enables the path', () => {
    expect(isOAuth21Enabled('true')).toBe(true);
    expect(isOAuth21Enabled('TRUE')).toBe(false);
    expect(isOAuth21Enabled('1')).toBe(false);
    expect(isOAuth21Enabled(undefined)).toBe(false);
  });
});