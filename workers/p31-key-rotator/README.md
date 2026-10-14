# p31-key-rotator — key creator / rotation assistant

Zero-dependency Cloudflare Worker (no package.json, no lockfile, no
node_modules). Wrangler bundles `src/index.ts` directly, same pattern as
`workers/p31-rum`.

## Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness: service name, timestamp, `secret_provisioned` (never the value). |
| `/genkey` | POST | One fresh 32-byte base64url key. Requires `X-Rotator-Token`. |
| `/rotate` | POST | A fresh key + dual-credential rotation instructions for the operator. Requires `X-Rotator-Token`. |
| `/` | GET | Plain-language description + the honest boundary. |

## The honest boundary (non-negotiable)

This Worker **cannot and never calls** `wrangler secret put`. That command
requires the owner OAuth session stored on a real machine
(`~/.wrangler/config/default.toml`); a Worker has no access to it. The
Worker's job is key generation + operator instructions. The actual rotation
runs via `scripts/key-rotate.mjs` on the owner's machine, owner-executed.
See `docs/enterprise/operations/secret-rotation-runbook.md`.

## Auth

`POST /genkey` and `POST /rotate` require the header
`X-Rotator-Token: <value>` matching the Worker secret
`ROTATOR_SHARED_SECRET` (owner-set; never hardcoded, never committed).
Comparison is constant-time. If the secret is unset, the endpoints return
503 with provisioning instructions. `GET /health` is unauthenticated and
reveals nothing.

```bash
# Owner sets the shared secret once (from a machine with the OAuth session):
wrangler secret put ROTATOR_SHARED_SECRET --name p31-key-rotator

# Operator asks for a key + instructions:
curl -s -X POST https://p31-key-rotator.trimtab-signal.workers.dev/rotate \
  -H "X-Rotator-Token: <value>"
```

## Key format

32 bytes of `crypto.getRandomValues` output, RFC 4648 base64url, unpadded
(43 characters) — byte-for-byte the same encoding `scripts/key-rotate.mjs`
uses, so keys generated here are directly usable as `--value` there.

## Deploy

```bash
wrangler deploy   # → https://p31-key-rotator.trimtab-signal.workers.dev
```

## Not an MCP worker

This Worker serves no MCP endpoints and is not registered in the MCP
registry; `mcp:health` probes are unaffected by it.

## Future path (documented, not wired)

Post-quantum signing keys (ML-DSA-65 + Ed25519 hybrid) can come from the
p31-crypto MCP server (`pqc_keygen`). That is a separate signing-key path;
this Worker's symmetric keygen is unchanged. Deliberately not wired yet —
see `docs/fix-plans/p31-key-rotator-2026-10-13.md`.