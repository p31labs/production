<!-- P31-HEADER
id: p31_wave_8_multiplayer_20261006_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Wave 8 — Multiplayer (Convergence, part 7)

## Scope note (the honest line)

Waves 2–7 built a chat surface with real transport, interface, tools, history,
a thread list, an artifact panel, streaming, and sharing. Wave 8 makes the
session a room. Six things land:

1. **The room topology** — a `SessionRoom` Durable Object in a standalone
   room Worker, bound to the Pages project (Pages cannot host a DO class —
   see `collaboration.md` → The topology).
2. **The Yjs draft document** — one per session, synced over WebSocket,
   carrying the draft layer only. History stays in the ledger; the ledger
   receives commits, never keystrokes.
3. **Presence** — the Awareness CRDT: who is here, where their cursor is.
   Ephemeral; the only presence rows in the ledger are `session.joined` and
   `session.left`.
4. **The agent as participant** — the turn pushes its phase to the room;
   every participant sees `thinking` / `streaming` / `tool:<name>` / `paused`.
5. **Attribution** — `authorDid` on messages and usage; the token meter
   splits per `did`.
6. **The remote overlay** — a derived layer (`pointer-events: none`) that
   never captures the local participant's focus.

Plus four corrections carried from Wave 7's review:

7. **The replay order is asserted.** `streamClient` reverses the ledger
   window before replay so `messages[0]` is oldest — the load-older cursor
   assumes it, and no gate checked it. The assertion landed in the
   `load-older` gate with this package; Phase 2 proves its control.
8. **The negative-control rule is strengthened.** The master says a gate is
   not shipped until a plant makes it fail. It must also say the plant is
   confirmed to alter the code the assertion reads — Wave 7 proved a no-op
   `sed` (no `/g`, first occurrence only) can pass a control that could never
   fail. Phase 2 edits `00-MASTER.md`.
9. **The detection effect is asserted, not assumed.** `ChatFace` guards with
   `if (streaming) return;` before `detectArtifacts` — the assertion landed
   in the `collaboration` gate with this package; Phase 2 proves its control.
10. **Restore-by-git is broken for this shell.** `portals/shell/**` is
   untracked — `git checkout` cannot revert it. Every control below backs up
   with `cp` to `/tmp/opencode/nc/` and restores with `cp`.

**Explicitly not in this wave:** shared pages (the ChatGPT Space tier),
members/roles UI, comments anchored to a message, notifications, per-user API
keys (BYOK), and a workspace-scoped room. Those are Wave 9.

## The DAG

