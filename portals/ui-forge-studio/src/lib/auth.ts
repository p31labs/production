/**
 * auth.ts — the client half of passkey/DID auth (Wave 3).
 *
 * Wraps the four `/api/auth/*` endpoints with @simplewebauthn/browser so the
 * UI only calls `signInWithPasskey()` / `signOut()`. The server sets the
 * `p31_session` cookie; the studio's own identity (Ed25519 did:key) is the
 * metering subject when no session exists.
 */
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { ensureIdentity } from './identity';

export interface SessionState {
  authenticated: boolean;
  did?: string | null;
  role?: string | null;
}

/** GET /api/auth/session — the middleware-decoded session. */
export async function fetchSession(): Promise<SessionState> {
  try {
    const res = await fetch('/api/auth/session');
    if (!res.ok) return { authenticated: false };
    return (await res.json()) as SessionState;
  } catch {
    return { authenticated: false };
  }
}

/** The studio's did for metering (persisted Ed25519 identity). */
export async function studioDid(): Promise<string> {
  return (await ensureIdentity()).did;
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * One tap: try passkey login; if the passkey isn't registered yet, fall
 * through to registration (binding the studio's did). Returns the session did.
 */
export async function signInWithPasskey(): Promise<{ did: string }> {
  const identity = await ensureIdentity();

  // Try login first — the quiet path for a returning device.
  const loginOptsRes = await postJson('/api/auth/login/options', { did: identity.did });
  if (loginOptsRes.ok) {
    const loginOpts = (await loginOptsRes.json()) as PublicKeyCredentialRequestOptionsJSON;
    try {
      const assertion = await startAuthentication({ optionsJSON: loginOpts });
      const verifyRes = await postJson('/api/auth/login/verify', { response: assertion });
      if (verifyRes.ok) {
        const body = (await verifyRes.json()) as { did: string };
        return { did: body.did };
      }
    } catch {
      // The platform UI was cancelled or the passkey isn't registered — fall
      // through to the register path below.
    }
  }

  // Registration path — bind a passkey to the studio's did.
  const regOptsRes = await postJson('/api/auth/register/options', { did: identity.did });
  if (!regOptsRes.ok) throw new Error('Could not start passkey registration.');
  const regOpts = (await regOptsRes.json()) as PublicKeyCredentialCreationOptionsJSON;
  const registration = await startRegistration({ optionsJSON: regOpts });
  const regVerifyRes = await postJson('/api/auth/register/verify', { did: identity.did, response: registration });
  if (!regVerifyRes.ok) {
    const err = (await regVerifyRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Passkey registration failed.');
  }
  const body = (await regVerifyRes.json()) as { did: string };
  return { did: body.did };
}

export async function signOut(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}