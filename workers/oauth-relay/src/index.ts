/**
 * P31 OAuth Relay — OAuth 2.1 relay worker for the Sovereign Shell.
 *
 * Implements Authorization Code + PKCE (S256 only) for Google and GitHub.
 * Exchanges provider tokens for did:key identity via PBKDF2 + Ed25519 derivation.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { Env, Provider, OAuthSession, OAuthToken, PARRequest, PARResponse } from './types';
import { googleProvider } from './providers/google';
import { githubProvider } from './providers/github';
import {
  deriveDidKey,
  generateSalt,
  base58Encode,
  generateDPoPProof,
  verifyDPoPProof,
  generateNonce,
} from './crypto';

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour for stored tokens
const PAR_TTL_MS = 10 * 60 * 1000; // 10 minutes for pushed authorization requests

// ─── JWKS (RFC 7517) ─────────────────────────────────────────────────────────
// Ed25519 signing key for the MCP resource server (kid 'p31-oauth-1'). Derived
// deterministically from the JWKS_PRIVATE_KEY_SEED secret so the public key stays
// stable across isolates; falls back to a per-isolate fresh keypair when unset.
const JWKS_KID = 'p31-oauth-1';
let jwksCache: JsonWebKey[] | null = null;

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// RFC 8410 PKCS#8 DER wrapper for an Ed25519 seed (OID 1.3.101.112, no params).
const ED25519_PKCS8_HEADER = new Uint8Array([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04,
  0x22, 0x04, 0x20,
]);

function ed25519PrivateKeyFromSeed(seed: Uint8Array): Promise<CryptoKey> {
  const pkcs8 = new Uint8Array(ED25519_PKCS8_HEADER.length + seed.length);
  pkcs8.set(ED25519_PKCS8_HEADER, 0);
  pkcs8.set(seed, ED25519_PKCS8_HEADER.length);
  return crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'Ed25519', namedCurve: 'Ed25519' },
    true,
    ['sign'],
  );
}

async function getJwks(env: Env): Promise<JsonWebKey[]> {
  if (jwksCache) return jwksCache;

  let x: string;
  if (env.JWKS_PRIVATE_KEY_SEED) {
    const privateKey = await ed25519PrivateKeyFromSeed(
      hexToBytes(env.JWKS_PRIVATE_KEY_SEED),
    );
    const jwk = await crypto.subtle.exportKey('jwk', privateKey) as JsonWebKey;
    x = jwk.x as string;
  } else {
    const keypair = (await crypto.subtle.generateKey(
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;
    const jwk = await crypto.subtle.exportKey('jwk', keypair.publicKey) as JsonWebKey;
    x = jwk.x as string;
  }

  const key = {
    kty: 'OKP',
    crv: 'Ed25519',
    use: 'sig',
    alg: 'EdDSA',
    kid: JWKS_KID,
    x,
  } as JsonWebKey;

  const keys: JsonWebKey[] = [key];
  jwksCache = keys;
  return keys;
}

function getProvider(name: string) {
  switch (name) {
    case 'google':
      return googleProvider;
    case 'github':
      return githubProvider;
    default:
      return null;
  }
}

function getClientSecret(clientId: string, env: Env): string | null {
  if (clientId === 'shell' || clientId === env.SHELL_ORIGIN) {
    return env.SHELL_ORIGIN;
  }
  if (clientId === env.GOOGLE_CLIENT_ID) {
    return env.GOOGLE_CLIENT_SECRET;
  }
  if (clientId === env.GITHUB_CLIENT_ID) {
    return env.GITHUB_CLIENT_SECRET;
  }
  return null;
}

// ─── CIMD + RFC 8707 helpers ────────────────────────────────────────────────

const CIMD_CACHE_TTL_MS = 5 * 60 * 1000;
const cimdCache = new Map<string, { fetchedAt: number; redirectUris: string[] }>();

interface ClientResolution {
  /** Redirect-URI allowlist from the client's metadata document (null when none). */
  redirectUris: string[] | null;
  /** True for the built-in shell / provider-bridge clients (hardcoded allowlist). */
  builtin: boolean;
}

