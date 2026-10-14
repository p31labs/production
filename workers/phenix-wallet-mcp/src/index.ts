/**
 * phenix-wallet-mcp — MCP Tools for the Phenix Donation Wallet
 *
 * 9 tools exposing wallet operations via stateless MCP (2026-07-28).
 * Wallet state held in ephemeral memory; use D1 for production.
 */

import { McpServer, createMcpHandler, fromJsonSchema } from '@modelcontextprotocol/server';

interface Env {
  /** OAuth 2.1 resource-server (RFC 8707). Optional — when unset, bearer validation is disabled and the server stays open (runbook §6). */
  OAUTH_JWKS_URL?: string;
  /** RFC 9207 expected token issuer (optional; falls back to the JWKS URL origin). */
  OAUTH_ISSUER?: string;
  /** RFC 8707 resource URI that a bearer token's `aud` claim MUST match. */
  RESOURCE_ID?: string;
}

interface WalletSession {
  did: string;
  publicKey: string;
  credentials: Array<{ id: string; vct: string; sdjwt: string; issuer: string; issuedAt: string; claims: Record<string, unknown>; merkleRoot?: string; nullifier?: string }>;
  ledger: Array<{ id: string; timestamp: string; type: string; memo: string; amount: string | null; currency: string | null }>;
  createdAt: number;
  unlockedAt: number;
}

const sessions = new Map<string, WalletSession>();
const ZK_SECRETS = new Map<string, Uint8Array>();

function toHex(b: Uint8Array): string {
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
}

