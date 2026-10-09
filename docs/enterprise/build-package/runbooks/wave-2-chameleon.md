<!-- P31-HEADER
id: p31_wave_2_chameleon_20261005_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-05T00:00:00Z
owner: will
-->

# Wave 2 — The Chameleon Shell (Convergence Chat)

## Scope note (the honest line)

This wave is **binding-only**. It wires the P31 backend into a chat surface:
the `env.AI` turn endpoint, the bus ledger as the source of truth, a stable
ledger id on every message, and a presentation selector. It does **not** author
the `Thread`/`Composer`/`ToolBlock` primitives or token-level virtual scrolling —
those are **Wave 3**, because mixing authoring and integration would make a red
gate ambiguous (which half failed?).

Three findings from inspection are folded into this runbook as explicit nodes:

1. **The transport already exists** — `/api/bus/stream` (SSE with `id:` framing,
   `Last-Event-ID`, `request.signal`) and `/api/bus/events?since=`. No new
   transport node. The gap is the *model* endpoint, which is missing for chat.
2. **The seam drops the ledger id** — `rowToEvent` (`_lib/ledger.ts:135`) strips
   the row id, so clients cannot key messages stably. Wave 3's virtualized
   thread needs it; this wave closes it.
3. **`message.content` has no `role`** — user vs assistant cannot round-trip.
   One additive field fixes it.

## The DAG

```yaml
version: "1.0"
name: wave-2-chameleon
inputs:
  - name: scope_lock
    required: true
    description: "functions/api/chat/**, functions/_lib/ledger.ts, src/bus/events.ts, src/shell/chat/**, src/faces/chat/**, src/App.tsx, scripts/gate.mjs"
  - name: role
    required: false
    default: operator

nodes:
  # ── Phase 1 — Read (deterministic) ─────────────────────────────────────
  - id: read-master
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/00-MASTER.md]

  - id: read-spec
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/surfaces/chat.md]
    depends: [read-master]

  - id: read-forge-stream
    type: deterministic
    command: cat
    args: [portals/shell/functions/api/forge/stream.ts]
    depends: [read-spec]

  - id: read-ledger
    type: deterministic
    command: cat
    args: [portals/shell/functions/_lib/ledger.ts]
    depends: [read-spec]

  - id: read-bus
    type: deterministic
    command: cat
    args: [portals/shell/src/bus/client.ts]
    depends: [read-spec]

  - id: read-events
    type: deterministic
    command: cat
    args: [portals/shell/src/bus/events.ts]
    depends: [read-spec]

  - id: read-chatshell
    type: deterministic
    command: cat
    args: [portals/shell/node_modules/@p31ca/design-core/src/compositions/ChatShell.tsx]
    depends: [read-spec]

  - id: read-authz-flags-store
    type: deterministic
    command: cat
    args: [portals/shell/src/shell/authz.ts, portals/shell/src/shell/flags.ts, portals/shell/src/shell/store.ts]
    depends: [read-spec]

  # ── Phase 2 — Build (agentic) ─────────────────────────────────────────
  - id: build-chameleon
    type: agentic
    prompt: |
      Read the spec at docs/enterprise/build-package/surfaces/chat.md.
      Bind the P31 backend into the chat surface exactly as described:
      1. Fix the seam: rowToEvent stamps `id: String(row.id)`; MessageContent gains `role`.
      2. Create functions/api/chat/stream.ts (env.AI.run multi-turn, emits message.* + model.usage).
      3. Create src/shell/chat/threadStore.ts (messages keyed by ledger id, cursor derived from ledger).
      4. Create src/shell/chat/streamClient.ts (SSE subscribe + AbortController).
      5. Create src/shell/chat/useChatPresentation.ts (role/spoons/theme selector).
      6. Create src/faces/chat/ChatFace.tsx (compose canon ChatShell + Workbench; gate send on can(role,'create')).
      7. Register chat in src/App.tsx.
      Only touch the files in the scope lock. Do NOT author Thread/Composer/ToolBlock (Wave 3).
    depends: [read-forge-stream, read-ledger, read-bus, read-events, read-chatshell, read-authz-flags-store]

  # ── Phase 3 — Gate (deterministic) ────────────────────────────────────
  - id: gate-surface
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --surface, chat]
    depends: [build-chameleon]

  - id: gate-build
    type: deterministic
    command: npm
    args: [run, build]
    cwd: portals/shell
    depends: [build-chameleon]

  - id: gate-typecheck
    type: deterministic
    command: npm
    args: [run, typecheck]
    cwd: portals/shell
    depends: [build-chameleon]

  # ── Phase 4 — Approval (human) ────────────────────────────────────────
  - id: review
    type: approval
    prompt: "Chat binding built, gated, and typed. Deploy to production?"
    depends: [gate-surface, gate-build, gate-typecheck]

  # ── Phase 5 — Deploy (deterministic) ──────────────────────────────────
  - id: deploy
    type: deterministic
    command: npm
    args: [run, deploy]
    cwd: portals/shell
    depends: [review]

  - id: verify-live
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --surface, chat, --live]
    depends: [deploy]

edges:
  - from: read-master
    to: read-spec
    contract: { requires: [package-exists], ensures: [spec-read] }
  - from: read-spec
    to: read-forge-stream
    contract: { requires: [spec-read], ensures: [pattern-read] }
  - from: build-chameleon
    to: gate-surface
    contract: { requires: [chameleon-built], ensures: [surface-gate-green] }
  - from: build-chameleon
    to: gate-build
    contract: { requires: [chameleon-built], ensures: [build-green] }
  - from: build-chameleon
    to: gate-typecheck
    contract: { requires: [chameleon-built], ensures: [types-green] }
  - from: gate-surface
    to: review
    contract: { requires: [surface-gate-green], ensures: [human-approval] }
  - from: review
    to: deploy
    contract: { requires: [human-approval], ensures: [deployed] }
  - from: deploy
    to: verify-live
    contract: { requires: [deployed], ensures: [live-verified] }

error_handlers:
  - on: gate-surface-failed
    action: abort
    message: "Chat binding gate red. File a fix-plan and refine the spec."
  - on: gate-build-failed
    action: abort
    message: "Build red. The emitted bundle is broken."
  - on: gate-typecheck-failed
    action: abort
    message: "Typecheck red. A type contract was violated."
  - on: live-verify-failed
    action: rollback
    message: "Live verification failed. Roll back to the prior deployment."
```