/**
 * Client ID Metadata Documents (CIMD) — the registration model the MCP
 * 2026-07-28 spec prefers over RFC 7591 DCR (which is deprecated there). When
 * `CIMD_ENABLED` is 'true' and the client_id is an HTTPS URL, the metadata
 * document is fetched from that URL and its `redirect_uris` become the
 * validation allowlist. Built-in clients keep the hardcoded secret check.
 */
async function resolveClientMetadata(clientId: string, env: Env): Promise<ClientResolution> {
  if (clientId === 'shell' || clientId === env.SHELL_ORIGIN) return { redirectUris: null, builtin: true };
  if (clientId === env.GOOGLE_CLIENT_ID || clientId === env.GITHUB_CLIENT_ID) return { redirectUris: null, builtin: true };
  if (env.CIMD_ENABLED !== 'true') return { redirectUris: null, builtin: false };

  let parsed: URL;
  try {
    parsed = new URL(clientId);
  } catch {
    return { redirectUris: null, builtin: false };
  }
  if (parsed.protocol !== 'https:') return { redirectUris: null, builtin: false };

  const cached = cimdCache.get(clientId);
  if (cached && Date.now() - cached.fetchedAt < CIMD_CACHE_TTL_MS) {
    return { redirectUris: cached.redirectUris, builtin: false };
  }
  try {
    const res = await fetch(clientId, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { redirectUris: null, builtin: false };
    const doc = await res.json<{ redirect_uris?: string[] }>();
    const redirectUris = Array.isArray(doc.redirect_uris)
      ? doc.redirect_uris.filter((u): u is string => typeof u === 'string')
      : [];
    cimdCache.set(clientId, { fetchedAt: Date.now(), redirectUris });
    return { redirectUris, builtin: false };
  } catch {
    return { redirectUris: null, builtin: false };
  }
}

/** The built-in shell client may only redirect back to its own origin. */
function validRedirectForBuiltin(clientId: string, redirectUri: string, env: Env): boolean {
  if (clientId !== 'shell' && clientId !== env.SHELL_ORIGIN) return true;
  try {
    return new URL(redirectUri).origin === new URL(env.SHELL_ORIGIN).origin;
  } catch {
    return false;
  }
}

/**
 * RFC 8707 — this AS serves a single resource: its own origin. Accepts the
 * indicator when it is absent (defaults to the origin) or matches the origin;
 * returns null for any other target (invalid_target).
 */
function validateResourceIndicator(resource: string | undefined | null, origin: string): string | null {
  if (resource === undefined || resource === null || resource === '') return origin;
  return resource === origin ? resource : null;
}

function securityHeaders(origin: string): Record<string, string> {
  return {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'bluetooth=(), tools=(self)',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'oauth-relay' });
});

// JWKS (RFC 7517) — public Ed25519 key for validating this relay's tokens.
app.get('/.well-known/jwks.json', async (c) => {
  const keys = await getJwks(c.env);
  return c.json({ keys });
});

