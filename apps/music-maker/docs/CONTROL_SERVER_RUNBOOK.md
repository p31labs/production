# Control Server — Deploy & Operate Runbook

Companion to `CONTROL_SERVER_BUILD_PROMPT.md`. Covers the deploy, the schema
apply, the post-flight smoke, the E2E, and the failure playbook.

> **The enterprise runbook suite lives at [`docs/runbooks/`](runbooks/README.md)**
> — the index routes each alert to a one-failure-mode runbook, plus the SLO
> policy, the on-call/AI-first-responder policy, the postmortem template, the
> PRR checklist, and the emergency playbooks. This file is the operational
> quick-reference for the deploy path.

## Prerequisites

- Wrangler authenticated against the P31 account (`wrangler whoami`).
- The D1 database `music-maker` exists and is bound in `worker/wrangler.toml`
  (`MUSIC_D1`, `database_id` a real UUID).
- The `CONTROL_ROOM` DO binding + `[exports.ControlRoom]` are present (the
  Phase 2 dry-run verified both bindings).

## Deploy

```bash
cd apps/music-maker
pnpm typecheck && pnpm test && pnpm build
cd worker && npx wrangler deploy
```

Expected output: two DO bindings (`MusicRoom`, `ControlRoom`), one D1 binding
(`music-maker`), assets. If `ControlRoom` is missing from the binding list, the
`[exports.ControlRoom]` block is absent — the deploy fails with "depends on the
following Durable Objects, which are not exported". Export the class from
`worker/index.ts`.

## Schema apply (Pilot step — remote)

The `mappings` and `patches` projection tables are NOT created by the deploy.
Apply once, and again after any `schema.sql` change:

```bash
cd apps/music-maker/worker
npx wrangler d1 execute music-maker --remote --file=./schema.sql
```

Verify:

```bash
npx wrangler d1 execute music-maker --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table'"
# expect: events, mappings, patches
```

## Post-flight smoke

```bash
cd apps/music-maker
node scripts/smoke-control-room.mjs \
  wss://music-presence.trimtab-signal.workers.dev
```

The smoke asserts, in order: connect snapshot, committed mapping ack (to
sender) + broadcast (to peer), ephemeral routing, backpressure drops under a
60Hz+ burst, a 30s idle then a move that still fans out (the hibernation wake),
and a fresh client whose snapshot carries the committed mapping. It also prints
`hydrationMode` — `'checkpoint'` on a wake (the fast path), `'cold-start'` only
on a genuine first run.

If the smoke fails on step 5 (the wake), the checkpoint write is not completing
before the broadcast. Check the DO logs for `ev: ws_committed` ordering against
`ev: ws_frame_oversize` and any `learn_resolve_failed`.

## E2E (Playwright, deployed URL)

```bash
cd apps/music-maker
MM_URL=https://music-presence.trimtab-signal.workers.dev npx playwright test e2e
```

The E2E requires the `__controlRoom` test hook, which is exposed only in
`--mode=test` builds. Build with the test mode before running:

```bash
vite build --mode test   # the hook is gated on import.meta.env.MODE === 'test'
```

The spec (see `e2e/control-surface.spec.ts`) asserts: three columns render +
connection settles open, a knob is an ARIA slider with the full keyboard
contract, a committed mapping survives a reload (the DO fold), an unsupported
MIDI browser hides the panel honestly, the surface renders at spoons=0, and
reduced motion zeroes the transitions.

It does NOT claim the audio graph changed — that needs a browser-mode
AudioContext probe, which is a separate suite.

## Failure playbook

| Symptom | Likely cause | Action |
|---|---|---|
| 404 on `/control/ui` | top-level worker not routing `/control/*` | confirm the `url.pathname.startsWith('/control/')` branch in `worker/index.ts` |
| WS connects, no snapshot | DO threw in `ensureHydrated` | check DO logs; a D1 read failure surfaces as an unhandled rejection |
| Commits never ack | `requestId` not echoed, or the DO rejected silently | inspect `control-ack` frames in the browser devtools WS panel |
| Mappings vanish after reload | projection tables missing, or the fold is not hydrating | re-run the schema apply; verify `control:fold` in DO storage |
| `BACKPRESSURE` shown immediately | token bucket exhausted by a stuck client | the bucket refills at 60/s; a stuck client is sending faster than that |
| Learn arms but never binds | no CC is reaching the DO, or the arm was disarmed | confirm the surface forwards CCs (`room.sendMove(source, value, cc)`) and that `learn-disarm` isn't firing on every gesture end |

## Local dev

```bash
cd apps/music-maker && pnpm dev        # vite on :5173
cd worker && npx wrangler dev          # worker on :8787
```

The vite dev server proxies `/control/*` and `/api/music/*` to the worker (see
`vite.config.ts`). The DO runs locally; seed the D1 emulator with:

```bash
cd apps/music-maker/worker
npx wrangler d1 execute music-maker --local --file=./schema.sql
```

## Rolling back

The deploy is atomic — `wrangler rollback` reverts to the previous version.
The D1 schema is NOT rolled back: a `mappings`/`patches` table added by a
newer version is harmless to an older worker, but dropping it is a manual step
if the rollback is permanent.