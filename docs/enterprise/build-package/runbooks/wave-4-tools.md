<!-- P31-HEADER
id: p31_wave_4_tools_20261005_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-05T00:00:00Z
owner: will
-->

# Wave 4 — The Tool Protocol (Convergence, part 3)

## Scope note (the honest line)

Wave 3 built the interface. Wave 4 gives the backend something to do. Four
things land:

1. **The tool registry** — name, JSON schema, `action`, execute. The `action`
   field is what `isConsequential` reads.
2. **The tool-call loop** — `env.AI.run` with a `tools` array, the call →
   approval → execute → result cycle, and the denied-result path.
3. **The approval binding** — `isConsequential(action)` → `approval-requested`;
   every other action executes immediately. No new policy code.
4. **`ToolBlock`** — the collapsible four-state block, rendered inline in the
   thread, with consecutive same-tool grouping.

**Explicitly not in this wave:** token-level streaming of the assistant's
natural-language reply (a turn that offers tools is JSON-mode and non-streamed),
the threads sidebar, the artifact panel, and load-older pagination (a
feature-sized risk surface with four known bug classes; its own wave).

## The DAG

```yaml
version: "1.0"
name: wave-4-tools
inputs:
  - name: scope_lock
    required: true
    description: "functions/api/chat/**, src/shell/chat/ToolBlock.tsx, src/shell/chat/toolStore.ts, src/shell/chat/useToolApproval.ts, src/bus/events.ts, src/faces/chat/ChatFace.tsx, scripts/gate.mjs"
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
    args: [docs/enterprise/build-package/features/tool-protocol.md]
    depends: [read-master]

  - id: read-authz
    type: deterministic
    command: cat
    args: [portals/shell/src/shell/authz.ts]
    depends: [read-feature]

  - id: read-chat-stream
    type: deterministic
    command: cat
    args: [portals/shell/functions/api/chat/stream.ts]
    depends: [read-feature]

  - id: read-events
    type: deterministic
    command: cat
    args: [portals/shell/src/bus/events.ts]
    depends: [read-feature]

  # ── Phase 2 — Build (agentic) ─────────────────────────────────────────
  - id: build-tools
    type: agentic
    prompt: |
      Read the feature contract at docs/enterprise/build-package/features/tool-protocol.md
      and the authz layer at src/shell/authz.ts (isConsequential is the policy —
      do not write a second one).
      Build the tool protocol exactly as described:
      1. Create functions/api/chat/tools.ts — the registry. Each tool declares
         name, a JSON schema, an `action` (from the authz Action union), and an
         execute function. Register two tools: a read-only `search_ledger` with
         action 'view', and a consequential `deploy_surface` with action 'deploy'.
      2. Modify functions/api/chat/stream.ts — offer the registry's tools to
         env.AI.run. Add an approval mode dispatched on the body. When the model
         returns a tool_call, check isConsequential(tool.action): if true, append
         tool.call.started + run.interrupted and return approval-requested with
         the tool-call id, WITHOUT executing. If false, execute, append
         tool.call.resolved, and continue the loop with the tool result. Handle
         the denied path: a rejected approval appends a denied tool result
         ({ role: 'tool', isError: true, content: 'Denied: <reason>' }) to the
         message history and resumes the model.
      3. Create src/shell/chat/toolStore.ts — tool calls keyed by tool-call id,
         status tracked (active / completed / awaitingApproval / error).
      4. Create src/shell/chat/useToolApproval.ts — the client half: POST an
         approval resolution with { sessionId, toolCallId, approved, reason } to
         /api/chat/approval.
      5. Create src/shell/chat/ToolBlock.tsx — the collapsible block. Four
         states: active, completed, awaitingApproval, error. Renders the tool
         name, the args, the result or error. Consecutive same-tool calls group
         into one block with a repeat count.
      6. Modify src/bus/events.ts — add tool.call.started and tool.call.resolved,
         additively (extend the union + BUS_EVENT_TYPES).
      7. Modify src/faces/chat/ChatFace.tsx — render ToolBlock inline in the
         thread, above the assistant's text for that turn.
      Only touch the files in the scope lock. Do NOT stream tokens, do NOT add
      load-older pagination, do NOT build the threads sidebar or artifact panel.
    depends: [read-authz, read-chat-stream, read-events]

  # ── Phase 3 — Gate (deterministic) ────────────────────────────────────
  - id: gate-feature
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, tool-protocol]
    depends: [build-tools]

  - id: gate-surface
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --surface, chat]
    depends: [build-tools]

  - id: gate-primitives
    type: deterministic
    command: node
    args: [scripts/gate.mjs, --feature, chat-primitives]
    depends: [build-tools]

  - id: gate-build
    type: deterministic
    command: npm
    args: [run, build]
    cwd: portals/shell
    depends: [build-tools]

  - id: gate-typecheck
    type: deterministic
    command: npm
    args: [run, typecheck]
    cwd: portals/shell
    depends: [build-tools]

  # ── Phase 4 — Approval (human) ────────────────────────────────────────
  - id: review
    type: approval
    prompt: "Tool protocol built and gated. Deploy to production?"
    depends: [gate-feature, gate-surface, gate-primitives, gate-build, gate-typecheck]

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
    to: read-authz
    contract: { requires: [contract-read], ensures: [policy-read] }
  - from: build-tools
    to: gate-feature
    contract: { requires: [tools-built], ensures: [feature-gate-green] }
  - from: build-tools
    to: gate-surface
    contract: { requires: [tools-built], ensures: [surface-gate-green] }
  - from: build-tools
    to: gate-primitives
    contract: { requires: [tools-built], ensures: [primitives-gate-green] }
  - from: gate-feature
    to: review
    contract: { requires: [feature-gate-green], ensures: [human-approval] }
  - from: review
    to: deploy
    contract: { requires: [human-approval], ensures: [deployed] }

error_handlers:
  - on: gate-feature-failed
    action: abort
    message: "Tool protocol gate red. The tool contract is broken — fix the protocol, not the face."
  - on: gate-primitives-failed
    action: abort
    message: "Wave 3 primitives regressed. The tool work touched shared state."
  - on: gate-build-failed
    action: abort
    message: "Build red. The emitted bundle is broken."
  - on: gate-typecheck-failed
    action: abort
    message: "Typecheck red. A type contract was violated."
```

