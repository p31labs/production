<!-- P31-HEADER
id: p31_wave_3_thread_20261005_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-05T00:00:00Z
owner: will
-->

# Wave 3 — The Thread Primitives (Convergence, part 2)

## Scope note (the honest line)

Wave 2 bound the backend. Wave 3 builds the interface. Three things land:

1. **The virtualized, end-anchored thread** — 1,000+ messages, prepend-stable,
   streaming-pinned (`@tanstack/react-virtual` `anchorTo: 'end'`).
2. **Incremental streaming markdown** — `stream-md`'s `StreamMD` (block-level
   parsing, memoized closed blocks, no per-token full re-render).
3. **The composer primitive** — input, send, abort, empty/error states.

Three defects found in review are fixed as explicit nodes, not left implicit:
the session-scoped subscription, the optimistic user message, and the
non-reactive presentation selector.

**Explicitly not in this wave:** tool blocks, approval gates, token-level model
streaming, the threads sidebar, the artifact panel. Tool rendering requires a
tool-calling backend (`env.AI.run` with a `tools` array) that does not exist.
That is Wave 4.

## The DAG

```yaml
version: "1.0"
name: wave-3-thread
inputs:
  - name: scope_lock
    required: true
    description: "src/shell/chat/**, src/faces/chat/**, src/index.css, scripts/gate.mjs"
  - name: role
    required: false
    default: operator

nodes:
  # ── Phase 1 — Read (deterministic) ─────────────────────────────────────
  - id: read-master
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/00-MASTER.md]

  - id: read-feature
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/features/chat-primitives.md]
    depends: [read-master]

  - id: read-chat-spec
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/surfaces/chat.md]
    depends: [read-feature]

  - id: read-thread-store
    type: deterministic
    command: cat
    args: [portals/shell/src/shell/chat/threadStore.ts]
    depends: [read-feature]

  - id: read-stream-client
    type: deterministic
    command: cat
    args: [portals/shell/src/shell/chat/streamClient.ts]
    depends: [read-feature]

  - id: read-chat-face
    type: deterministic
    command: cat
    args: [portals/shell/src/faces/chat/ChatFace.tsx]
    depends: [read-feature]

  # ── Phase 2 — Build (agentic) ─────────────────────────────────────────
  - id: install-deps
    type: deterministic
    command: npm
    args: [install, "@tanstack/react-virtual@latest", "stream-md"]
    cwd: portals/shell
    depends: [read-thread-store]

  - id: build-thread
    type: agentic
    prompt: |
      Read the feature contract at docs/enterprise/build-package/features/chat-primitives.md.
      Build the chat primitives exactly as described:
      1. Create src/shell/chat/useThreadVirtualizer.ts — anchorTo: 'end',
         followOnAppend: true, scrollEndThreshold: 80, getItemKey returning the
         ledger id, plus isAtEnd/getDistanceFromEnd/scrollToEnd passthroughs.
      2. Create src/shell/chat/Thread.tsx — normal-order scroll container,
         absolutely-positioned measured rows, role="log" aria-live="polite",
         a "jump to latest" affordance when !isAtEnd().
      3. Create src/shell/chat/StreamingMarkdown.tsx — wraps stream-md's StreamMD.
      4. Create src/shell/chat/Composer.tsx — textarea + send + abort; disabled
         when !canSend; abort cancels the in-flight POST and closes the stream.
      5. Fix streamClient.ts — session-scoped hydrate and subscription. No event
         from another session may reach the store.
      6. Fix threadStore.ts — session-filtered hydrate; a paginated loadOlder()
         that prepends; an apply() that sets the cursor from the ledger id.
      7. Fix ChatFace.tsx — call addUser() optimistically on send and reconcile
         on the ledger id; render Thread + Composer + StreamingMarkdown.
      8. Fix useChatPresentation.ts — subscribe to the shell store reactively
         instead of calling getState() during render.
      9. Add to src/index.css: `.chat-thread__scroll { overflow-anchor: none;
         overscroll-behavior: none; }` — exactly one writer of scrollTop.
      Only touch the files in the scope lock. Do NOT add tool blocks, approval
      gates, a threads sidebar, or an artifact panel.
    depends: [install-deps, read-chat-spec, read-stream-client, read-chat-face]

  # ── Phase 3 — Gate (deterministic) ────────────────────────────────────
  - id: gate-feature
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, chat-primitives]
    depends: [build-thread]

  - id: gate-surface
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --surface, chat]
    depends: [build-thread]

  - id: gate-build
    type: deterministic
    command: npm
    args: [run, build]
    cwd: portals/shell
    depends: [build-thread]

  - id: gate-typecheck
    type: deterministic
    command: npm
    args: [run, typecheck]
    cwd: portals/shell
    depends: [build-thread]

  # ── Phase 4 — Approval (human) ────────────────────────────────────────
  - id: review
    type: approval
    prompt: "Thread primitives built and gated. Deploy to production?"
    depends: [gate-feature, gate-surface, gate-build, gate-typecheck]

  # ── Phase 5 — Deploy (deterministic) ──────────────────────────────────
  - id: deploy
    type: deterministic
    command: npm
    args: [run, deploy]
    cwd: portals/shell
    depends: [review]

edges:
  - from: read-master
    to: read-feature
    contract: { requires: [package-exists], ensures: [contract-read] }
  - from: read-feature
    to: read-thread-store
    contract: { requires: [contract-read], ensures: [store-read] }
  - from: build-thread
    to: gate-feature
    contract: { requires: [primitives-built], ensures: [feature-gate-green] }
  - from: build-thread
    to: gate-surface
    contract: { requires: [primitives-built], ensures: [surface-gate-green] }
  - from: build-thread
    to: gate-build
    contract: { requires: [primitives-built], ensures: [build-green] }
  - from: build-thread
    to: gate-typecheck
    contract: { requires: [primitives-built], ensures: [types-green] }
  - from: gate-feature
    to: review
    contract: { requires: [feature-gate-green], ensures: [human-approval] }
  - from: review
    to: deploy
    contract: { requires: [human-approval], ensures: [deployed] }

error_handlers:
  - on: gate-feature-failed
    action: abort
    message: "Chat primitives gate red. The shared contract is broken — fix the primitive, not the face."
  - on: gate-surface-failed
    action: abort
    message: "Chat surface gate red. The face's composition of the primitive is wrong."
  - on: gate-build-failed
    action: abort
    message: "Build red. The emitted bundle is broken."
  - on: gate-typecheck-failed
    action: abort
    message: "Typecheck red. A type contract was violated."
```

