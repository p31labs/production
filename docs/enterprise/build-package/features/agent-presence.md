<!-- P31-HEADER
id: p31_feature_agent_presence_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Agent Presence

## The invariant

While a turn runs, the assistant appears in the participant list with a state
that reflects what it is actually doing (`thinking`, `streaming`,
`tool:<name>`, `paused`); every participant sees the same state; the state is
set server-side from the turn itself and clears when the turn ends; and no
client ever invents it.

## The boundary

This feature does **not** own:

- **The turn** — Wave 7's two-phase turn owns the model call. It only
  *publishes* its phase to the room.
- **The awareness transport** — `collaboration.md` owns the channel; this
  feature writes one participant's state into it.
- **The tool protocol** — Wave 4 owns the tool lifecycle; this feature maps
  `tool.call.started` to a label.

Two rules this feature owns outright:

1. **Server-side presence, pushed from the turn owner.** `stream.ts` calls
   `notifyAgentPhase(env, sessionId, phase)` at each transition and
   `notifyAgentPhase(env, sessionId, null)` when the turn ends. The call is
   fire-and-forget behind a try/catch: a room failure never fails a turn.
   Because the push originates in the turn's own function, the agent's
   presence does not depend on any one client staying connected.
2. **The label is derived, never authored.** `useAgentPresence` is read-only:
   `phase.started('action') → thinking`, `phase.started('response') →
   streaming`, `tool.call.started(name) → tool:<name>`, `run.interrupted →
   paused`, end-of-turn (`null` from the room) → cleared. It never writes
   awareness state for the agent — the client cannot claim the agent is here.

## The implementation

| File | What it provides |
|---|---|
| `functions/_lib/roomClient.ts` | `notifyAgentPhase(env, sessionId, phase \| null)` — server → room push via the `SESSION_ROOM` binding |
| `functions/api/chat/stream.ts` *(modified)* | pushes the phase at `phase.started`, the tool label per call, `null` on `message.ended` / `run.error` — all try/catch, never in the turn's failure path |
| `portals/shell/room/src/SessionRoom.ts` | holds the agent's state, relays it to every participant with awareness, clears on `null` |
| `src/shell/chat/collab/useAgentPresence.ts` | phase → label mapping (read-only) |
| `src/shell/chat/collab/PresenceBar.tsx` | the agent chip, rendered from the relayed state |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| appears on turn start | turn starts → chip shows `thinking` | agent invisible while working |
| label tracks the phase | `response` → `streaming`; tool → `tool:<name>` | one static label |
| clears on turn end | turn ends → chip disappears | ghost agent |
| one truth for all | two contexts show the same agent state | per-client divergence |
| never fails the turn | room unreachable → the turn still streams | presence error aborts the turn |

## The gate

```bash
node scripts/gate.mjs --feature agent-presence
```

| # | Assertion | Proves |
|---|---|---|
| 1 | the turn pushes its phase to the room | the source is server-side |
| 2 | the turn clears the phase at end of turn | no ghost agent |
| 3 | the phase maps to a presence label | the label tracks the phase |
| 4 | the client never authors agent presence | one source of truth |

## The escalation

When this feature blocks a surface, the surface ships without the agent chip.
An agent that is invisible while it works is an agent the participant cannot
trust — but a turn that fails because presence failed is worse: presence is
never allowed into the turn's failure path.