## The nodes in prose

**Phase 1 — Read.** The agent reads the master, the tool-protocol contract, the
authz layer (`isConsequential` is the policy), the chat stream it will modify,
and the event union.

**Phase 2 — Build.** One agentic node, seven numbered deliverables. Two tools:
`search_ledger` (read-only) and `deploy_surface` (consequential). The
consequential one is the approval-path test; the read-only one proves the
non-gated path.

**Phase 3 — Gate.** Five deterministic nodes. The primitives gate is included
because the tool work touches `ChatFace` and the event union, both of which Wave
3's gate reads.

**Phase 4–5 — Approval, deploy.** Unchanged.

## The gate

```bash
node scripts/gate.mjs --feature tool-protocol
```

| # | Assertion | Proves |
|---|---|---|
| 1 | the registry exports a `deploy`-action tool | The consequential tool exists |
| 2 | the stream offers tools to `env.AI.run` | Tool calling is wired |
| 3 | the stream reads `isConsequential` | The policy is read, not duplicated |
| 4 | a consequential tool emits `approval-requested`, not execute | Fail-closed |
| 5 | a rejected approval appends a `Denied:` result | No re-call loop |
| 6 | both tool ledger events exist | Two-row audit |
| 7 | `ToolBlock` renders four states | The UI contract |
| 8 | `ToolBlock` groups consecutive same-tool calls | Noise control |
| 9 | the approval id is the tool-call id | The gate resolves |
| 10 | typecheck passes | No type contract violated |
| 11 | build passes | The bundle builds |

Assertions 10–11 are skipped under `--quick`.

## The negative control

```bash
# Plant: auto-execute the consequential tool (assertion 4 fails)
sed -i 's/if (isConsequential(tool.action))/if (false)/' portals/shell/functions/api/chat/stream.ts
node scripts/gate.mjs --feature tool-protocol --quick   # MUST exit 1
git checkout portals/shell/functions/api/chat/stream.ts

# Plant: drop the denied result (assertion 5 fails)
sed -i '/Denied: /d' portals/shell/functions/api/chat/stream.ts
node scripts/gate.mjs --feature tool-protocol --quick   # MUST exit 1
git checkout portals/shell/functions/api/chat/stream.ts
```

The first plant is the one that matters: a tool protocol that auto-executes a
deploy is not a bug — it is the failure mode the whole feature exists to prevent.