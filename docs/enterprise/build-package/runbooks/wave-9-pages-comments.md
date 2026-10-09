<!-- P31-HEADER
id: p31_wave_9_pages_comments_20261006_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Wave 9 — Pages/Spaces + Comments/Notifications/BYOK

## Scope (intended changes)

**9a — Pages and Spaces.**
- New: `migrations/0003_pages.sql`; `functions/api/pages/index.ts`;
  `functions/api/pages/[id]/index.ts`; `functions/api/pages/[id]/room.ts`;
  `portals/shell/room/src/PageRoom.ts`; `src/shell/pages/{pageStore.ts,
  usePageRoom.ts, SuggestionBlock.tsx, PageEditor.tsx, PageTree.tsx}`;
  `src/faces/docs/DocsFace.tsx`.
- Modified: `portals/shell/room/wrangler.toml` (export `PageRoom` beside
  `SessionRoom`); root `wrangler.toml` (`PAGE_ROOM` binding →
  room Worker); `src/faces/docs/DocsFace.tsx`; `src/bus/events.ts`
  (`page.created`, `page.deleted`, `page.restored`, `suggestion.created`,
  `suggestion.resolved`).

**9b — Comments/Notifications + BYOK.**
- New: `src/shell/pages/{commentStore.ts, CommentThread.tsx,
  useCommentAnchor.ts}`; `src/shell/notifications/{notificationStore.ts,
  NotificationInbox.tsx, useReadOnViewport.ts}`; `functions/_lib/credentials.ts`;
  `functions/api/credentials/index.ts`; `migrations/0004_credentials.sql`.
- Modified: `functions/api/chat/stream.ts` (per-call `resolveKey` — the turn
  resolves the key from `credentials.ts` just before the model call);
  `src/bus/events.ts` (`comment.created`, `comment.resolved`,
  `comment.reopened`, `credential.connected`, `credential.disconnected`).

**Specs and gates.**
- New: `features/pages.md`, `features/comments-notifications.md`,
  `features/byok.md`, this runbook.
- Modified: `scripts/gate.mjs` — add `pages` (6), `comments-notifications` (5),
  `byok` (5) FEATURES entries using `shellSrcIf`.

## Scope_lock (do **not** touch)

- `functions/durable-objects/**` — **does not exist**; the PageRoom lives in
  `portals/shell/room/` (Pages cannot host a DO class — the Wave 8 topology).
- `features/agent-presence.md` — **verify only.** There is no `useStreamingPhase`
  reference anywhere in the build package; the on-disk spec already maps
  `phase.started('action') → thinking` and `phase.started('response') →
  streaming`. Do not create a nonexistent hook.
- `functions/_lib/ledger.{ts,test.ts}`, `worker-types.d.ts`, `0001_*`, `0002_*`.
- Any file outside `docs/enterprise/build-package/`, `scripts/`,
  `portals/shell/**`, and the two `wrangler.toml` files.
- Everything in `portals/shell/**` is **untracked**: never `git checkout` a
  shell file. Backup with `cp` to `/tmp/opencode/nc/*.bak` before a negative
  control; restore with `cp`.

## The background (this wave's honest unshakeable premises)

Wave 8 was **specified and gated, not built.** `portals/shell/room/` does not
exist; `collaboration` sits at 1/10 and `agent-presence` at 0/4 — both fail the
way gates are supposed to fail, cleanly, per-assertion. Two Wave 7 corrections
were live-proven by negative controls and restored green; `load-older` holds at
10/10. The `00-MASTER.md` negative-control strengthen (Wave 8 correction #8,
~line 342) is still owed with Wave 8's Phase 2.

That is exactly why this wave **starts with a precondition**, not an assumption:
9b's turn modification (`stream.ts` resolving a key per call) and 9a's `PageRoom`
both require Wave 8's `SessionRoom`/room transport to exist. If the room is
absent, the correct thing is to stop, not to approximate.

Page authorship carries the trust gap from `collaboration.md`, **decided** here:
`author_did` is the client-asserted identity claim — honestly unverified —
and Wave 9b's credentials give a *possession-based* identity for key resolution,
not publication-grade authorship proof. The gap is named, not papered.

Read receipts are **derived per-did watermarks, never ledger events.** The
research was decisive: a 256-member read receipt flood is a denial of service on
the auditor's ledger, and reading something is not an accountable change to
shared state. Reading is a convenience view; the durable facts are the comment
lifecycle events.

Hocuspocus is Node-only and is **not used** — page sync is the DO-room
transport from Wave 8, matching the meetingwords topology.

## Overview

```
gate-room-precondition ──▶ fix-corrections ──▶ build-pages ──▶ gate-pages ──▶ gate-pages-behavioural ──┐
       (abort if 1/10)         (agentic)         (9a)                                                     ├─▶ regression (collab, presence, streaming,
                                                                                                          │            behavioural, build, typecheck)
                          └─▶ build-comments-byok ──▶ gate-comments ──┬─▶ gate-comments-behavioural ────┘
                                     (9b)             gate-byok ──────┘
                                                                                                            └─▶ review-approval ──▶ deploy
```

9a is parallel-safe to 9b only after `gate-room-precondition` passes: 9a's
`PageRoom` and 9b's `resolveKey` both sit on the room transport.

## The workflow

### Phase 1 — reading
- **read-master** — read `00-MASTER.md`.
- **read-pages** — read `features/pages.md`.
- **read-comments** — read `features/comments-notifications.md`.
- **read-byok** — read `features/byok.md`.
- **read-room** — read `runbooks/wave-8-multiplayer.md`, `features/collaboration.md`,
  `features/agent-presence.md`.