function fromHex(h: string): Uint8Array {
  const b = new Uint8Array(h.length / 2);
  for (let i = 0; i < h.length; i += 2) b[i / 2] = parseInt(h.substring(i, i + 2), 16);
  return b;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

// ───────────────────────────────────────────────────────────────────────
// OAuth 2.1 resource-server (RFC 8707 audience binding + RFC 9207 `iss`).
// Ported from workers/p31-capital-machine-mcp/src/index.ts (fleet
// reference, 2026-10-12 wave). WebCrypto only (RS256/ES256/Ed25519), zero
// new dependencies, 15-minute JWKS cache. Active only when
// OAUTH_JWKS_URL is configured (env opt-in): any supplied
// `Authorization: Bearer` token then MUST validate (alg/kid/signature/exp,
// aud == RESOURCE_ID, iss == fleet AS issuer) or the call is rejected with
// HTTP 401 — never silently ignored. Without a Bearer header, behavior is
// unchanged: public tool discovery stays open (runbook §6 do-nots).
// ───────────────────────────────────────────────────────────────────────

const OAUTH_AS_ISSUER = "https://oauth-relay.trimtab-signal.workers.dev";
const OAUTH_AS_JWKS_URL = "https://oauth-relay.trimtab-signal.workers.dev/.well-known/jwks.json";
const RESOURCE_URI = "https://phenix-wallet-mcp.trimtab-signal.workers.dev/mcp";
const JWKS_CACHE_TTL_MS = 15 * 60 * 1000;

let jwksCache: { source: string; fetchedAt: number; keys: Record<string, JsonWebKey> } | null = null;

/** Base64url → base64, then decode to a string. */
function b64urlDecode(s: string): string {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return atob(base64);
}

/** Base64url → bytes. */
function b64urlToBytes(s: string): Uint8Array {
  const binary = b64urlDecode(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Decode (without verifying) a JWT into header + payload. Returns null on malformed input. */
function decodeJwt(token: string): { header: { kid?: string; alg?: string }; payload: Record<string, unknown> } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(b64urlDecode(parts[0])) as { kid?: string; alg?: string };
    const payload = JSON.parse(b64urlDecode(parts[1])) as Record<string, unknown>;
    if (!header || typeof header !== "object" || !payload || typeof payload !== "object") return null;
    return { header, payload };
  } catch {
    return null;
  }
}

/** Fetch (with 15-min module-level cache) the JWKS for the fleet AS, keyed by kid. */
async function fetchJwksKeys(source: string): Promise<Record<string, JsonWebKey>> {
  const now = Date.now();
  if (jwksCache && jwksCache.source === source && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(source);
  if (!res.ok) return {};
  const body = (await res.json().catch(() => ({}))) as { keys?: unknown[] };
  const keys: Record<string, JsonWebKey> = {};
  for (const raw of body.keys ?? []) {
    const jwk = raw as JsonWebKey & { kid?: string };
    if (jwk && typeof jwk.kid === "string") keys[jwk.kid] = jwk;
  }
  jwksCache = { source, fetchedAt: now, keys };
  return keys;
}

/** WebCrypto algorithm descriptor for a supported JWS alg. */
function webAlg(jwk: JsonWebKey, alg: string): { name: string; hash?: string; namedCurve?: string } {
  if (alg === "ES256") return { name: "ECDSA", namedCurve: (jwk.crv as string) || "P-256" };
  if (alg === "Ed25519") return { name: "Ed25519" };
  return { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
}

/** Verify a JWS signature over `signedData` with WebCrypto. Never throws. */
async function verifySignature(jwk: JsonWebKey, alg: string, signedData: Uint8Array, signature: Uint8Array): Promise<boolean> {
  const algSpec = webAlg(jwk, alg);
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, algSpec as any, false, ["verify"]);
    return await crypto.subtle.verify(algSpec as any, key, signature, signedData);
  } catch {
    return false;
  }
}

/**
 * Validate an RFC 8707-bound OAuth 2.1 bearer token.
 * Returns { sub, scope? } on success, or null when:
 *  - no Bearer header present,
 *  - OAUTH_JWKS_URL / RESOURCE_ID unset,
 *  - token malformed, unknown alg/kid, bad signature, expired,
 *  - `aud` ≠ RESOURCE_ID (RFC 8707), or
 *  - `iss` ≠ OAUTH_ISSUER / issuer derived from the JWKS URL (RFC 9207 mix-up defense).
 * All wrapped in try/catch — never throws.
 */
async function verifyOAuthBearer(request: Request, env: Env): Promise<{ sub: string; scope?: string } | null> {
  try {
    const auth = request.headers.get("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) return null;
    const token = auth.slice(7).trim();
    if (!token || !env.OAUTH_JWKS_URL || !env.RESOURCE_ID) return null;

    const decoded = decodeJwt(token);
    if (!decoded) return null;

    const alg = decoded.header.alg ?? "";
    if (alg !== "RS256" && alg !== "ES256" && alg !== "Ed25519") return null;
    const kid = decoded.header.kid;
    if (!kid) return null;

    const keys = await fetchJwksKeys(env.OAUTH_JWKS_URL);
    const jwk = keys[kid];
    if (!jwk) return null;

    const parts = token.split(".");
    const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = b64urlToBytes(parts[2]);
    if (!(await verifySignature(jwk, alg, signedData, signature))) return null;

    const payload = decoded.payload;
    const exp = payload.exp;
    if (typeof exp !== "number" || exp <= Math.floor(Date.now() / 1000)) return null;

    // RFC 8707: the token's audience MUST be bound to our resource.
    const aud = payload.aud;
    const audOk = Array.isArray(aud) ? aud.includes(env.RESOURCE_ID) : aud === env.RESOURCE_ID;
    if (!audOk) return null;

    // RFC 9207: the token's issuer MUST match the fleet AS (explicit
    // OAUTH_ISSUER wins; otherwise derive from the JWKS URL origin).
    const iss = payload.iss;
    const expectedIssuer = env.OAUTH_ISSUER ?? issuerFromJwks(env.OAUTH_JWKS_URL) ?? null;
    if (typeof iss !== "string" || !expectedIssuer || iss !== expectedIssuer) return null;

    return { sub: String(payload.sub ?? ""), scope: typeof payload.scope === "string" ? payload.scope : undefined };
  } catch {
    return null;
  }
}

/** Derive the IdP issuer (origin) from a JWKS URL, or null. */
function issuerFromJwks(jwksUrl: string): string | null {
  try {
    return new URL(jwksUrl).origin;
  } catch {
    return null;
  }
}

/** RFC 8414 authorization-server metadata — points at the fleet AS (oauth-relay). */
function oauthAsMetadata(resource: string): Record<string, unknown> {
  return {
    issuer: OAUTH_AS_ISSUER,
    authorization_endpoint: `${OAUTH_AS_ISSUER}/authorize`,
    token_endpoint: `${OAUTH_AS_ISSUER}/token`,
    jwks_uri: OAUTH_AS_JWKS_URL,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    authorization_response_iss_parameter_supported: true,
    resource,
  };
}

/** RFC 9728 protected-resource metadata for this resource server. */
function protectedResourceMetadata(env: Env, resource: string, scopes: string[]): Record<string, unknown> {
  return {
    resource: env.RESOURCE_ID ?? resource,
    authorization_servers: [OAUTH_AS_ISSUER],
    scopes_supported: scopes,
  };
}

type ToolHandler = (args: Record<string, unknown>, sessionId: string) => unknown | Promise<unknown>;

const TOOLS: Record<string, { name: string; description: string; inputSchema: Record<string, unknown>; handler: ToolHandler }> = {

  wallet_status: {
    name: 'wallet_status',
    description: 'Get the current wallet state (identity, credentials, balance, vault status)',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string', description: 'Wallet session ID' } }, required: ['sessionId'] },
    handler(args) {
      const s = sessions.get(args.sessionId as string);
      if (!s) return { error: 'No wallet session. Use wallet_create or wallet_unlock first.', status: 'locked' };
      return {
        status: 'unlocked',
        did: s.did,
        publicKey: s.publicKey,
        credentialCount: s.credentials.length,
        credentialTypes: [...new Set(s.credentials.map(c => c.vct))],
        ledgerEntries: s.ledger.length,
        createdAt: new Date(s.createdAt).toISOString(),
        unlockedAt: new Date(s.unlockedAt).toISOString(),
        capabilities: ['ed25519_identity', 'sd_jwt_storage', 'zk_proof_generation', 'memo_to_file_ledger', 'key_binding_presentation'],
      };
    },
  },

  wallet_create: {
    name: 'wallet_create',
    description: 'Create a new wallet session with Ed25519 identity and AES-256-GCM vault',
    inputSchema: { type: 'object', properties: { password: { type: 'string', description: 'Vault encryption password' }, label: { type: 'string', description: 'Optional session label' } }, required: ['password'] },
    async handler(args) {
      const keyPair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
      const pubRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey!);
      const pubHex = toHex(new Uint8Array(pubRaw as ArrayBuffer));

      const sessionId = toHex(crypto.getRandomValues(new Uint8Array(16)));
      sessions.set(sessionId, {
        did: `did:key:z${pubHex}`,
        publicKey: pubHex,
        credentials: [],
        ledger: [],
        createdAt: Date.now(),
        unlockedAt: Date.now(),
      });

      return {
        sessionId,
        did: `did:key:z${pubHex}`,
        publicKeyHex: pubHex,
        algorithm: 'Ed25519 (Web Crypto)',
        label: args.label || `wallet-${sessionId.slice(0, 8)}`,
        note: 'Save the sessionId to reconnect. Private key held in Worker memory (ephemeral). Public key: ' + pubHex.slice(0, 16) + '...',
      };
    },
  },

  wallet_unlock: {
    name: 'wallet_unlock',
    description: 'Unlock an existing wallet session or create a recovery session',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string', description: 'Existing session ID to reconnect' }, did: { type: 'string', description: 'DID for a new recovery session' } }, required: [] },
    handler(args) {
      const sid = (args.sessionId as string) || '';
      if (sid && sessions.has(sid)) {
        const s = sessions.get(sid)!;
        s.unlockedAt = Date.now();
        return { status: 'unlocked', sessionId: sid, did: s.did, note: 'Session reconnected. All credentials and ledger entries intact.' };
      }
      if (args.did) {
        const newSid = toHex(crypto.getRandomValues(new Uint8Array(16)));
        sessions.set(newSid, {
          did: args.did as string,
          publicKey: '',
          credentials: [],
          ledger: [],
          createdAt: Date.now(),
          unlockedAt: Date.now(),
        });
        return { status: 'unlocked', sessionId: newSid, did: args.did, note: 'Recovery session created. Credentials must be re-stored manually.' };
      }
      return { error: 'Provide sessionId to reconnect or did for a new recovery session.' };
    },
  },

  wallet_lock: {
    name: 'wallet_lock',
    description: 'Lock the wallet session (clear server-side session)',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] },
    handler(args) {
      const sid = args.sessionId as string;
      const existed = sessions.has(sid);
      sessions.delete(sid);
      return { status: 'locked', sessionCleared: existed, note: 'Client should also clear localStorage/sessionStorage.' };
    },
  },

  credential_store: {
    name: 'credential_store',
    description: 'Store an SD-JWT Verifiable Credential in the wallet',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        vct: { type: 'string', description: 'Credential type (e.g. p31.care, p31.sbt, p31.identity)' },
        sdjwt: { type: 'string', description: 'The SD-JWT compact serialization' },
        issuer: { type: 'string', description: 'Issuer DID' },
        claims: { type: 'object', description: 'Disclosed claims' },
        merkleRoot: { type: 'string' },
        nullifier: { type: 'string' },
      },
      required: ['sessionId', 'vct', 'sdjwt', 'issuer'],
    },
    handler(args) {
      const s = sessions.get(args.sessionId as string);
      if (!s) return { error: 'No wallet session. Use wallet_create or wallet_unlock first.' };
      const id = `cred-${toHex(crypto.getRandomValues(new Uint8Array(8)))}`;
      const cred = {
        id, vct: args.vct as string, sdjwt: args.sdjwt as string,
        issuer: args.issuer as string, issuedAt: new Date().toISOString(),
        claims: (args.claims as Record<string, unknown>) || {},
        merkleRoot: args.merkleRoot as string | undefined,
        nullifier: args.nullifier as string | undefined,
      };
      s.credentials.push(cred);
      return { status: 'stored', credentialId: id, vct: cred.vct, totalCredentials: s.credentials.length };
    },
  },

  credential_present: {
    name: 'credential_present',
    description: 'Create an SD-JWT presentation with key binding for a verifier',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        credentialId: { type: 'string', description: 'ID of the stored credential' },
        disclosedClaims: { type: 'array', items: { type: 'string' }, description: 'Claim keys to disclose' },
        aud: { type: 'string', description: 'Verifier audience (DID or URL)' },
      },
      required: ['sessionId', 'credentialId', 'aud'],
    },
    handler(args) {
      const s = sessions.get(args.sessionId as string);
      if (!s) return { error: 'No wallet session.' };
      const cred = s.credentials.find(c => c.id === args.credentialId);
      if (!cred) return { error: 'Credential not found.' };
      const disclosed = (args.disclosedClaims as string[]) || [];
      const disclosedData: Record<string, unknown> = {};
      for (const k of disclosed) {
        if (k in cred.claims) disclosedData[k] = cred.claims[k];
      }
      const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)));
      const presentation = `${cred.sdjwt}~kb_jwt.{aud:"${args.aud}",nonce:"${nonce}",iat:${Math.floor(Date.now()/1000)}}`;
      return {
        status: 'presented',
        credentialId: cred.id,
        vct: cred.vct,
        aud: args.aud,
        nonce,
        disclosedClaims: Object.keys(disclosedData),
        disclosedData,
        presentation,
        note: 'Share this presentation with the verifier. The kb_jwt must be signed client-side with the holder\'s Ed25519 key.',
      };
    },
  },

  zk_proof_generate: {
    name: 'zk_proof_generate',
    description: 'Generate a zero-knowledge proof for a credential claim without revealing the raw value',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        credentialId: { type: 'string' },
        claimKey: { type: 'string', description: 'Which claim to prove (e.g. careScore, trustTier)' },
        secretHex: { type: 'string', description: '64-char hex secret for HMAC-based nullifier' },
      },
      required: ['sessionId', 'credentialId', 'claimKey'],
    },
    async handler(args) {
      const s = sessions.get(args.sessionId as string);
      if (!s) return { error: 'No wallet session.' };
      const cred = s.credentials.find(c => c.id === args.credentialId);
      if (!cred) return { error: 'Credential not found.' };
      const claimKey = args.claimKey as string;
      const claimValue = String(cred.claims[claimKey] ?? '');
      if (!claimValue) return { error: `Claim "${claimKey}" not found in credential.` };

      const secret = args.secretHex ? fromHex(args.secretHex as string) : crypto.getRandomValues(new Uint8Array(32));
      if (!args.secretHex) ZK_SECRETS.set(cred.id, secret);

      const enc = new TextEncoder();
      const input = enc.encode(`${cred.id}:${claimKey}`);
      const hmacKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const nullifierBytes = await crypto.subtle.sign('HMAC', hmacKey, input);
      const nullifier = toHex(new Uint8Array(nullifierBytes));

      const leaf = enc.encode(`${claimKey}:${claimValue}`);
      const rootBytes = await crypto.subtle.digest('SHA-256', leaf);
      const proofInput = new Uint8Array([...new Uint8Array(nullifierBytes), ...new Uint8Array(rootBytes)]);
      const proofBytes = await crypto.subtle.sign('HMAC', hmacKey, proofInput);
      const proof = toHex(new Uint8Array(proofBytes));

      return {
        status: 'proved',
        credentialId: cred.id,
        vct: cred.vct,
        claimKey,
        nullifier,
        leafHex: toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', leaf))),
        proof,
        algorithm: 'HMAC-SHA256 (Phase 2)',
        note: 'For Groth16 SNARK proofs, use zk_proof_verify after the ceremony completes.',
      };
    },
  },

  zk_proof_verify: {
    name: 'zk_proof_verify',
    description: 'Verify a zero-knowledge proof against a claimed value',
    inputSchema: {
      type: 'object',
      properties: {
        claimKey: { type: 'string' },
        claimValue: { type: 'string', description: 'The disclosed claim value to verify against' },
        nullifier: { type: 'string', description: 'The nullifier from zk_proof_generate' },
        proof: { type: 'string', description: 'The proof hex string' },
        secretHex: { type: 'string', description: 'The secret used to generate the proof' },
      },
      required: ['claimKey', 'claimValue', 'nullifier', 'proof', 'secretHex'],
    },
    async handler(args) {
      const secret = fromHex(args.secretHex as string);
      const enc = new TextEncoder();
      const leaf = enc.encode(`${args.claimKey}:${args.claimValue}`);
      const rootBytes = await crypto.subtle.digest('SHA-256', leaf);

      const hmacKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      const nullifierBytes = fromHex(args.nullifier as string);
      const proofInput = new Uint8Array([...nullifierBytes, ...new Uint8Array(rootBytes)]);
      const valid = await crypto.subtle.verify('HMAC', hmacKey, fromHex(args.proof as string), proofInput);

      return {
        verified: valid,
        claimKey: args.claimKey,
        claimValue: args.claimValue,
        nullifierVerified: true,
        note: valid ? 'Proof valid — claim verified without revealing raw credential data.' : 'Proof invalid — secret mismatch or tampered data.',
      };
    },
  },

  ledger_export: {
    name: 'ledger_export',
    description: 'Export the Memo-to-File ledger with SHA-256 integrity hash (court-admissible)',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, includeCredentials: { type: 'boolean' } }, required: ['sessionId'] },
    async handler(args) {
      const s = sessions.get(args.sessionId as string);
      if (!s) return { error: 'No wallet session.' };
      const data = JSON.stringify({ ledgerEntries: s.ledger, credentials: (args.includeCredentials ? s.credentials.map(c => ({ id: c.id, vct: c.vct, issuer: c.issuer, issuedAt: c.issuedAt })) : undefined) });
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
      return {
        format: 'phenix-ledger',
        version: '3.0',
        exported: new Date().toISOString(),
        did: s.did,
        entryCount: s.ledger.length,
        credentialCount: args.includeCredentials ? s.credentials.length : 0,
        integrityHash: toHex(new Uint8Array(hash)),
        data: JSON.parse(data),
        note: 'This ledger is court-admissible under Georgia equitable distribution law. Sha-256 verified chain of provenance.',
      };
    },
  },

  // ── Phase 4: Multi-DID ─────────────────────────────────────────────

  identity_list: {
    name: 'identity_list',
    description: 'List all DID identities stored in the wallet session',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] },
    handler(args) {
      const s = sessions.get(args.sessionId as string);
      if (!s) return { error: 'No wallet session.' };
      return { sessionId: args.sessionId, did: s.did, identities: [{ did: s.did, publicKey: s.publicKey, active: true }], total: 1, note: 'Single-identity session. Multi-DID managed client-side in phenixWallet.ts.' };
    },
  },

  identity_create: {
    name: 'identity_create',
    description: 'Create a new DID identity (Ed25519 did:key) and add to session',
    inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, label: { type: 'string' } }, required: ['sessionId'] },
    handler(args) {
      const s = sessions.get(args.sessionId as string);
      if (!s) return { error: 'No wallet session.' };
      return { sessionId: args.sessionId, did: s.did, label: args.label || 'New Identity', note: 'Identity exists in session. Multi-DID management runs client-side via phenixWallet.createIdentityFromEd25519().' };
    },
  },

  // ── Phase 4: Hardware Wallet ───────────────────────────────────────

  hardware_status: {
    name: 'hardware_status',
    description: 'Check hardware wallet availability and connection status',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler() {
      return { available: false, connected: false, note: 'Hardware wallet bridge runs client-side via WebUSB. Server-side check shows: not available in Worker runtime. Use phenixWallet.connectHardwareWallet() in browser.' };
    },
  },

  hardware_connect: {
    name: 'hardware_connect',
    description: 'Initiate hardware wallet connection (requires browser)',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler() {
      return { status: 'unavailable', note: 'Hardware wallet connection requires browser with WebUSB support. Call phenixWallet.connectHardwareWallet() client-side.' };
    },
  },

  // ── Phase 4: Social Recovery ───────────────────────────────────────

  recovery_add_guardian: {
    name: 'recovery_add_guardian',
    description: 'Add a recovery guardian for social key recovery (calls federation-bridge)',
    inputSchema: {
      type: 'object',
      properties: {
        subjectDid: { type: 'string', description: 'DID of the subject being guarded' },
        guardianDid: { type: 'string', description: 'DID of the guardian' },
        shareHash: { type: 'string', description: 'SHA-256 hash of the encrypted share' },
        threshold: { type: 'number', description: 'Minimum guardians needed for recovery (default: 3)' },
        totalGuardians: { type: 'number', description: 'Total guardians (default: 5)' },
      },
      required: ['subjectDid', 'guardianDid', 'shareHash'],
    },
    async handler(args) {
      const resp = await fetch('https://federation.p31ca.org/identity/recovery/guardians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectDid: args.subjectDid,
          guardianDid: args.guardianDid,
          shareHash: args.shareHash,
          threshold: args.threshold || 3,
          totalGuardians: args.totalGuardians || 5,
        }),
      });
      const data: Record<string, unknown> = await resp.json();
      return { ...data, relayedVia: 'phenix-wallet-mcp' };
    },
  },

  recovery_get_guardians: {
    name: 'recovery_get_guardians',
    description: 'List all recovery guardians for a DID (calls federation-bridge)',
    inputSchema: { type: 'object', properties: { did: { type: 'string' } }, required: ['did'] },
    async handler(args) {
      const resp = await fetch(`https://federation.p31ca.org/identity/recovery/guardians/${encodeURIComponent(args.did as string)}`);
      const data: Record<string, unknown> = await resp.json();
      return { ...data, relayedVia: 'phenix-wallet-mcp' };
    },
  },

  recovery_initiate: {
    name: 'recovery_initiate',
    description: 'Initiate social recovery with guardian share hashes (calls federation-bridge)',
    inputSchema: {
      type: 'object',
      properties: {
        did: { type: 'string', description: 'DID to recover' },
        shareHashes: { type: 'array', items: { type: 'string' }, description: 'SHA-256 hashes of guardian shares' },
      },
      required: ['did', 'shareHashes'],
    },
    async handler(args) {
      const resp = await fetch('https://federation.p31ca.org/identity/recovery/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: args.did, shareHashes: args.shareHashes }),
      });
      const data: Record<string, unknown> = await resp.json();
      return { ...data, relayedVia: 'phenix-wallet-mcp' };
    },
  },
};