## The nodes in prose

**Phase 1 — Read.** The agent reads the master, the feature contract (the shape it
must build to), the chat surface spec, and the three files it will modify.

**Phase 2 — Build.** One dependency install, then one agentic node with nine
numbered deliverables. Three of the nine are defect fixes from review — they are
in the prompt so the agent does not have to discover them.

**Phase 3 — Gate.** Four deterministic nodes. The feature gate and the surface
gate are separate because they fail differently: a red feature gate means the
primitive is broken; a red surface gate means the face composed it wrong.

**Phase 4–5 — Approval, deploy.** Unchanged shape.

## The gate

```bash
node scripts/gate.mjs --feature chat-primitives
```

| # | Assertion | Proves |
|---|---|---|
| 1 | `Thread.tsx` exists and exports `Thread` | The primitive is present |
| 2 | the virtualizer sets `anchorTo: 'end'` | End anchoring |
| 3 | `followOnAppend: true` and `scrollEndThreshold` present | Follow-only-when-pinned |
| 4 | `getItemKey` returns a ledger id, never an index | Prepend stability |
| 5 | `overflow-anchor: none` on `.chat-thread__scroll` | Single scroll owner |
| 6 | `overscroll-behavior: none` on `.chat-thread__scroll` | Safari bounce mitigation |
| 7 | `StreamingMarkdown` uses `stream-md`'s `StreamMD` | Incremental rendering |
| 8 | `streamClient` filters by sessionId | No cross-thread bleed |
| 9 | `ChatFace` calls `addUser` before the POST | Optimistic user message |
| 10 | `useChatPresentation` subscribes, never `getState()` in render | Reactive presentation |
| 11 | the scroller carries `role="log"` | Accessibility |
| 12 | typecheck passes | No type contract violated |
| 13 | build passes | The bundle builds |

Assertions 12–13 are skipped under `--quick`.

## The evidence

- `git diff --stat` — the files touched
- `node scripts/gate.mjs --feature chat-primitives` — the gate output
- The scroll-position test: load 200 messages, scroll to the middle, prepend 50,
  screenshot before/after with the visible row marked — the row must not move
- The streaming test: send a message, screenshot at 200ms / 1s / 3s — the bottom
  must stay pinned throughout
- The `overflow-anchor` computed-style check in DevTools

## The negative control

```bash
# Plant: index keys (assertion 4 fails)
sed -i 's/getItemKey: (index) => messages\[index\]!.id/getItemKey: (index) => String(index)/' \
  portals/shell/src/shell/chat/useThreadVirtualizer.ts
node scripts/gate.mjs --feature chat-primitives --quick   # MUST exit 1
git checkout portals/shell/src/shell/chat/useThreadVirtualizer.ts

# Plant: remove the single-owner rule (assertion 5 fails)
sed -i '/overflow-anchor: none/d' portals/shell/src/index.css
node scripts/gate.mjs --feature chat-primitives --quick   # MUST exit 1
git checkout portals/shell/src/index.css

# Plant: drop the session filter (assertion 8 fails)
sed -i 's/ev.sessionId === sessionId/true/' portals/shell/src/shell/chat/streamClient.ts
node scripts/gate.mjs --feature chat-primitives --quick   # MUST exit 1
git checkout portals/shell/src/shell/chat/streamClient.ts
```

The three plants each target a different failure class — a key bug, a CSS bug, a
scope bug — and the last two cannot be caught by typecheck or unit tests. That
is the argument for the gate existing at all.