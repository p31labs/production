<!-- P31-HEADER
id: p31_feature_tool_protocol_20261005_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-05T00:00:00Z
owner: will
-->

# Feature: Tool Protocol

## The invariant

A tool call is a first-class, visible event: it renders as a collapsible block
with its name, arguments, result, and error state; a tool whose action is
consequential does not execute until a human approves it; a rejected tool
returns a denied result to the model so the model can explain the stop; and
every tool invocation and its resolution is appended to the ledger.

## The boundary

This feature does **not** own:

- **Tool implementation** — each tool is a function; the protocol wraps them.
- **The run-level approval gate** — `ApprovalGate` (Wave 1) handles run interrupts.
  This feature renders its own compact approve/reject via `useToolApproval`,
  because the tool resolution travels over HTTP, not the bus.
- **The policy** — `authz.isConsequential()` owns which actions gate. This
  feature reads it. No new policy code.
- **The model's decision to call a tool** — Workers AI owns that.
- **Streaming tokens during a tool turn** — a turn that offers tools is
  JSON-mode and non-streamed by construction. The natural-language reply for a
  tool turn arrives after the tool result round-trips.

Three rules this feature owns outright:

1. **A rejected tool returns a denied tool result.** The model receives
   `{ role: 'tool', isError: true, content: 'Denied: <reason>' }` before it
   resumes. Resuming without it causes a re-call loop.
2. **The approval id is the tool call id.** `useToolApproval.resolve(id, approved)`
   must carry the exact `toolCallId` the request was emitted with. A mismatched
   id is a silent no-op — the gate never resolves.
3. **A tool call is appended to the ledger before it executes and after it
   resolves.** Two rows minimum: `tool.call.started` and `tool.call.resolved`.
   An unlogged tool execution is a hole in the audit chain.

## The implementation

| File | What it provides |
|---|---|
| `functions/api/chat/tools.ts` | the tool registry — name, JSON schema, `action`, execute |
| `functions/api/chat/stream.ts` | *(modified)* the tool-call loop + approval mode |
| `src/shell/chat/ToolBlock.tsx` | the collapsible block (four states) |
| `src/shell/chat/toolStore.ts` | tool calls keyed by tool-call id, status tracked |
| `src/shell/chat/useToolApproval.ts` | the client half: `resolve(id, approved, reason)` |
| `src/bus/events.ts` | *(modified)* `tool.call.started` / `tool.call.resolved` |
| `src/faces/chat/ChatFace.tsx` | *(modified)* render `ToolBlock` inline |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| approval required | consequential tool → `awaitingApproval`, no execute | auto-executes → gate never renders |
| approval approved | approve → tool executes → `completed` | approve → nothing happens (id mismatch) |
| approval rejected | reject → denied result in history → model explains | reject → model re-calls the tool |
| id match | `resolve(toolCallId, approved)` resolves | mismatched id is a silent no-op |
| ledger rows | two rows per tool call (`started`, `resolved`) | one row → audit hole |
| error state | `error` renders the error text | swallowed → blank block |
| grouping | consecutive same-tool calls collapse into one block | one block per call → wall of noise |

## The gate

```bash
node scripts/gate.mjs --feature tool-protocol
```

## The escalation

When this feature blocks a surface, the surface does not ship with tools. A
tool protocol that fails closed is a chat; a tool protocol that fails open is an
incident.