// RFC 8414 — authorization-server metadata (OAuth 2.1 discovery).
app.get('/.well-known/oauth-authorization-server', (c) => {
  const origin = new URL(c.req.url).origin;
  return c.json({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    jwks_uri: `${origin}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_basic'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['openid', 'email', 'profile', 'read:user', 'user:email'],
    // RFC 9207 — the authorization response carries `iss` for mix-up defense.
    authorization_response_iss_parameter_supported: true,
    // DPoP is accepted at the token and userinfo endpoints.
    dpop_signing_alg_values_supported: ['Ed25519'],
    // RFC 8707 — resource indicators are accepted (single-resource AS).
    resource: origin,
  });
});

// RFC 9728 — protected-resource metadata for the resource this AS fronts
// (the relay's own /oauth/userinfo). Served under the draft's well-known
// URI and the MCP-aligned alias used across the P31 fleet.
const protectedResourceMetadata = (origin: string) => ({
  resource: origin,
  authorization_servers: [origin],
  scopes_supported: ['openid', 'email', 'profile', 'read:user', 'user:email'],
  bearer_methods_supported: ['header'],
});
app.get('/.well-known/oauth-protected-resource', (c) => c.json(protectedResourceMetadata(new URL(c.req.url).origin)));
app.get('/.well-known/resource-server', (c) => c.json(protectedResourceMetadata(new URL(c.req.url).origin)));

// PAR endpoint (RFC 9126) — Pushed Authorization Requests
app.post('/oauth/par', async (c) => {
  const authHeader = c.req.header('Authorization');

  let clientId: string | null = null;
  let clientSecret: string | null = null;

  if (authHeader?.startsWith('Basic ')) {
    const decoded = atob(authHeader.slice(6));
    const colonIdx = decoded.indexOf(':');
    if (colonIdx === -1) {
      return c.json({ error: 'Invalid Authorization header format' }, 401);
    }
    clientId = decoded.slice(0, colonIdx);
    clientSecret = decoded.slice(colonIdx + 1);
  } else {
    const body = await c.req.json<{ client_id?: string; client_secret?: string }>();
    clientId = body.client_id || null;
    clientSecret = body.client_secret || null;
  }

  if (!clientId || !clientSecret) {
    return c.json({ error: 'Missing client_id or client_secret' }, 401);
  }

  const expectedSecret = getClientSecret(clientId, c.env);
  if (!expectedSecret || clientSecret !== expectedSecret) {
    return c.json({ error: 'Invalid client credentials' }, 401);
  }

  const body = await c.req.json<PARRequest>();

  const requiredParams: (keyof PARRequest)[] = ['redirect_uri', 'provider', 'state', 'code_challenge'];
  for (const param of requiredParams) {
    if (!body[param]) {
      return c.json({ error: `Missing required parameter: ${String(param)}` }, 400);
    }
  }

  if (!['google', 'github'].includes(body.provider)) {
    return c.json({ error: 'Invalid provider' }, 400);
  }

  if (body.code_challenge_method && body.code_challenge_method !== 'S256') {
    return c.json({ error: 'Unsupported code_challenge_method' }, 400);
  }

  // Client ID Metadata Documents (CIMD) preferred over RFC 7591 DCR (deprecated
  // in MCP 2026-07-28). URL-form client_ids resolve their own metadata document
  // as the redirect-uri allowlist; built-in clients are same-origin restricted.
  const origin = new URL(c.req.url).origin;
  const clientMeta = await resolveClientMetadata(clientId, c.env);
  if (clientMeta.builtin && !validRedirectForBuiltin(clientId, body.redirect_uri, c.env)) {
    return c.json({ error: 'redirect_uri not allowed for this client' }, 400);
  }
  if (clientMeta.redirectUris && !clientMeta.redirectUris.includes(body.redirect_uri)) {
    return c.json({ error: 'redirect_uri not listed in the client metadata document' }, 400);
  }

  // RFC 8707 — resource indicators must target this AS's resource (its origin).
  const resource = validateResourceIndicator(body.resource, origin);
  if (resource === null) {
    return c.json({ error: 'invalid_target' }, 400);
  }

  const requestUri = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + PAR_TTL_MS;

  // Persist the validated resource indicator with the pushed request.
  body.resource = resource;

  await c.env.DB.prepare(
    `INSERT INTO par_requests (request_uri, client_id, request_payload, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(requestUri, clientId, JSON.stringify(body), now, expiresAt)
    .run();

  return c.json({ request_uri: requestUri, expires_in: PAR_TTL_MS / 1000 }, 200);
});

// Initiate OAuth flow — direct params or request_uri (PAR)
app.get('/oauth/authorize', async (c) => {
  const origin = new URL(c.req.url).origin;
  let providerName: string;
  let redirect: string;
  let codeVerifier: string;
  let state: string;
  let codeChallenge: string;
  let resource: string;

  const requestUri = c.req.query('request_uri');

  if (requestUri) {
    const parRecord = await c.env.DB.prepare(
      `SELECT * FROM par_requests WHERE request_uri = ?`,
    )
      .bind(requestUri)
      .first<{ client_id: string; request_payload: string; created_at: number; expires_at: number }>();

    if (!parRecord) {
      return c.json({ error: 'Invalid request_uri' }, 400);
    }

    if (Date.now() > parRecord.expires_at) {
      await c.env.DB.prepare(`DELETE FROM par_requests WHERE request_uri = ?`)
        .bind(requestUri)
        .run();
      return c.json({ error: 'PAR request expired' }, 410);
    }

    const payload = JSON.parse(parRecord.request_payload) as PARRequest;
    providerName = payload.provider;
    redirect = payload.redirect_uri;
    state = payload.state;

    // RFC 8707 — restore the resource indicator recorded at PAR time.
    const parResource = validateResourceIndicator(payload.resource, origin);
    if (parResource === null) {
      return c.json({ error: 'invalid_target' }, 400);
    }
    resource = parResource;

    const encoder = new TextEncoder();
    const verifierData = encoder.encode(state);
    const challengeBuffer = await crypto.subtle.digest('SHA-256', verifierData);
    codeChallenge = btoa(String.fromCharCode(...new Uint8Array(challengeBuffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    codeVerifier = state;

    await c.env.DB.prepare(`DELETE FROM par_requests WHERE request_uri = ?`)
      .bind(requestUri)
      .run();
  } else {
    providerName = c.req.query('provider') || '';
    redirect = c.req.query('redirect') || '';

    if (!providerName || !redirect) {
      return c.json({ error: 'Missing provider or redirect parameter' }, 400);
    }

    if (!['google', 'github'].includes(providerName)) {
      return c.json({ error: 'Invalid provider' }, 400);
    }

    // RFC 8707 — resource indicators must target this AS's resource (its origin).
    const directResource = validateResourceIndicator(c.req.query('resource'), origin);
    if (directResource === null) {
      return c.json({ error: 'invalid_target' }, 400);
    }
    resource = directResource;

    // Generate PKCE verifier and state
    codeVerifier = base58Encode(crypto.getRandomValues(new Uint8Array(32)));
    const stateBytes = crypto.getRandomValues(new Uint8Array(16));
    state = base58Encode(stateBytes);

    const encoder = new TextEncoder();
    const verifierData = encoder.encode(codeVerifier);
    const challengeBuffer = await crypto.subtle.digest('SHA-256', verifierData);
    codeChallenge = btoa(String.fromCharCode(...new Uint8Array(challengeBuffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  const provider = getProvider(providerName);
  if (!provider) {
    return c.json({ error: 'Unknown provider' }, 400);
  }

  const clientId = provider.getClientId(c.env);
  if (!clientId) {
    return c.json({ error: 'Provider not configured' }, 503);
  }

  const sessionId = crypto.randomUUID();
  const now = Date.now();

  await c.env.DB.prepare(
    `INSERT INTO oauth_sessions (id, provider, code_verifier, state, redirect_uri, resource, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(sessionId, providerName, codeVerifier, state, redirect, resource, now, now + SESSION_TTL_MS)
    .run();

  const authUrl = new URL(provider.authUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', `${new URL(c.req.url).origin}/oauth/callback`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', provider.scopes.join(' '));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return Response.redirect(authUrl.toString(), 302);
});

// OAuth callback — exchanges code for token
app.get('/oauth/callback', async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return c.json({ error: `Provider returned error: ${error}` }, 400);
  }

  if (!code || !state) {
    return c.json({ error: 'Missing code or state' }, 400);
  }

  // Find session by state
  const session = await c.env.DB.prepare(
    `SELECT * FROM oauth_sessions WHERE state = ?`,
  )
    .bind(state)
    .first<OAuthSession>();

  if (!session) {
    return c.json({ error: 'Invalid state' }, 400);
  }

  if (Date.now() > session.expires_at) {
    await c.env.DB.prepare(`DELETE FROM oauth_sessions WHERE id = ?`)
      .bind(session.id)
      .run();
    return c.json({ error: 'Session expired' }, 410);
  }

  const provider = getProvider(session.provider);
  if (!provider) {
    return c.json({ error: 'Unknown provider' }, 400);
  }

  // Exchange code for token
  const tokenRes = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      client_id: provider.getClientId(c.env),
      client_secret: provider.getClientSecret(c.env),
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${new URL(c.req.url).origin}/oauth/callback`,
      code_verifier: session.code_verifier,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => '');
    console.error(`Token exchange failed for ${session.provider}:`, tokenRes.status, body);
    return c.json({ error: 'Token exchange failed' }, 500);
  }

  const tokenData = await tokenRes.json<{
    access_token?: string;
    refresh_token?: string;
    error?: string;
  }>();

  if (!tokenData.access_token) {
    return c.json({ error: 'No access token received' }, 500);
  }

  // Fetch user info
  const userinfoRes = await fetch(provider.userinfoUrl, {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
  });

  const userinfo = await userinfoRes.json<Record<string, unknown>>();

  const providerUserId = (userinfo.sub ?? userinfo.id ?? userinfo.login) as string;

  // Derive did:key from access token
  const salt = generateSalt();
  const didKey = await deriveDidKey(tokenData.access_token, salt);

  // Store token
  const tokenId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT OR REPLACE INTO oauth_tokens
       (id, provider, provider_user_id, access_token, refresh_token, refresh_token_used, expires_at, did_key, per_user_salt, resource, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
  )
    .bind(
      tokenId,
      session.provider,
      providerUserId,
      tokenData.access_token,
      tokenData.refresh_token ?? null,
      Date.now() + TOKEN_TTL_MS,
      didKey,
      base58Encode(salt),
      session.resource,
      Date.now(),
    )
    .run();

  // Clean up session
  await c.env.DB.prepare(`DELETE FROM oauth_sessions WHERE id = ?`)
    .bind(session.id)
    .run();

  // Issue DPoP nonce for subsequent token request
  const dpopNonce = generateNonce();

  // Redirect back to shell — RFC 9207: the authorization response carries `iss`
  // (this AS's issuer identifier) so clients can reject mix-up attacks, plus
  // the RFC 8707 resource indicator when one was requested.
  const shellRedirect = new URL(session.redirect_uri);
  shellRedirect.searchParams.set('did', didKey);
  shellRedirect.searchParams.set('provider', session.provider);
  shellRedirect.searchParams.set('user_id', providerUserId);
  shellRedirect.searchParams.set('token_id', tokenId);
  shellRedirect.searchParams.set('dpop_nonce', dpopNonce);
  shellRedirect.searchParams.set('iss', new URL(c.req.url).origin);
  if (session.resource) shellRedirect.searchParams.set('resource', session.resource);

  return Response.redirect(shellRedirect.toString(), 302);
});

// Token exchange — shell client polls this after redirect
app.post('/oauth/token', async (c) => {
  const body = await c.req.json<{
    token_id?: string;
    state?: string;
  }>();

  if (!body.token_id) {
    return c.json({ error: 'Missing token_id' }, 400);
  }

  const token = await c.env.DB.prepare(
    `SELECT * FROM oauth_tokens WHERE id = ?`,
  )
    .bind(body.token_id)
    .first<OAuthToken>();

  if (!token) {
    return c.json({ error: 'Token not found' }, 404);
  }

  if (Date.now() > token.expires_at) {
    await c.env.DB.prepare(`DELETE FROM oauth_tokens WHERE id = ?`)
      .bind(body.token_id)
      .run();
    return c.json({ error: 'Token expired' }, 410);
  }

  // Verify DPoP proof if provided
  const dpopHeader = c.req.header('DPoP');
  let dpopJkt: string | null = null;
  let dpopNonce = generateNonce();

  if (dpopHeader) {
    const tokenUrl = `${new URL(c.req.url).origin}/oauth/token`;
    const result = await verifyDPoPProof(dpopHeader, 'POST', tokenUrl, token.access_token, undefined);
    if (!result.valid) {
      return c.json({ error: 'Invalid DPoP proof' }, 401);
    }
    dpopJkt = result.jkt;

    // Update token with dpop_jkt if not already set
    if (!token.dpop_jkt) {
      await c.env.DB.prepare(`UPDATE oauth_tokens SET dpop_jkt = ? WHERE id = ?`)
        .bind(dpopJkt, token.id)
        .run();
    }
  }

  const response = {
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    did_key: token.did_key,
    provider: token.provider,
    provider_user_id: token.provider_user_id,
    expires_at: token.expires_at,
    dpop_jkt: dpopJkt,
    // RFC 9207 issuer identification + RFC 8707 resource passthrough.
    iss: new URL(c.req.url).origin,
    resource: token.resource,
  };

  return c.json(response, 200, { 'DPoP-Nonce': dpopNonce });
});

// Refresh token — rotates refresh token, detects replay
app.post('/oauth/refresh', async (c) => {
  const body = await c.req.json<{
    token_id?: string;
    refresh_token?: string;
  }>();

  if (!body.token_id && !body.refresh_token) {
    return c.json({ error: 'Missing token_id or refresh_token' }, 400);
  }

  // Find existing token
  let token: OAuthToken | null = null;
  if (body.token_id) {
    token = await c.env.DB.prepare(`SELECT * FROM oauth_tokens WHERE id = ?`)
      .bind(body.token_id).first<OAuthToken>();
  } else if (body.refresh_token) {
    token = await c.env.DB.prepare(`SELECT * FROM oauth_tokens WHERE refresh_token = ?`)
      .bind(body.refresh_token).first<OAuthToken>();
  }

  if (!token) {
    return c.json({ error: 'Token not found' }, 404);
  }

  // Replay detection — already used refresh token
  if (token.refresh_token_used) {
    console.error(`Refresh token replay detected for ${token.provider} user ${token.provider_user_id}`);
    await c.env.DB.prepare(`DELETE FROM oauth_tokens WHERE id = ?`).bind(token.id).run();
    return c.json({ error: 'Refresh token reuse detected — all tokens revoked' }, 401);
  }

  if (!token.refresh_token) {
    return c.json({ error: 'No refresh token available' }, 400);
  }

  const provider = getProvider(token.provider);
  if (!provider) {
    return c.json({ error: 'Unknown provider' }, 500);
  }

  // Exchange refresh token for new access token
  const tokenRes = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      client_id: provider.getClientId(c.env),
      client_secret: provider.getClientSecret(c.env),
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => '');
    console.error(`Refresh token exchange failed for ${token.provider}:`, tokenRes.status, body);
    return c.json({ error: 'Refresh token exchange failed' }, 500);
  }

  const tokenData = await tokenRes.json<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }>();

  if (!tokenData.access_token) {
    return c.json({ error: 'No access token received' }, 500);
  }

  // Mark old refresh token as used (rotation)
  const newRefreshToken = tokenData.refresh_token || token.refresh_token;
  const newExpiresAt = Date.now() + ((tokenData.expires_in || 3600) * 1000);

  await c.env.DB.prepare(
    `UPDATE oauth_tokens SET access_token = ?, refresh_token = ?, refresh_token_used = 1, expires_at = ? WHERE id = ?`
  )
    .bind(tokenData.access_token, newRefreshToken, newExpiresAt, token.id)
    .run();

  return c.json({
    access_token: tokenData.access_token,
    refresh_token: newRefreshToken,
    did_key: token.did_key,
    provider: token.provider,
    expires_at: newExpiresAt,
  });
});

// User info endpoint
app.get('/oauth/userinfo', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const tokenId = authHeader.slice(7);

  const token = await c.env.DB.prepare(
    `SELECT * FROM oauth_tokens WHERE id = ?`,
  )
    .bind(tokenId)
    .first<OAuthToken>();

  if (!token) {
    return c.json({ error: 'Token not found' }, 404);
  }

  if (Date.now() > token.expires_at) {
    await c.env.DB.prepare(`DELETE FROM oauth_tokens WHERE id = ?`)
      .bind(tokenId)
      .run();
    return c.json({ error: 'Token expired' }, 410);
  }

  // Verify DPoP proof if token has dpop_jkt (sender-constraint required)
  const dpopHeader = c.req.header('DPoP');
  const tokenUrl = `${new URL(c.req.url).origin}/oauth/userinfo`;

  if (token.dpop_jkt) {
    if (!dpopHeader) {
      return c.json({ error: 'DPoP proof required' }, 401);
    }
    const result = await verifyDPoPProof(dpopHeader, 'GET', tokenUrl, token.access_token);
    if (!result.valid || result.jkt !== token.dpop_jkt) {
      return c.json({ error: 'Invalid DPoP proof' }, 401);
    }
  }

  const provider = getProvider(token.provider);
  if (!provider) {
    return c.json({ error: 'Unknown provider' }, 500);
  }

  const userinfoRes = await fetch(provider.userinfoUrl, {
    headers: { 'Authorization': `Bearer ${token.access_token}` },
  });

  if (!userinfoRes.ok) {
    return c.json({ error: 'Failed to fetch user info' }, 502);
  }

  const userinfo = await userinfoRes.json();

  return c.json({
    provider: token.provider,
    did_key: token.did_key,
    user: userinfo,
  });
});

// 404 fallback
app.notFound((c) => {
  return c.json({ error: 'Not found', path: new URL(c.req.url).pathname }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
