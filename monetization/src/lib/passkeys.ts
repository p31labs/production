/**
 * Passkey (WebAuthn) registration and authentication for the Capital Machine portal.
 *
 * Credentials are held in a module-level Map, which is per-isolate and not
 * durable across deployments. This is a pragmatic, non-persistent store for
 * development and preview. Production must move credential persistence to D1
 * (a `passkeys` table) once a D1 binding is added to this worker — see
 * docs/ZERO-TRUST.md, section "Passkey persistence".
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

/** per-isolate credential store — see docs/ZERO-TRUST.md §Passkey persistence */
const credentials = new Map<string, PasskeyCredential>();
const pendingChallenges = new Map<string, PendingChallenge>();

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

function prunePending(): void {
  const now = Date.now();
  for (const [challenge, pending] of pendingChallenges) {
    if (pending.expiresAt < now) pendingChallenges.delete(challenge);
  }
}

function pendingFor(response: RegistrationResponseJSON | AuthenticationResponseJSON): PendingChallenge {
  const challenge = extractChallenge(response);
  const pending = pendingChallenges.get(challenge);
  if (!pending) throw new PasskeyError('challenge not found or expired', 401);
  if (pending.expiresAt < Date.now()) {
    pendingChallenges.delete(challenge);
    throw new PasskeyError('challenge expired', 401);
  }
  return pending;
}

export interface RegisterOptionsRequest {
  /** The did:key that the new passkey will be bound to. */
  did: string;
  username?: string;
}

/** Step 1 of registration — challenge for the browser's navigator.credentials.create(). */
export async function generateRegisterOptions(request: Request, body: RegisterOptionsRequest) {
  const rpID = rpId(request);
  const existing = [...credentials.values()].filter((c) => c.did === body.did).map((c) => ({ id: c.id }));
  const options = await generateRegistrationOptions({
    rpName: 'P31 Capital Machine',
    rpID,
    userName: body.username ?? body.did,
    userID: new TextEncoder().encode(body.did),
    userDisplayName: body.username ?? body.did,
    timeout: 60_000,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    excludeCredentials: existing,
  });
  prunePending();
  pendingChallenges.set(options.challenge, {
    challenge: options.challenge,
    did: body.did,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return options;
}

export interface RegisterVerifyRequest {
  did?: string;
  response: RegistrationResponseJSON;
}

/** Step 2 of registration — verify the browser attestation and store the credential bound to the DID. */
export async function verifyRegister(request: Request, body: RegisterVerifyRequest) {
  const pending = pendingFor(body.response);
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
  credentials.set(info.credential.id, {
    id: info.credential.id,
    publicKey: info.credential.publicKey,
    counter: info.credential.counter,
    transports: info.credential.transports,
    did,
    createdAt: Date.now(),
  });
  pendingChallenges.delete(extractChallenge(body.response));
  return { did, credentialID: info.credential.id };
}

export interface LoginOptionsRequest {
  /** Optional DID filter — restricts allowCredentials to that DID's registered passkeys. */
  did?: string;
}

/** Step 1 of login — challenge for the browser's navigator.credentials.get(). */
export async function generateLoginOptions(request: Request, body: LoginOptionsRequest) {
  prunePending();
  const allowCredentials = body.did
    ? [...credentials.values()].filter((c) => c.did === body.did).map((c) => ({ id: c.id, transports: c.transports }))
    : undefined;
  const options = await generateAuthenticationOptions({
    rpID: rpId(request),
    allowCredentials,
    userVerification: 'preferred',
    timeout: 60_000,
  });
  pendingChallenges.set(options.challenge, {
    challenge: options.challenge,
    did: body.did,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return options;
}

export interface LoginVerifyRequest {
  response: AuthenticationResponseJSON;
}

/** Step 2 of login — verify the assertion and return the DID bound to the passkey. */
export async function verifyLogin(request: Request, body: LoginVerifyRequest) {
  const pending = pendingFor(body.response);
  const credential = credentials.get(body.response.id);
  if (!credential) throw new PasskeyError('passkey not registered', 401);
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
  credential.counter = verification.authenticationInfo.newCounter;
  pendingChallenges.delete(extractChallenge(body.response));
  return { did: credential.did, credentialID: credential.id };
}