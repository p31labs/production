/**
 * p31-key-rotator — in-house key creator / rotation assistant
 * (zero-dependency Cloudflare Worker, no @cloudflare/workers-types).
 *
 * Honest boundary (non-negotiable):
 *   This Worker CANNOT rotate Cloudflare secrets itself. `wrangler secret
 *   put` requires the owner's OAuth session stored on a real machine
 *   (~/.wrangler/config/default.toml) — a Worker has no access to that
 *   session, and pretending otherwise would be a lie about capability.
 *   What this Worker does: generate key material (Web Crypto) and emit
 *   the exact dual-credential rotation instructions for an operator.
 *   The real rotation runs via scripts/key-rotate.mjs on the owner's
 *   machine. See docs/enterprise/operations/secret-rotation-runbook.md.
 *
 * Endpoints:
 *   GET  /        — plain-language description + the honest boundary.
 *   GET  /health  — liveness: service name, timestamp, whether the shared
 *                   secret is provisioned (never its value).
 *   POST /genkey  — shared-secret gated: returns one fresh 32-byte
 *                   base64url key.
 *   POST /rotate  — shared-secret gated: returns a fresh key + the
 *                   operator instructions (dual-credential window,
 *                   rollback path, exact CLI command).
 *
 * Auth: POST endpoints require header `X-Rotator-Token` matching the
 * Worker secret ROTATOR_SHARED_SECRET (owner-set via wrangler, never
 * hardcoded). The comparison is constant-time. If the secret is not
 * provisioned, the endpoints answer 503 with provisioning instructions —
 * never a guessable state.
 */

interface Env {
  /** Shared secret for the POST endpoints. Owner-set. May be absent. */
  ROTATOR_SHARED_SECRET?: string;
}

const KEY_BYTES = 32; // 256-bit key material, base64url-encoded on the way out.

const ROOT_TEXT = [
  'P31 key rotator — key generation + rotation instructions for the P31 estate.',
  '',
  'Endpoints:',
  '  GET  /health  — liveness (no secrets).',
  '  POST /genkey  — one fresh 32-byte base64url key (requires X-Rotator-Token).',
  '  POST /rotate  — a fresh key + dual-credential rotation instructions',
  '                  (requires X-Rotator-Token).',
  '',
  'Honest boundary: this Worker NEVER calls `wrangler secret put`. That',
  'command needs the owner OAuth session on a real machine; a Worker has',
  'no access to it. This Worker only generates keys and prints the exact',
  'steps the operator runs with scripts/key-rotate.mjs.',
  '',
  'Docs: docs/enterprise/operations/secret-rotation-runbook.md',
].join('\n');

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Constant-time string comparison (timing-safe auth check). */
function constantTimeEqual(a: string, b: string): boolean {
  const A = new TextEncoder().encode(a);
  const B = new TextEncoder().encode(b);
  if (A.length !== B.length) return false;
  let diff = 0;
  for (let i = 0; i < A.length; i++) diff |= A[i] ^ B[i];
  return diff === 0;
}

/** RFC 4648 base64url, unpadded — the same encoding scripts/key-rotate.mjs uses. */
function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateKey(): string {
  const out = new Uint8Array(KEY_BYTES);
  crypto.getRandomValues(out);
  return bytesToBase64Url(out);
}

/**
 * Gate for the POST endpoints. Returns a Response to short-circuit on
 * failure, or null when the caller is authenticated.
 */
function authGate(request: Request, env: Env): Response | null {
  const provided = request.headers.get('X-Rotator-Token') ?? '';
  const expected = env.ROTATOR_SHARED_SECRET ?? '';

  if (expected === '') {
    return jsonResponse(
      {
        ok: false,
        error: 'rotator not provisioned',
        detail:
          'The ROTATOR_SHARED_SECRET secret is not set on this Worker. ' +
          'The owner must run:  wrangler secret put ROTATOR_SHARED_SECRET ' +
          '--name p31-key-rotator  (from a machine with the OAuth session).',
      },
      503
    );
  }

  if (provided === '' || !constantTimeEqual(provided, expected)) {
    return textResponse('Unauthorized', 401);
  }

  return null;
}

function rotationInstructions(key: string): Record<string, unknown> {
  return {
    ok: true,
    action: 'operator',
    generated_key: key,
    window_hours: 24,
    dual_credential_policy: [
      'For 24h after the put, the gateway/consumer accepts BOTH the old',
      'and the new value (dual-credential transition window).',
      'After the window, the old value is dropped and rejected.',
    ],
    cli_command: [
      'node scripts/key-rotate.mjs rotate <SECRET_NAME>',
      '  --worker <WORKER_NAME> --value <generated_key> --yes',
      '  [--health <HEALTH_URL>]',
    ].join(' \\\n    '),
    rollback:
      'Re-put the previous value:  node scripts/key-rotate.mjs rotate ' +
      '<SECRET_NAME> --worker <WORKER_NAME> --value <OLD_VALUE> --yes. ' +
      'The old value lives in the owner vault (Cloudflare never returns ' +
      'secret values; scripts/key-rotate.mjs backs up the listing and a ' +
      'sha256 fingerprint, not the value itself).',
    honest_boundary:
      '`wrangler secret put` must run from a machine with the owner OAuth ' +
      'session (~/.wrangler/config/default.toml). This Worker never calls ' +
      'it and cannot. See docs/enterprise/operations/' +
      'secret-rotation-runbook.md.',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (url.pathname === '/health') {
      if (method !== 'GET') return textResponse('Method not allowed', 405);
      return jsonResponse(
        {
          ok: true,
          service: 'p31-key-rotator',
          ts: Date.now(),
          secret_provisioned: (env.ROTATOR_SHARED_SECRET ?? '') !== '',
        },
        200
      );
    }

    if (url.pathname === '/genkey' || url.pathname === '/rotate') {
      if (method !== 'POST') return textResponse('Method not allowed', 405);
      const denied = authGate(request, env);
      if (denied) return denied;
      if (url.pathname === '/genkey') {
        return jsonResponse({ ok: true, key: generateKey() }, 200);
      }
      return jsonResponse(rotationInstructions(generateKey()), 200);
    }

    if (url.pathname === '/') {
      if (method !== 'GET') return textResponse('Method not allowed', 405);
      return textResponse(ROOT_TEXT, 200);
    }

    return textResponse('Not found', 404);
  },
};