<!-- P31-HEADER
id: p31_feature_streaming_protocol_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Streaming Protocol

## The invariant

A turn that calls a tool streams its natural-language phase token-by-token; the
tool call renders eagerly as it is decoded; a consequential tool pauses the turn
for approval without a silent gap; and the UI re-renders at most once per
animation frame regardless of how fast tokens arrive.

## The boundary

This feature does **not** own:

- **Tool execution** — the tool registry (Wave 4) owns `execute`.
- **The approval policy** — `authz.isConsequential()` owns which actions gate.
- **The bus transport** — `bus/client.ts` owns SSE and replay.
- **Markdown rendering** — `StreamingMarkdown` (Wave 3) owns the renderer. This
  feature feeds it; it does not replace it.
- **Artifact detection** — a separate feature.

Five rules this feature owns outright:

1. **The turn is two-phase, and the phases are named.** Phase 1 is the action
   collection loop — repeated model calls that only decide the next action, run
   non-streamed because Workers AI's JSON mode does not stream. Phase 2 is the
   final response — a model call with `stream: true` that produces the
   user-visible prose. The server emits `phase.started` for each phase.
2. **Phase 1 emits progress blocks.** While Phase 1 runs, the server appends a
   `tool.call.started` event for each call as it is decoded. The client renders
   the tool block in `active` state immediately — no silent gap.
3. **The tool-call event is eager, not batched at stream close.** Each tool call
   is closed (`tool.call.resolved`) as soon as the next one starts.
4. **Tokens batch on `requestAnimationFrame`.** The thread store buffers
   `message.content` appends in a mutable ref and flushes once per frame. A
   turn at 100 tok/s produces at most 60 state updates per second, not 100.
5. **The Stop button is always visible during streaming.** It is not in a menu,
   not a hover affordance, and not disabled while Phase 1 runs.

## The implementation

| File | What it provides |
|---|---|
| `functions/api/chat/stream.ts` | *(modified)* the two-phase turn: Phase 1 loop, Phase 2 stream |
| `src/shell/chat/threadStore.ts` | *(modified)* the `requestAnimationFrame` token buffer |
| `src/shell/chat/Composer.tsx` | *(modified)* the Stop button, always visible while streaming |
| `src/shell/chat/ToolBlock.tsx` | *(modified)* eager per-call transition |
| `src/bus/events.ts` | *(modified)* `phase.started` |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| two-phase split | a tool turn emits `phase.started(action)` then `phase.started(response)` | one phase → no streaming prose |
| eager tool events | three tool calls emit three `tool.call.resolved` before the final frame | batched at close → all resolve at once |
| token batching | 100 tokens in one frame → one state update | per-token → 100 updates |
| Stop visible | Stop is in the DOM for the whole turn | in a menu or disabled during Phase 1 |
| no silent gap | a tool call renders in `active` within one frame | nothing renders until the turn ends |

## The gate

```bash
node scripts/gate.mjs --feature streaming-protocol
npx playwright test tests/e2e/streaming.spec.ts
```

## The escalation

When this feature blocks a surface, the surface does not ship with streaming. A
turn with a silent gap is worse than a turn with no streaming — the reader
assumes the app has hung.