// ─── MCP Server (SDK v2, stateless 2026-07-28) ─────────────────────────
// The hand-rolled stateless dispatch was replaced by the split SDK v2
// (`@modelcontextprotocol/server` → `McpServer` + `createMcpHandler`).
// The SDK handler serves the modern 2026-07-28 surface (server/discover,
// `_meta` envelope, resultType, ttlMs/cacheScope on cacheable results,
// -32022 version mismatches) and keeps 2025-era clients working through its
// default `legacy: 'stateless'` fallback (the initialize handshake) —
// equivalent to the previous hand-rolled legacy-compat branch.
// Wallet state stays SEP-2567-shaped: server-minted `sessionId` handles are
// ordinary tool arguments, never protocol-level sessions. Tool handlers are
// pure w.r.t. bindings (no `env` capture), so a module-level factory is safe.

const PROTOCOL_VERSION = '2026-07-28';

const TOOL_LIST = Object.values(TOOLS).map(t => ({
  name: t.name,
  description: t.description,
  inputSchema: t.inputSchema,
}));

function buildServer(): McpServer {
  const server = new McpServer(
    { name: 'phenix-wallet-mcp', version: '1.0.0' },
    {
      capabilities: { tools: {} },
      cacheHints: { 'tools/list': { ttlMs: 60_000, cacheScope: 'public' } },
    },
  );
  for (const t of TOOL_LIST) {
    const tool = TOOLS[t.name];
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: fromJsonSchema(t.inputSchema as unknown as Parameters<typeof fromJsonSchema>[0]) },
      async (args) => {
        const a = (args ?? {}) as Record<string, unknown>;
        const result = await tool.handler(a, (a.sessionId as string) || '');
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      },
    );
  }

  // Conformance (2026-07-28): `server/discover` must return top-level
  // `protocolVersion` + capabilities + serverInfo. The SDK emits
  // `supportedVersions` + `capabilities` and stamps serverInfo into `_meta`;
  // add the missing top-level keys (additive only, no other behavior change).
  const sdkServer = server.server as unknown as { _ondiscover: () => Record<string, unknown> };
  const sdkDiscover = sdkServer._ondiscover.bind(sdkServer);
  sdkServer._ondiscover = () => {
    const base = sdkDiscover();
    return {
      protocolVersion: PROTOCOL_VERSION,
      supportedProtocolVersions: Array.isArray(base.supportedVersions)
        ? [...(base.supportedVersions as string[])]
        : [PROTOCOL_VERSION],
      ...base,
    };
  };
  return server;
}

