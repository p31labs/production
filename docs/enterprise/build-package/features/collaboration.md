<!-- P31-HEADER
id: p31_feature_collaboration_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Collaboration

## The invariant

More than one participant — human or agent — shares one session: concurrent
edits converge without a lost update; presence (who is here, what they are
doing) is visible to every participant and vanishes when they disconnect;
every message is attributed to its author; the ledger receives commits, never
keystrokes; and a remote participant's cursor never hijacks the local
participant's focus.

## The boundary

This feature does **not** own:

- **The turn** — Wave 7's two-phase turn owns model calls. The turn only
  publishes its phase (see `agent-presence.md`).
- **Message history** — the ledger (Wave 2) owns durable rows. The CRDT is
  the live draft layer, not the archive.
- **The artifact viewer** — Wave 6's `ArtifactPane` owns the preview.
- **Identity** — the `IdentityAdapter` declares `did` and `role` client-side.
  This feature consumes them and fails closed when they are absent; it does
  not verify them server-side. That trust model is a **named gap**: a
  `did` header is client-asserted. File it, do not paper over it.
- **Token billing math** — `model.usage` owns the numbers; this feature only
  groups them by author.
- **Shared pages, members, comments, notifications, BYOK** — the ChatGPT
  Space tier. Wave 9.

### The decisions (answered before the build)

| Question | Decision |
|---|---|
| What does the Yjs doc carry? | **The draft layer only** — the message being composed, in-flight edits, and awareness. Committed history stays in the ledger; a 1,000-message session never loads 1,000 messages into a CRDT (the memory problem the literature names). |
| What reaches the ledger? | **Commits, not keystrokes.** A message is a ledger row when it is sent. The draft is CRDT-only; the commit is the existing `message.content` emit. 100 keystrokes append 0 rows; one send appends 1. |
| What is the room scoped to? | **One session.** It reuses `session_id` and the existing authz floors. A workspace-level room needs a members model the shell does not have — Wave 9. |

## The topology (the hard fact)

Cloudflare **Pages cannot host a Durable Object class**: "You cannot create
and deploy a Durable Object within a Pages project" (Cloudflare Pages docs →
Bindings → Durable Objects). The class must live in a separate Worker bound
to the Pages project. Default for this wave:

1. **`portals/shell/room/`** — a standalone Worker: `main`, exports the
   `SessionRoom` class, declares its own `[[d1_databases]]` (same database).
2. **`wrangler.toml` (the Pages project)** — a `[[durable_objects.bindings]]`
   entry (`name = "SESSION_ROOM"`, `script_name` = the room Worker) so Pages
   Functions reach `env.SESSION_ROOM.idFromName(sessionId)`.
3. **`package.json`** — a `deploy:room` script chained into `deploy`.

Fallback, decided by the topology spike and recorded in `docs/fix-plans/`:
migrate the shell to Workers-with-assets (Cloudflare's recommendation —
"Durable Objects: using Durable Objects with Workers is simpler and
recommended"). Larger blast radius: the deploy command and the `functions/`
file-routing both change.

## The rules

Seven rules this feature owns outright:

1. **One Yjs draft document per session, hosted by one `SessionRoom` DO.**
   The DO is the only sync authority; clients never merge peer-to-peer.
2. **The Yjs doc carries the draft layer only.** History is read from the
   ledger exactly as today.
3. **Awareness is ephemeral: relayed and held in DO memory, never written to
   the ledger.** The only presence rows in the ledger are the discrete
   lifecycle events `session.joined` and `session.left`.
4. **The ledger receives commits, never keystrokes.** No `append` per
   keystroke — the draft exists only inside the room.
5. **A remote overlay never captures the local interaction.** `RemoteCursor`
   renders in a derived layer pinned to `pointer-events: none`; it never
   steals focus, scrolls the viewport, or intercepts a keystroke.
6. **Every message and every usage row carries an `authorDid`.** The client
   stamps its own emits from `IdentityAdapter.did`; the server stamps the
   events it emits (assistant `message.content`, `model.usage`) from the
   request's identity header.
7. **Attribution is additive.** `authorDid?` joins `MessageContent` and the
   `model.usage` payload; `session.joined`/`session.left` join
   `BUS_EVENT_TYPES`. No existing event shape changes.

## The implementation

| File | What it provides |
|---|---|
| `portals/shell/room/wrangler.toml` | the room Worker: `main`, the `SessionRoom` export, its D1 binding |
| `portals/shell/room/src/SessionRoom.ts` | the Yjs server: sync, awareness relay, agent state, `session.joined`/`session.left` via the pinned literal `append(env, { type: 'session.joined', … })` |
| `portals/shell/room/src/index.ts` | the Worker entry (health, dispatch) |
| `functions/api/session/[id]/room.ts` | Pages Function: read the identity claim, fail closed (401/403 when absent), upgrade-passthrough to `env.SESSION_ROOM` |
| `wrangler.toml` *(modified)* | `[[durable_objects.bindings]]` → the room Worker |
| `package.json` *(modified)* | `deploy:room` chained into `deploy` |
| `src/shell/chat/collab/collabStore.ts` | client Yjs doc + provider; remote updates applied with the pinned literal `Y.applyUpdate(doc, update)` — the negative control plants this line, keep it |
| `src/shell/chat/collab/usePresence.ts` | the awareness hook (`useOthers`, local state writes for the human only) |
| `src/shell/chat/collab/PresenceBar.tsx` | avatar stack + agent chip + per-`did` token split |
| `src/shell/chat/collab/RemoteCursor.tsx` | the derived remote-cursor overlay (`pointer-events: none`) |
| `src/bus/events.ts` *(modified)* | `session.joined`, `session.left`, `BUS_EVENT_TYPES`, `authorDid?` on `MessageContent`/`model.usage` |
| `src/faces/chat/ChatFace.tsx` *(modified)* | stamp `authorDid` on the user emit; send `x-p31-did` on the stream POST; mount `PresenceBar` + `RemoteCursor` |
| `functions/api/chat/stream.ts` *(modified)* | stamp `authorDid` server-side; `notifyAgentPhase` on phase transitions (see `agent-presence.md`) |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| convergence | two contexts edit the draft; both edits survive | last-write-wins → one edit lost |
| presence lifecycle | join → avatar appears; disconnect → avatar gone | awareness persisted → ghost avatar |
| commits, not keystrokes | 100 keystrokes → 0 ledger rows; send → 1 row | append per keystroke |
| remote overlay | typing while a remote cursor hovers still types | overlay steals focus |
| attribution | two authors render two correct authors | all messages show one author |
| per-`did` meter | two users trigger turns; the meter splits | one global total |
| room survival | DO eviction + reconnect → draft intact | edits gone |
| server stamping | assistant events carry the requester's `authorDid` | unstamped server events |

## The gate

```bash
node scripts/gate.mjs --feature collaboration
npx playwright test tests/e2e/collaboration.spec.ts
```

The structural assertions are a precondition. The behavioural gate is the
gate: (a) two contexts edit and both changes survive; (b) a join shows a
presence avatar within one second; (c) a disconnect removes it; (d) typing
with a remote cursor over the input still types.

## The escalation

When this feature blocks a surface, the surface does not ship as multiplayer.
A room that loses an edit is worse than a room that does not exist — the
participant believes their work is saved.
