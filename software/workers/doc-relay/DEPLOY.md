# p31-doc-relay — Deployment runbook

PQC-authenticated y-websocket relay for phos Docs / Sheets (Durable Object per
room). Remote sync is **opt-in**: nothing leaves the device until you set the
client flag and rebuild.

## 1. Prerequisites

- Cloudflare account with Workers + Durable Objects (free plan includes a
  small DO daily quota).
- `wrangler` authenticated: `npx wrangler whoami`.
- The monorepo root install is current: `pnpm install` (already done — this
  package is a workspace member `software/workers/doc-relay`).

## 2. Deploy the relay

```bash
cd /home/p31/production/software/workers/doc-relay
npx wrangler deploy --dry-run   # sanity check (no auth needed)
npx wrangler deploy             # creates p31-doc-relay + DocRelayDO
```

The DO is **SQLite-backed** (`new_sqlite_classes` migration — KV-backed DO
namespaces are no longer supported on the P31 account). Room state persists via
a `meta` table (`ctx.storage.sql`), so the relay answers a fresh client's
syncStep1 with the full room state even after hibernation.

Verify: `curl https://p31-doc-relay.trimtab-signal.workers.dev` → "p31-doc-relay".

**Status:** deployed 2026-09-22 at
`https://p31-doc-relay.trimtab-signal.workers.dev`.

Optionally pin a custom hostname instead of `*.workers.dev`, and set
`CORS_ALLOW_ORIGIN` to the phos origin(s) (already defaults to
`https://phos.p31ca.org` in `wrangler.toml`).

## 3. Enable cross-device sync on the client

Add to `production/portals/qpj/.env.production` (Vite build-time):

```bash
VITE_DOCS_WS_URL=https://p31-doc-relay.trimtab-signal.workers.dev
```

Then rebuild + deploy QPJ:

```bash
cd /home/p31/production/portals/qpj
pnpm build
node /home/p31/production/portals/deploy-unified.mjs qpj
```

## 4. Auth model (why it's safe to flip)

- Every doc/sheet room mints a short-lived (15 min) **self-contained PQC
  capability token** — composite Ed25519 + ML-DSA-65 signature over
  `header.payload`, embedding its public keys (`pk`) and scoped to
  `aud=p31-doc-relay`, the exact `room`, and `caps=[read,write,awareness]`.
- The DO verifies the token (signature + expiry + aud/room/caps, optional
  `kid` rotation check) **before accepting the WebSocket upgrade** and before
  processing a `DELETE` purge. No valid token → `403`, no handshake.
- Room IDs are unguessable (`doc_<uuid>` / `sheet_<uuid>`), so the room name
  is a capability on top of the token.
- `DELETE /<room>` purges the DO's retained state (no silent server-side
  retention after a user delete).

## 5. Rollback

- Remove `VITE_DOCS_WS_URL` from `production/portals/qpj/.env.production`, rebuild +
  redeploy QPJ → remote sync off (BroadcastChannel + local PGlite still work).
- Delete the worker: `npx wrangler delete p31-doc-relay`.