```yaml
version: "1.0"
name: wave-8-multiplayer
inputs:
  - name: scope_lock
    required: true
    description: "portals/shell/room/**, functions/api/session/**, functions/_lib/roomClient.ts, functions/api/chat/stream.ts, wrangler.toml, package.json, src/shell/chat/**, src/faces/chat/**, src/bus/events.ts, tests/e2e/**, scripts/gate.mjs, docs/enterprise/build-package/00-MASTER.md, docs/fix-plans/**"
  - name: role
    required: false
    default: operator

nodes:
  # ── Phase 1 — Read (deterministic) ─────────────────────────────────────
  - id: read-master
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/00-MASTER.md]

  - id: read-collab
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/features/collaboration.md]
    depends: [read-master]

  - id: read-agent-presence
    type: deterministic
    command: cat
    args: [docs/enterprise/build-package/features/agent-presence.md]
    depends: [read-master]

  - id: read-stream-client
    type: deterministic
    command: cat
    args: [portals/shell/src/shell/chat/streamClient.ts]
    depends: [read-collab]

  - id: read-thread-store
    type: deterministic
    command: cat
    args: [portals/shell/src/shell/chat/threadStore.ts]
    depends: [read-collab]

  - id: read-chat-face
    type: deterministic
    command: cat
    args: [portals/shell/src/faces/chat/ChatFace.tsx]
    depends: [read-collab]

  - id: read-turn
    type: deterministic
    command: cat
    args: [portals/shell/functions/api/chat/stream.ts]
    depends: [read-agent-presence]

  - id: read-wrangler
    type: deterministic
    command: cat
    args: [portals/shell/wrangler.toml]
    depends: [read-collab]

  # ── Phase 2 — Corrections + topology (agentic) ─────────────────────────
  - id: fix-corrections
    type: agentic
    prompt: |
      Four Wave 7 corrections:
      1. Strengthen the negative-control rule in
         docs/enterprise/build-package/00-MASTER.md (the rule currently reads
         "a gate is not shipped until a planted violation makes it fail" —
         around line 342): append that the plant must also be confirmed to
         alter the code the assertion reads (grep the needle after planting);
         a no-op plant is not a control. Wave 7's sed without /g passed a
         control that could not fail.
      2. Prove the replay-order control (negative control #4 below): plant,
         confirm the needle changed, run the load-older gate, MUST exit 1,
         restore with cp, re-run green. Record the result as evidence.
      3. Prove the detection-guard control (negative control #5 below) the
         same way against the collaboration gate. Record the result.
      4. Record: portals/shell/** is untracked — never git checkout a shell
         file; cp backups only (already reflected in the controls below).
    depends: [read-stream-client, read-chat-face]

  - id: topology-spike
    type: agentic
    prompt: |
      Verify the room topology before any code is written:
      1. Confirm the Pages + DO binding pattern from collaboration.md (The
         topology): a standalone Worker at portals/shell/room/ exporting
         SessionRoom, bound into the Pages wrangler.toml with
         [[durable_objects.bindings]] script_name, local dev via
         `npx wrangler pages dev --do SESSION_ROOM=SessionRoom@<room-worker>`.
      2. Smoke it: a minimal SessionRoom that echoes a WebSocket upgrade;
         run it under wrangler pages dev and connect once.
      3. Write the decision to docs/fix-plans/wave-8-room-topology.md
         (P31-HEADER, type: fix-plan): binding works → status resolved with
         the evidence; binding fails → status open with the fallback
         (migrate the shell to Workers-with-assets) and the reason. Abort the
         wave on the fallback rather than improvising the deploy.
    depends: [read-wrangler]

  # ── Phase 3 — Build the room (agentic) ────────────────────────────────
  - id: build-room
    type: agentic
    prompt: |
      Read features/collaboration.md and features/agent-presence.md.
      Build exactly as described:
      1. Create portals/shell/room/src/SessionRoom.ts — the Yjs server: one DO
         per session id; sync + awareness relay over WebSocket; awareness held
         in DO memory only; session.joined / session.left appended through the
         pinned literal `append(env, { type: 'session.joined', … })`; the
         agent's presence state set/cleared by notifyAgentPhase.
      2. Create portals/shell/room/src/index.ts and portals/shell/room/wrangler.toml
         — main, the SessionRoom class export, its own D1 binding (same
         database as the shell).
      3. Create functions/api/session/[id]/room.ts — read the identity claim,
         fail closed (401/403 when absent), upgrade-passthrough to
         env.SESSION_ROOM.idFromName(sessionId).
      4. Modify portals/shell/wrangler.toml — the DO binding (script_name →
         the room Worker). Do NOT add a DO class here: Pages cannot host one.
      5. Modify portals/shell/package.json — deploy:room chained into deploy.
      6. Create functions/_lib/roomClient.ts — notifyAgentPhase(env,
         sessionId, phase | null), fire-and-forget, try/catch.
      7. Modify functions/api/chat/stream.ts — stamp authorDid server-side
         from x-p31-did; notifyAgentPhase at phase.started, per tool call
         (tool:<name>), and null on message.ended / run.error. Presence never
         enters the turn's failure path.
      8. Create src/shell/chat/collab/collabStore.ts — client Yjs doc +
         provider; remote updates applied with the pinned literal
         `Y.applyUpdate(doc, update)` (the negative control plants this line).
      9. Create src/shell/chat/collab/usePresence.ts — awareness hook for the
         human participant only.
      10. Create src/shell/chat/collab/PresenceBar.tsx — avatar stack, agent
          chip, per-did token split from model.usage.
      11. Create src/shell/chat/collab/RemoteCursor.tsx — derived overlay,
          pinned `pointer-events: none`.
      12. Create src/shell/chat/collab/useAgentPresence.ts — read-only
          phase → label mapping (no awareness writes in this file).
      13. Modify src/bus/events.ts — session.joined, session.left in
          BUS_EVENT_TYPES; authorDid? on MessageContent and model.usage
          (additive only).
      14. Modify src/faces/chat/ChatFace.tsx — stamp authorDid on the user
          emit; send x-p31-did on the stream POST; mount PresenceBar and
          RemoteCursor; render the author on each message.
      15. Create tests/e2e/collaboration.spec.ts — two browser contexts: both
          edit the draft and both survive; a join shows a presence avatar
          within 1s; a disconnect removes it; the agent chip appears during a
          turn; typing with a remote cursor over the input still types.
      Only touch the scope lock. Do NOT persist awareness. Do NOT append
      per keystroke. Do NOT let a remote overlay capture local focus. Do NOT
      add shared pages, comments, or members.
    depends: [fix-corrections, topology-spike, read-thread-store, read-chat-face, read-turn]

  # ── Phase 4 — Gate (structural + behavioural) ─────────────────────────
  - id: gate-collab
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, collaboration]
    depends: [build-room]

  - id: gate-agent-presence
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, agent-presence]
    depends: [build-room]

  - id: gate-behavioural
    type: deterministic
    command: npx
    args: [playwright, test, tests/e2e/]
    cwd: portals/shell
    depends: [build-room]

  - id: gate-streaming
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, streaming-protocol]
    depends: [build-room]

  - id: gate-sharing
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, artifact-sharing]
    depends: [build-room]

  - id: gate-artifacts
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, artifacts]
    depends: [build-room]

  - id: gate-thread-list
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, thread-list]
    depends: [build-room]

  - id: gate-load-older
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, load-older]
    depends: [build-room]

  - id: gate-tools
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, tool-protocol]
    depends: [build-room]

  - id: gate-primitives
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, chat-primitives]
    depends: [build-room]

  - id: gate-surface
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --surface, chat]
    depends: [build-room]

  - id: gate-build
    type: deterministic
    command: npm
    args: [run, build]
    cwd: portals/shell
    depends: [build-room]

  - id: gate-typecheck
    type: deterministic
    command: npm
    args: [run, typecheck]
    cwd: portals/shell
    depends: [build-room]

  # ── Phase 5 — Approval (human) ────────────────────────────────────────
  - id: review
    type: approval
    prompt: "Multiplayer room built and gated. Deploy to production?"
    depends: [gate-collab, gate-agent-presence, gate-behavioural, gate-streaming, gate-sharing, gate-artifacts, gate-thread-list, gate-load-older, gate-tools, gate-primitives, gate-surface, gate-build, gate-typecheck]

  # ── Phase 6 — Deploy (deterministic) ──────────────────────────────────
  - id: deploy
    type: deterministic
    command: npm
    args: [run, deploy]
    cwd: portals/shell
    depends: [review]

edges:
  - from: read-master
    to: read-collab
    contract: { requires: [package-exists], ensures: [contract-read] }
  - from: read-collab
    to: read-stream-client
    contract: { requires: [contract-read], ensures: [transport-read] }
  - from: topology-spike
    to: build-room
    contract: { requires: [topology-recorded], ensures: [room-deployable] }
  - from: fix-corrections
    to: build-room
    contract: { requires: [wave-7-corrected], ensures: [gate-clean] }
  - from: build-room
    to: gate-collab
    contract: { requires: [room-built], ensures: [structural-green] }
  - from: build-room
    to: gate-behavioural
    contract: { requires: [room-built], ensures: [converges-and-presence-works] }
  - from: gate-behavioural
    to: review
    contract: { requires: [behavioural-green], ensures: [human-approval] }
  - from: review
    to: deploy
    contract: { requires: [human-approval], ensures: [deployed] }

error_handlers:
  - on: topology-spike-failed
    action: abort
    message: "The Pages+DO binding did not verify. Record the fallback decision (Workers-with-assets) in docs/fix-plans/ and stop — do not improvise the deploy path."
  - on: gate-collab-failed
    action: abort
    message: "Collaboration gate red. The CRDT, the awareness channel, the identity fail-closed path, or the Durable Object is broken."
  - on: gate-agent-presence-failed
    action: abort
    message: "Agent presence gate red. The agent is invisible while working, or the client is inventing its state."
  - on: gate-behavioural-failed
    action: abort
    message: "An edit was lost, presence did not appear or did not disappear, or a remote overlay captured local focus."
  - on: gate-streaming-failed
    action: abort
    message: "Wave 7 regressed. The multiplayer work touched the turn protocol (phase push, authorDid stamping)."
  - on: gate-primitives-failed
    action: abort
    message: "Wave 3 primitives regressed. The collab layer touched the thread store and the face."
```