## The nodes in prose

**Phase 1 — Read.** The agent reads the master, the chat spec, the proven forge
stream (the `env.AI` + write-queue pattern to mirror), the ledger, the bus client
and event contract, the canon `ChatShell`, and the authz/flags/store trio (the
state the presentation selector derives from).

**Phase 2 — Build.** One agentic node. Six deliverables inside the scope lock,
plus the two seam fixes. The prompt names every file and explicitly excludes the
Wave 3 primitives.

**Phase 3 — Gate.** Three deterministic nodes: the surface gate, the build, the typecheck.

**Phase 4 — Approval.** The human reviews the artifact.

**Phase 5 — Deploy + verify.** Deploy, then gate the live URL.

## The gate

```bash
node scripts/gate.mjs --surface chat
```

Assertions (all grounded in what inspection proved must exist):

| # | Assertion | Proves |
|---|---|---|
| 1 | `ChatFace.tsx` exists | The face is present |
| 2 | `functions/api/chat/stream.ts` emits `message.*` + `model.usage` | The backend binding |
| 3 | `rowToEvent` stamps `String(row.id)` | Stable ledger keys |
| 4 | `MessageContent` carries `role` | User/assistant round-trips |
| 5 | thread store keys by ledger id, never index | Prepend-stable for Wave 3 |
| 6 | cursor derived from ledger, not localStorage | No second source of truth |
| 7 | composer gates on `can(role,'create')` | Role gate without a surface floor |
| 8 | face composes canon `ChatShell` | No hand-rolled drawer |
| 9 | `AbortController` present in the stream client | Real abort |
| 10 | `chat` is absent from `SURFACE_ROLE_FLOOR` | Surface stays open (read for viewers) |
| 11 | typecheck passes | No type contract violated |
| 12 | build passes | The bundle builds |

Assertions 11–12 are skipped under `--quick`.

## The evidence

Capture after the wave:

- `git diff --stat` — the files touched
- `node scripts/gate.mjs --surface chat` — the gate output
- The deployed chat mid-turn (screenshot)
- `curl` proving `message.content` events persist to the ledger
- The reload test: send → reload → confirm the thread rehydrates + resumes

## The negative control

```bash
# Plant: restore the id drop (assertion 3 fails)
sed -i 's/id: String(row.id), //' portals/shell/functions/_lib/ledger.ts
node scripts/gate.mjs --surface chat --quick   # MUST exit 1
git checkout portals/shell/functions/_lib/ledger.ts

# Plant: add a role floor to chat (assertion 10 fails)
sed -i "s/  studio: 'operator',/  studio: 'operator',\n  chat: 'operator',/" portals/shell/src/shell/surface-registry.ts
node scripts/gate.mjs --surface chat --quick   # MUST exit 1
git checkout portals/shell/src/shell/surface-registry.ts
```