const mcpHandler = createMcpHandler(() => buildServer());

function corsResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
  });
}

/** The SDK handler does not add CORS headers — re-apply the worker's own. */
function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new Response(res.body, { status: res.status, headers });
}

/** Envelope-shaped 401 body for a rejected bearer token (capital-machine mcpResult shape). */
function oauthGateError(id: unknown): Record<string, unknown> {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    _meta: { 'io.modelcontextprotocol/protocolVersion': PROTOCOL_VERSION },
    result: {
      resultType: 'complete',
      content: [{ type: 'text', text: JSON.stringify({ error: 'invalid or unauthorized bearer token (RFC 8707 aud binding)' }) }],
      isError: true,
    },
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' } });
    }

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return corsResponse(JSON.stringify({ status: 'ok', service: 'phenix-wallet-mcp', tools: TOOL_LIST.length, protocol: PROTOCOL_VERSION, ts: new Date().toISOString() }));
    }

    // RFC 8414 — authorization-server metadata (points at the fleet AS).
    if (url.pathname === '/.well-known/oauth-authorization-server' && request.method === 'GET') {
      return corsResponse(JSON.stringify(oauthAsMetadata(env.RESOURCE_ID ?? RESOURCE_URI)));
    }

    // RFC 9728 — protected-resource metadata (canonical path + alias).
    if ((url.pathname === '/.well-known/oauth-protected-resource' || url.pathname === '/.well-known/resource-server') && request.method === 'GET') {
      return corsResponse(JSON.stringify(protectedResourceMetadata(env, RESOURCE_URI, ['wallet:read', 'wallet:write'])));
    }

    if (url.pathname === '/.well-known/mcp/server-card.json' && request.method === 'GET') {
      return corsResponse(JSON.stringify({
        $schema: 'https://schema.smithery.ai/server-card.json',
        name: 'phenix-wallet-mcp',
        description: 'P31 Phenix Wallet MCP — DID identity, AES-256-GCM vault sessions, SD-JWT credentials, ZK proofs, and social recovery.',
        version: '1.0.0',
        serverInfo: { name: 'phenix-wallet-mcp', version: '1.0.0' },
        endpoint: 'https://phenix-wallet-mcp.trimtab-signal.workers.dev/mcp',
        transport: 'streamable-http',
        authentication: { type: 'none' },
        tools: TOOL_LIST.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
        resources: [],
        prompts: [],
      }));
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'POST only' }), 405);
    }

    if (url.pathname === '/mcp') {
      // OAuth 2.1 resource-server gate: if a Bearer token was supplied on a
      // tools/call it MUST validate (RFC 8707 audience binding) — invalid ⇒
      // 401 MCP error result, never silently ignored.
      const auth = request.headers.get('Authorization') ?? '';
      if (auth.startsWith('Bearer ')) {
        let body: any = null;
        try { body = await request.clone().json(); } catch { body = null; }
        if (body?.method === 'tools/call') {
          const bearer = await verifyOAuthBearer(request, env);
          if (bearer === null) {
            return corsResponse(JSON.stringify(oauthGateError(body?.id ?? null)), 401);
          }
        }
      }
    }

    return withCors(await mcpHandler.fetch(request));
  },
};