## The gate

```bash
node scripts/gate.mjs --feature collaboration
node scripts/gate.mjs --feature agent-presence
npx playwright test tests/e2e/
```

Structural assertions (the precondition):

| # | Assertion | Proves |
|---|---|---|
| 1 | the SessionRoom DO exists in the room Worker | the room is a real DO, not a Pages class |
| 2 | the Pages project binds `SESSION_ROOM` | the Function can reach the room |
| 3 | the room Worker declares its class + D1 | the room is deployable and durable |
| 4 | the upgrade fails closed (401/403) on a missing identity claim | no anonymous room |
| 5 | the room persists history through ledger `append` | the room survives eviction |
| 6 | awareness is relayed, never appended, never a ledger type | presence is ephemeral |
| 7 | `session.joined` / `session.left` are in `BUS_EVENT_TYPES` | lifecycle is auditable |
| 8 | the remote overlay pins `pointer-events: none` | it cannot capture focus |
| 9 | `MessageContent` carries `authorDid` | attribution |
| 10 | the detection effect is guarded while streaming | Wave 7 correction #9 |
| 11 | the hydrate window is reversed (`load-older`) | Wave 7 correction #7 |
| 12 | typecheck passes | no type contract violated |
| 13 | build passes | the bundle builds |

Assertions 12–13 are skipped under `--quick`. The agent-presence gate adds
four: phase pushed server-side, phase cleared at end of turn, phase → label
mapping, and no client-authored agent presence.