- **read-events** — read `portals/shell/src/bus/events.ts`, the last two shell
  migration files.

### Phase 2 — deterministic correct
- **gate-room-precondition** (deterministic) — `node scripts/gate.mjs --feature
  collaboration`. **Non-zero → ABORT.** "Wave 9 is blocked: Wave 8's room is
  not built. This wave extends the room transport; it does not approximate it."
  The wave cannot legitimately start until `collaboration` passes.
- **fix-corrections** (agentic) — apply the five corrections:
  1. `useStreamingPhase` correction from the draft is **stale** — revert to a
     verification note (see scope_lock).
  2. `PageRoom` lives at `portals/shell/room/src/PageRoom.ts`, not
     `functions/durable-objects/PageRoom.ts`.
  3. byok's per-call key lives in `functions/_lib/credentials.ts`
     (`resolveKey(did, provider)`), called from the turn; values ship from
     `scripts/gate.mjs`.
  4. read state is derived per-did, viewport-driven (`IntersectionObserver`),
     never a ledger row.
  5. `author_did` stays asserted; the gap is recorded in `features/pages.md`.

### Phase 3 — build
- **build-pages** (agentic, 9a). **build-comments-byok** (agentic, 9b) — each
  step mirrors the Wave 8 builder; every file's content is PATTERN-MATCHED to
  its spec row before capture.

### Phase 4 — gate (explicit tests, not a checklist)
- **gate-pages** (deterministic) — structural assertions.
- **gate-pages-behavioural** (deterministic) — `npx playwright test
  tests/e2e/pages.spec.ts` (two-browser, kill vite for evidence).
- **gate-comments**, **gate-byok** (deterministic) — structural assertions.
- **gate-comments-behavioural** (deterministic) — `npx playwright test
  tests/e2e/comments.spec.ts`.

### Phase 5 — regression
- **regression-collaboration**, **regression-agent-presence**,
  **regression-streaming-protocol** — run their gates; all must hold.
- **regression-behavioural** — full `tests/e2e/`.
- **build** — `npm run build`.
- **typecheck** — the portal's published typecheck.

### Phase 6 — review-approval, Phase 7 — deploy
- **review-approval** (agentic) — the runbook author attests: Wave 8 room
  exists, all gates green, controls captured. **deploy** —
  `wrangler pages deploy dist --project-name p31-portal-shell
  --commit-dirty=true` with `deploy:room` chained.

## The gates and node types

| Gate | Node | Type | Fail action |
|---|---|---|---|
| `--feature collaboration` | gate-room-precondition | deterministic | ABORT the wave |
| `--feature pages` | gate-pages | deterministic | revisit build-pages |
| `--feature comments-notifications` | gate-comments | deterministic | revisit build-comments-byok |
| `--feature byok` | gate-byok | deterministic | revisit build-comments-byok |
| pages behavioural | gate-pages-behavioural | deterministic | deeper trace → error handler |
| comments behavioural | gate-comments-behavioural | deterministic | deeper trace → error handler |
| full regression | regression-* | deterministic | abort to the failing phase |
| review | review-approval | agentic | hold deploy |

## Negative controls (plant ONE, prove it fails, restore)

1. **suggestion gate** — in `functions/api/pages/[id]/suggestions.ts`,
   `s/if (accepted)/if (true)/`; `grep -n 'if (true)'` proves the plant; `gate
   pages` must fail its agent-writes assertion; `cp` restore; gate green again.
2. **key leakage** — in `functions/api/credentials/index.ts` GET,
   `s/fingerprint: /ciphertext: row.ciphertext, fingerprint: /`; `grep -n
   'ciphertext: row.ciphertext'` proves the plant; `gate byok` must fail its
   metadata assertion; `cp` restore. Then independently `grep -r 'sk-' dist/`
   must be empty.
3. **anchor drift** — in `src/shell/pages/useCommentAnchor.ts`,
   `s/Y.createRelativePositionFromTypeIndex/Y.createAbsolutePositionFromTypeIndex/`;
   `grep -n` proves the plant; the comments behavioural spec (anchor stays on
   its range through an edit) must fail; `cp` restore.

## Traces — ABORT handlers

Every `ABORT_*` handler returns the full message triage before exiting non-zero.
The precondition handler is the one this wave is most likely to hit; it must
return "Wave 8 is unbuilt" prominently, since that is the correct, intended
outcome today.

## Decision log

| Decision | Basis | Recorded in |
|---|---|---|
| One Yjs doc per page (PageRoom per page id) | meetingwords hibernation; eviction isolation | pages.md rule 1 |
| create-page-from-message copies text out of the session doc | the session doc stays the session's | pages.md rule 1 |
| Server is the only privileged writer; suggestions are gated tool results | Wave 4 `isConsequential`/ApprovalGate, zero new approval machinery | pages.md rule 3 |
| `author_did` asserted; gap named, not papered | collaboration.md trust gap | pages.md decisions |
| Read state derived per-did, viewport-driven; never a ledger event | 256-member read-flood research | comments-notifications.md rule 4 |
| Notifications dedup by target (3→1 with count) | same flood reasoning | comments-notifications.md rule 3 |
| BYOK AES-256-GCM at rest + per-call resolveKey; raw key never returned/logged | ALLM rule | byok.md |
| Hocuspocus not used; DO-room transport instead | Node-only restriction | pages.md |
| Activity feed deferred (view + allowlist over the ledger) | not a Wave 9 deliverable | pages.md boundary |