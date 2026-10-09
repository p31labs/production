/**
 * _lib/passkeys.ts — Passkey (WebAuthn) registration + authentication (Wave 3).
 *
 * Re-implemented from monetization/src/lib/passkeys.ts with one change: the
 * credential + challenge stores live in D1 (`AUTH_DB`) instead of an
 * in-memory Map, so registration survives isolate spin-down and the studio's
 * credentials are durable.
 *
 * Tables (created on the p31-auth database):
 *   passkeys(id TEXT PRIMARY KEY, did TEXT, public_key TEXT, counter INTEGER,
 *            transports TEXT, created_at INTEGER)
 *   challenges(challenge TEXT PRIMARY KEY, did TEXT, expires_at INTEGER)
 */
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type { AuthenticationResponseJSON, RegistrationResponseJSON, WebAuthnCredential } from '@simplewebauthn/server';

export class PasskeyError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PasskeyError';
    this.status = status;
  }
}

export interface PasskeyCredential extends WebAuthnCredential {
  /** The did:key this passkey is bound to (registration-time DID). */
  did: string;
  createdAt: number;
}

interface PendingChallenge {
  challenge: string;
  did?: string;
  expiresAt: number;
}

const CHALLENGE_TTL_MS = 120_000;

function hex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function unhex(h: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function rpId(request: Request): string {
  return new URL(request.url).hostname;
}

function origin(request: Request): string {
  return new URL(request.url).origin;
}

function extractChallenge(response: RegistrationResponseJSON | AuthenticationResponseJSON): string {
  const clientData = JSON.parse(isoBase64URL.toUTF8String(response.response.clientDataJSON)) as { challenge?: string };
  if (!clientData.challenge) throw new PasskeyError('response missing challenge');
  return clientData.challenge;
}

async function pruneChallenges(db: D1Database): Promise<void> {
  try {
    await db.prepare('DELETE FROM challenges WHERE expires_at < ?').bind(Date.now()).run();
  } catch {
    // table missing — best-effort
  }
}

async function pendingFor(db: D1Database, response: RegistrationResponseJSON | AuthenticationResponseJSON): Promise<PendingChallenge> {
  const challenge = extractChallenge(response);
  const { results } = await db
    .prepare('SELECT challenge, did, expires_at FROM challenges WHERE challenge = ?')
    .bind(challenge)
    .all<{ challenge: string; did: string; expires_at: number }>();
  if (results.length === 0) throw new PasskeyError('challenge not found or expired', 401);
  const row = results[0];
  if (row.expires_at < Date.now()) {
    await db.prepare('DELETE FROM challenges WHERE challenge = ?').bind(challenge).run();
    throw new PasskeyError('challenge expired', 401);
  }
  return { challenge: row.challenge, did: row.did, expiresAt: row.expires_at };
}

export interface RegisterOptionsRequest {
  /** The did:key that the new passkey will be bound to. */
  did: string;
  username?: string;
}

/** Step 1 of registration — challenge for the browser's navigator.credentials.create(). */
export async function generateRegisterOptions(db: D1Database, request: Request, body: RegisterOptionsRequest) {
  const rpID = rpId(request);
  const { results } = await db.prepare('SELECT id FROM passkeys WHERE did = ?').bind(body.did).all<{ id: string }>();
  const options = await generateRegistrationOptions({
    rpName: 'P31 UI Forge',
    rpID,
    userName: body.username ?? body.did,
    userID: new TextEncoder().encode(body.did),
    userDisplayName: body.username ?? body.did,
    timeout: 60_000,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    excludeCredentials: results.map((r) => ({ id: r.id })),
  });
  await pruneChallenges(db);
  await db
    .prepare('INSERT OR REPLACE INTO challenges (challenge, did, expires_at) VALUES (?, ?, ?)')
    .bind(options.challenge, body.did, Date.now() + CHALLENGE_TTL_MS)
    .run();
  return options;
}

export interface RegisterVerifyRequest {
  did?: string;
  response: RegistrationResponseJSON;
}

/** Step 2 of registration — verify the browser attestation and store the credential bound to the DID. */
export async function verifyRegister(db: D1Database, request: Request, body: RegisterVerifyRequest) {
  const pending = await pendingFor(db, body.response);
  if (pending.did && body.did && pending.did !== body.did) {
    throw new PasskeyError('did does not match the registration challenge');
  }
  const verification = await verifyRegistrationResponse({
    response: body.response,
    expectedChallenge: pending.challenge,
    expectedOrigin: origin(request),
    expectedRPID: rpId(request),
  });
  if (!verification.verified || !verification.registrationInfo) {
    throw new PasskeyError('registration could not be verified');
  }
  const info = verification.registrationInfo;
  const did = pending.did ?? body.did ?? '';
  await db
    .prepare('INSERT OR REPLACE INTO passkeys (id, did, public_key, counter, transports, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(info.credential.id, did, hex(info.credential.publicKey), info.credential.counter, JSON.stringify(info.credential.transports), Date.now())
    .run();
  await db.prepare('DELETE FROM challenges WHERE challenge = ?').bind(pending.challenge).run();
  return { did, credentialID: info.credential.id };
}

export interface LoginOptionsRequest {
  /** Optional DID filter — restricts allowCredentials to that DID's registered passkeys. */
  did?: string;
}

/** Step 1 of login — challenge for the browser's navigator.credentials.get(). */
export async function generateLoginOptions(db: D1Database, request: Request, body: LoginOptionsRequest) {
  await pruneChallenges(db);
  const allowCredentials = body.did
    ? (await db.prepare('SELECT id, transports FROM passkeys WHERE did = ?').bind(body.did).all<{ id: string; transports: string }>()).results.map((r) => ({
        id: r.id,
        transports: r.transports ? (JSON.parse(r.transports) as string[]) : undefined,
      }))
    : undefined;
  const options = await generateAuthenticationOptions({
    rpID: rpId(request),
    allowCredentials,
    userVerification: 'preferred',
    timeout: 60_000,
  });
  await db
    .prepare('INSERT OR REPLACE INTO challenges (challenge, did, expires_at) VALUES (?, ?, ?)')
    .bind(options.challenge, body.did ?? null, Date.now() + CHALLENGE_TTL_MS)
    .run();
  return options;
}

export interface LoginVerifyRequest {
  response: AuthenticationResponseJSON;
}

/** Step 2 of login — verify the assertion and return the DID bound to the passkey. */
export async function verifyLogin(db: D1Database, request: Request, body: LoginVerifyRequest) {
  const pending = await pendingFor(db, body.response);
  const { results } = await db
    .prepare('SELECT id, did, public_key, counter, transports FROM passkeys WHERE id = ?')
    .bind(body.response.id)
    .all<{ id: string; did: string; public_key: string; counter: number; transports: string }>();
  if (results.length === 0) throw new PasskeyError('passkey not registered', 401);
  const row = results[0];
  const credential: WebAuthnCredential = {
    id: row.id,
    publicKey: unhex(row.public_key),
    counter: row.counter,
    transports: row.transports ? (JSON.parse(row.transports) as string[]) : undefined,
  };
  const verification = await verifyAuthenticationResponse({
    response: body.response,
    expectedChallenge: pending.challenge,
    expectedOrigin: origin(request),
    expectedRPID: rpId(request),
    credential,
  });
  if (!verification.verified) {
    throw new PasskeyError('authentication could not be verified', 401);
  }
  await db.prepare('UPDATE passkeys SET counter = ? WHERE id = ?').bind(verification.authenticationInfo.newCounter, body.response.id).run();
  await db.prepare('DELETE FROM challenges WHERE challenge = ?').bind(pending.challenge).run();
  return { did: row.did, credentialID: body.response.id };
}