Behavioural assertions (the gate — never skipped):

| # | Assertion | Proves |
|---|---|---|
| 14 | two contexts edit the draft; both edits survive | convergence, no lost update |
| 15 | a second context joins; the first sees an avatar within 1s | presence propagates |
| 16 | the second context disconnects; the avatar disappears | presence is ephemeral |
| 17 | the agent chip appears and tracks the phase during a turn | agent presence |
| 18 | typing while a remote cursor is over the input still types | no focus capture |

## The evidence

- `git diff --stat` for the touched scope (plus `git status` noting the shell
  is untracked — the diff is against the working tree).
- `node scripts/gate.mjs --feature collaboration` and `--feature agent-presence`
  output (10/10 and 4/4).
- `npx playwright test tests/e2e/` — full run, five behavioural assertions.
- The convergence trace: two contexts, an edit in each, the merged draft.
- The presence recording: a join, an avatar, a disconnect, the avatar gone.
- The agent chip mid-turn with its label.
- The topology decision in `docs/fix-plans/wave-8-room-topology.md`.
- The proven controls (below), each with the post-plant `grep` showing the
  needle the assertion reads was actually altered.

## The negative control

The rule (Wave 7's lesson, master correction #8): **after planting, grep the
needle the assertion reads. A plant that does not change the asserted code is
not a control.** The restore rule (correction #10): `portals/shell/**` is
untracked — `cp` to `/tmp/opencode/nc/`, never `git checkout`.

```bash
mkdir -p /tmp/opencode/nc

# Control 1 — the lost edit (assertion 14; the one that matters most)
cp portals/shell/src/shell/chat/collab/collabStore.ts /tmp/opencode/nc/collabStore.ts.bak
sed -i 's/Y.applyUpdate(doc, update)/void update;/' portals/shell/src/shell/chat/collab/collabStore.ts
grep -n 'void update' portals/shell/src/shell/chat/collab/collabStore.ts   # MUST show the plant
(cd portals/shell && npx playwright test tests/e2e/collaboration.spec.ts)  # MUST fail — one edit lost
cp /tmp/opencode/nc/collabStore.ts.bak portals/shell/src/shell/chat/collab/collabStore.ts

# Control 2 — the focus-stealing overlay (assertion 8)
cp portals/shell/src/shell/chat/collab/RemoteCursor.tsx /tmp/opencode/nc/RemoteCursor.tsx.bak
sed -i 's/pointer-events: none/pointer-events: auto/' portals/shell/src/shell/chat/collab/RemoteCursor.tsx
grep -n 'pointer-events' portals/shell/src/shell/chat/collab/RemoteCursor.tsx   # MUST show auto
node scripts/gate.mjs --feature collaboration --quick   # MUST exit 1
cp /tmp/opencode/nc/RemoteCursor.tsx.bak portals/shell/src/shell/chat/collab/RemoteCursor.tsx

# Control 3 — persisted awareness (assertion 6)
cp portals/shell/room/src/SessionRoom.ts /tmp/opencode/nc/SessionRoom.ts.bak
sed -i 's/append(env, {/append(env, { awareness: this.awareness.getStates(),/' portals/shell/room/src/SessionRoom.ts
grep -n 'awareness: this.awareness' portals/shell/room/src/SessionRoom.ts   # MUST show the plant inside the call
node scripts/gate.mjs --feature collaboration --quick   # MUST exit 1
cp /tmp/opencode/nc/SessionRoom.ts.bak portals/shell/room/src/SessionRoom.ts

# Control 4 — replay order (assertion 11; correction #7 — proven with the package)
cp portals/shell/src/shell/chat/streamClient.ts /tmp/opencode/nc/streamClient.ts.bak
sed -i 's/\[\.\.\.recent\]\.reverse()/[...recent]/' portals/shell/src/shell/chat/streamClient.ts
grep -n 'reverse' portals/shell/src/shell/chat/streamClient.ts || echo "needle gone — plant confirmed"
node scripts/gate.mjs --feature load-older --quick   # MUST exit 1
cp /tmp/opencode/nc/streamClient.ts.bak portals/shell/src/shell/chat/streamClient.ts

# Control 5 — unguarded detection (assertion 10; correction #9 — proven with the package)
cp portals/shell/src/faces/chat/ChatFace.tsx /tmp/opencode/nc/ChatFace.tsx.bak
sed -i 's/if (streaming) return;//' portals/shell/src/faces/chat/ChatFace.tsx
grep -c 'if (streaming) return;' portals/shell/src/faces/chat/ChatFace.tsx   # MUST be 0
node scripts/gate.mjs --feature collaboration --quick   # MUST exit 1
cp /tmp/opencode/nc/ChatFace.tsx.bak portals/shell/src/faces/chat/ChatFace.tsx

# Re-verify green after every restore:
node scripts/gate.mjs --feature collaboration --quick
node scripts/gate.mjs --feature load-older --quick
```

Control 1 is the one that matters: a room that loses an edit is worse than a
room that does not exist, because the participant believes their work is
saved. Control 2 is the overlay that hijacks the local participant. Control 3
is the presence-persistence error that leaves ghost avatars. Controls 4 and 5
are Wave 7's structural corrections — the two assertions no one wrote until
this review.
