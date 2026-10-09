<!-- P31-HEADER
id: p31_wave_7_streaming_sharing_20261006_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Wave 7 — Streaming and Sharing (Convergence, part 6)

## Scope note (the honest line)

Waves 2–6 built a chat surface with real transport, interface, tools, history,
a thread list, and an artifact panel. Wave 7 makes the turn stream and the
artifact shareable. Five things land:

1. **The two-phase turn** — Phase 1 action-collection (non-streamed, JSON mode),
   Phase 2 final response (`stream: true`). The split Workers AI's JSON mode forces.
2. **Eager tool events** — each tool call closes as the next starts.
3. **Token batching** — the thread store flushes `message.content` appends once
   per animation frame.
4. **The Stop button** — always visible during streaming, interruptible in Phase 1.
5. **Artifact sharing** — an explicit share, a ledger event, a retention sweep,
   and a durable tier.

Plus three corrections carried from Wave 6's review:

6. **The detection effect runs per token.** Fix: detect on the newest assistant
   message only, not the concatenation.
7. **`ArtifactCard` was never written** (the review said "written but never
   mounted" — the truth is stronger: the file did not exist). Create it and wire
   it into the transcript.
8. **The gate false-positive helper.** `assertCode(src, pattern)` strips comments
   before matching. Every assertion that matches a bare identifier uses it.

**Explicitly not in this wave:** collaborative editing of a shared artifact,
artifact export formats beyond copy/download, and public (no-account) sharing.

## The DAG

```yaml
version: "1.0"
name: wave-7-streaming-sharing
inputs:
  - name: scope_lock
    required: true
    description: "functions/api/chat/**, functions/api/artifacts/**, src/shell/chat/**, src/faces/chat/**, src/bus/events.ts, tests/e2e/**, scripts/gate.mjs"
  - name: role
    required: false
    default: operator

nodes:
  - id: read-master
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/00-MASTER.md]
  - id: read-streaming
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/features/streaming-protocol.md]
    depends: [read-master]
  - id: read-sharing
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/features/artifact-sharing.md]
    depends: [read-master]
  - id: read-chat-stream
    type: deterministic
    command: cat
    args: [portals/shell/functions/api/chat/stream.ts]
    depends: [read-streaming]
  - id: read-thread-store
    type: deterministic
    command: cat
    args: [portals/shell/src/shell/chat/threadStore.ts]
    depends: [read-streaming]
  - id: read-chat-face
    type: deterministic
    command: cat
    args: [portals/shell/src/faces/chat/ChatFace.tsx]
    depends: [read-streaming, read-sharing]

  - id: fix-corrections
    type: agentic
    prompt: |
      Three Wave 6 corrections:
      1. Fix the detection effect in src/faces/chat/ChatFace.tsx — detect on the
         newest assistant message only, not the concatenation of all of them.
      2. Create src/shell/chat/ArtifactCard.tsx (it was never written) and wire
         it into the transcript above the assistant message that produced it.
      3. Add assertCode(src, pattern) to scripts/gate.mjs — strip // and /* */
         comments before matching — and use it in the sandbox and padding
         assertions.
    depends: [read-chat-face]

  - id: build
    type: agentic
    prompt: |
      Read features/streaming-protocol.md and features/artifact-sharing.md.
      Build exactly as described:
      1. Modify functions/api/chat/stream.ts — the two-phase turn. Phase 1: run
         the model with tools, non-streamed (JSON mode); emit phase.started(action),
         then for each tool call emit tool.call.started eagerly and, if not
         consequential, execute + tool.call.resolved before the next call.
         Phase 2: emit phase.started(response), run the model WITHOUT tools with
         stream: true, forward the chunks as message.content events.
      2. Modify src/shell/chat/threadStore.ts — batch message.content appends in
         a mutable ref flushed on requestAnimationFrame (one update per frame).
      3. Modify src/shell/chat/Composer.tsx — the Stop button is in the DOM for
         the whole turn, including Phase 1; abort cancels both phases.
      4. Modify src/shell/chat/ToolBlock.tsx — eager per-call transition.
      5. Modify src/bus/events.ts — add phase.started, artifact.shared,
         artifact.share.expired, artifact.persisted (additive).
      6. Create functions/api/artifacts/share.ts + sweep.ts — the explicit share
         and the retention sweep, each appending its ledger event.
      7. Create src/shell/chat/artifactShareClient.ts.
      8. Modify src/shell/chat/artifactStore.ts — the durable tier: hydrate from
         artifact.persisted.
      9. Create tests/e2e/streaming.spec.ts — the batching gate.
      Only touch the scope lock. Do NOT stream Phase 1 (JSON mode cannot).
    depends: [fix-corrections, read-chat-stream, read-thread-store]

  - id: gate-streaming
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, streaming-protocol]
    depends: [build]
  - id: gate-sharing
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, artifact-sharing]
    depends: [build]
  - id: gate-behavioural
    type: deterministic
    command: npx
    args: [playwright, test, tests/e2e/]
    cwd: portals/shell
    depends: [build]
  - id: gate-artifacts
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, artifacts]
    depends: [build]
  - id: gate-thread-list
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, thread-list]
    depends: [build]
  - id: gate-load-older
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, load-older]
    depends: [build]
  - id: gate-tools
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, tool-protocol]
    depends: [build]
  - id: gate-primitives
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, chat-primitives]
    depends: [build]
  - id: gate-surface
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --surface, chat]
    depends: [build]
  - id: gate-build
    type: deterministic
    command: npm
    args: [run, build]
    cwd: portals/shell
    depends: [build]
  - id: gate-typecheck
    type: deterministic
    command: npm
    args: [run, typecheck]
    cwd: portals/shell
    depends: [build]

  - id: review
    type: approval
    prompt: "Streaming and sharing built and gated. Deploy to production?"
    depends: [gate-streaming, gate-sharing, gate-behavioural, gate-artifacts, gate-thread-list, gate-load-older, gate-tools, gate-primitives, gate-surface, gate-build, gate-typecheck]

edges:
  - from: read-master
    to: read-streaming
    contract: { requires: [package-exists], ensures: [contract-read] }
  - from: fix-corrections
    to: build
    contract: { requires: [wave-6-fixed], ensures: [gate-clean] }
  - from: build
    to: gate-streaming
    contract: { requires: [streaming-built], ensures: [structural-green] }
  - from: build
    to: gate-behavioural
    contract: { requires: [streaming-built], ensures: [batched-and-interruptible] }
  - from: gate-behavioural
    to: review
    contract: { requires: [behavioural-green], ensures: [human-approval] }

error_handlers:
  - on: gate-streaming-failed
    action: abort
    message: "Streaming gate red. The two-phase split or the batching is broken."
  - on: gate-sharing-failed
    action: abort
    message: "Sharing gate red. The share is not audited, or the copy outlives its window."
  - on: gate-behavioural-failed
    action: abort
    message: "The token burst produced a render storm, or the Stop button is unreachable."
```

## The gate

```bash
node scripts/gate.mjs --feature streaming-protocol
node scripts/gate.mjs --feature artifact-sharing
npx playwright test tests/e2e/
```

Structural assertions: the two-phase split, `stream: true` in Phase 2, eager
tool events, `requestAnimationFrame` batching, always-visible Stop, per-message
detection (not concatenation), `assertCode` helper, share/expiry/persist ledger
events, explicit-share gate, read-only copy.

Behavioural assertions: a token burst produces at most one state update per
frame; the Stop button is in the DOM during Phase 1.

## The negative control

```bash
# Restore note: portals/shell/** is untracked — git checkout CANNOT revert it.
# Back up before planting, restore with cp after the gate. (fix-plan
# wave-7-runbook-restore-untracked)

mkdir -p /tmp/opencode/nc

# Plant: stream Phase 1 with tools (assertion fails — AiError 5023)
cp portals/shell/functions/api/chat/stream.ts /tmp/opencode/nc/stream.ts.bak
grep -n 'stream: true, tools: toolsForModel()' portals/shell/functions/api/chat/stream.ts   # MUST be empty before the plant
sed -i 's/stream: true/stream: true, tools: toolsForModel()/' portals/shell/functions/api/chat/stream.ts
grep -n 'tools: toolsForModel()' portals/shell/functions/api/chat/stream.ts   # MUST show the plant
node scripts/gate.mjs --feature streaming-protocol --quick   # MUST exit 1
cp /tmp/opencode/nc/stream.ts.bak portals/shell/functions/api/chat/stream.ts

# Plant: remove rAF batching (assertion fails)
cp portals/shell/src/shell/chat/threadStore.ts /tmp/opencode/nc/threadStore.ts.bak
grep -c 'queueMicrotask' portals/shell/src/shell/chat/threadStore.ts   # MUST be 0 before the plant
sed -i 's/requestAnimationFrame/queueMicrotask/' portals/shell/src/shell/chat/threadStore.ts
grep -n 'queueMicrotask' portals/shell/src/shell/chat/threadStore.ts   # MUST show the plant
npx playwright test tests/e2e/streaming.spec.ts   # MUST fail
cp /tmp/opencode/nc/threadStore.ts.bak portals/shell/src/shell/chat/threadStore.ts

# Plant: auto-persist every artifact (assertion fails)
cp portals/shell/functions/api/artifacts/share.ts /tmp/opencode/nc/share.ts.bak
grep -n 'if (true)' portals/shell/functions/api/artifacts/share.ts   # MUST be empty before the plant
sed -i 's/if (explicitShare)/if (true)/' portals/shell/functions/api/artifacts/share.ts
grep -n 'if (true)' portals/shell/functions/api/artifacts/share.ts   # MUST show the plant
node scripts/gate.mjs --feature artifact-sharing --quick   # MUST exit 1
cp /tmp/opencode/nc/share.ts.bak portals/shell/functions/api/artifacts/share.ts

# Re-verify green after every restore (run from the repo root):
node scripts/gate.mjs --feature streaming-protocol --quick
node scripts/gate.mjs --feature artifact-sharing --quick
cd portals/shell && npx playwright test tests/e2e/streaming.spec.ts
```