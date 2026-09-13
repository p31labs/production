# Substrate Research Synthesis — Build Date

Status: RESEARCH COMPLETE + CODE INTEGRATED. This doc records what was found and how it maps to code.

## 1. Workers for Platforms — Per-passport dispatch namespace

**Source:** Cloudflare Docs — Workers for Platforms overview + Custom Limits API

### What it does
- You define a **dispatch namespace** (e.g. `qpj-dispatch`). All HTTP requests to that namespace land in ONE Worker (the dispatch Worker).
- The dispatch Worker reads the `Host` header (e.g. `dillpickle.qpj.p31ca.org`) and **routes** to the correct per-persona Worker.
- Each persona gets a fully isolated Worker instance with its own bindings, memory, and environment.
- You can attach **Custom Limits** (`cpuMs`, `subRequests`) per invocation — hard CPU/IO budget enforcement at the edge, no runaway tasks.

### Key constraints
- Unlimited number of Workers in the namespace (free scaling).
- The dispatch Worker itself is stateless — it only routes. All state lives in the target Worker + its Durable Object.
- Worker-to-Worker calls from dispatch → passport use the dispatch namespace internally (no public URL needed).
- Compatible with Durable Objects, Sandbox SDK, AI, Queues, D1, R2 — any binding.

### How qpj uses it
- Dispatch namespace: `qpj-dispatch`
- Hostname pattern: `{passportId}.qpj.p31ca.org` (e.g. `dillpickle.qpj.p31ca.org`)
- Target Worker: `p31-passport` — one template, many instances
- Per-passport Custom Limits: `cpuMs: 5000` (5s CPU cap), `subRequests: 50` (50 downstream calls cap)
- The dispatch Worker enforces limits before the passport Worker even starts executing.

## 2. Durable Objects — Per-passport persistent state

**Source:** Cloudflare Docs — Durable Objects limits, hibernation, SQLite storage

### Storage limits
- **10 GB per DO instance** — more than enough for task history, memory, identity per person.
- **Unlimited DO instances** — one per passport.
- SQLite storage via `new_sqlite_classes` — real SQL, prepared statements, transactions.

### Hibernation
- DOs hibernate after **30 seconds of inactivity** (no WebSocket connection).
- Upon wake, DO code receives a `fetch` event — must accept via `this.ctx.acceptWebSocket` or handle HTTP.
- Hibernation is NOT a timeout for state — data persists across wake cycles.
- For qpj (HTTP request/response pattern), hibernation is ideal: each HTTP call wakes the DO, handles the request, and the DO hibernates again.

### WebSocket requirement
- If you want real-time updates (push), the DO MUST call `this.ctx.acceptWebSocket()` — otherwise hibernation fires immediately.
- For qpj's request/response pattern, no WebSocket needed. Pure HTTP fetch → process → hibernate.

### How qpj uses it
- One DO class: `PassportDO` — one instance per passport ID.
- Storage: SQLite with tables: `memory`, `tasks`, `identities`, `preferences`.
- Methods: `storeMemory`, `recallMemory`, `storeTask`, `getTasks`, `storeIdentity`, `getIdentity`.
- All mutations in SQLite transactions. All reads via prepared statements.

## 3. Sandbox SDK — Agent execution inside the passport Worker

**Source:** Cloudflare Docs — Sandbox SDK lifecycle + `@cloudflare/agents` Agents SDK

### Lifecycle
1. **Running** — Sandbox is active, executing code.
2. **Sleeping** — After **10 minutes** of inactivity, Sandbox goes to sleep.
3. **Destroyed** — After **2 hours** of sleep, Sandbox is destroyed.
4. **Re-created** — Next invocation creates a fresh Sandbox with the same ID.

### Key APIs
- `getSandbox(env.Sandbox, id)` — get or create a Sandbox by ID.
- `sandbox.exec(command, args, options)` — execute a command, returns `{ exitCode, stdout, stderr }`.
- `sandbox.runCode(code, options)` — execute arbitrary code, returns output.
- `sandbox.file.read(path)` / `sandbox.file.write(path, content)` — file operations.
- `sandbox.sleep(ms)` — pause execution (useful for rate limiting).

### Agents SDK integration
- `@callable()` decorator on methods — exposed as RPC endpoints.
- `@callable({ streaming: true })` — streaming responses.
- `routeAgentRequest(agent, request)` — route HTTP to agent.
- Durable execution: `runFiber()` + `stash()` for stateful workflows.

### How qpj uses it
- Sandbox binding: `env.Sandbox` — configured in wrangler.toml.
- Per-passport sandbox ID: `{passportId}-{sessionId}`.
- Execution flow: `getSandbox(env.Sandbox, id)` → `runCode(userGoal)` → return result.
- The Sandbox runs the actual agent logic (DeepSeek/Claude/Gemini calls via the Triad UI).
- Sandbox is **dormant behind feature flag** `substrate: false` — portal runs in local-bridge mode until flag is enabled.

## 4. Custom Limits API — Per-passport CPU + IO budget

**Source:** Cloudflare Docs — Custom Limits API for Workers for Platforms

### Limits you can set
- **cpuMs** — Maximum CPU time per invocation (milliseconds). Exceeding = immediate termination.
- **subRequests** — Maximum downstream HTTP calls per invocation. Exceeding = immediate termination.

### Why it matters for qpj
- Prevents runaway agent tasks from consuming unlimited resources.
- Per-passport limits mean one misbehaving persona doesn't affect others.
- Enforced at the dispatch layer BEFORE the passport Worker executes.
- qpj defaults: `cpuMs: 5000` (5 seconds), `subRequests: 50`.
- Caregivers can raise limits via the Workshop tier (Full level).

## 5. ui-aesthetics skill — 6 task routes for agent-driven UI

**Source:** ui-aesthetics skill definition

### The 6 task routes
1. **Build a UI from a prompt** — Generate React components from natural language.
2. **Audit / refactor / fix a UI** — Review existing code for aesthetics, accessibility, performance.
3. **Add a component to an existing project** — Drop in a new component following existing patterns.
4. **Create a reusable component library** — Build a standalone component package.
5. **Add a visual theme/skin/skin to a UI** — Theme changes without layout refactoring.
6. **Apply a design system to a UI project** — Full design system integration.

### Non-negotiables
- Use design tokens (variables), never hardcode values.
- Consistent spacing (8px base).
- Responsive behavior.
- Color contrast (WCAG AA minimum).
- Accessibility (ARIA labels, keyboard navigation, focus states).
- Performance (lazy loading, code splitting, minimal re-renders).

### Priority order
- Security FIRST.
- Accessibility SECOND.
- Responsive THIRD.
- Performance FOURTH.
- Visual polish FIFTH.
- Animation SIXTH.

### How qpj uses it
- qpj follows all 6 routes via its existing design system (@p31/design-core).
- The Triad Architect step audits UI changes against these routes before committing.
- The Substrate's dispatch Worker enforces priority order via the `verify` phase.

## 6. pi-ux — Deterministic slop audit gates

**Source:** pi-ux skill definition

### Key principles
- **Deterministic slop audit** — measurable, reproducible audits at every gate. No subjective assessment.
- **APCA contrast + tokens + states** — Automated Perceptual Contrast Algorithm for contrast checking, token system for consistency, state verification for interactivity.
- **Works with text-only models** — No vision required for audits. All checks are code-analysis based.

### How qpj uses it
- `v:gate` script runs the design-core vendor sync (token audit).
- `src/__tests__/token-audit.test.ts` — every `var(--p31-*)` read must resolve to a definition.
- `src/__tests__/brand-scrub.test.ts` — no hardcoded human names.
- `src/__tests__/passport-isolation.test.tsx` — mode gate locks, session isolation.
- The Substrate's dispatch Worker runs a `verify` phase that mirrors these audits before committing changes.

## 7. Mapping: research → code

| Research finding | Code location | Status |
|-----------------|---------------|--------|
| Dispatch namespace routing | `workers/p31-dispatch/src/index.ts` | IMPLEMENTED |
| Per-passport Worker template | `workers/p31-passport/src/index.ts` | IMPLEMENTED |
| DO with SQLite storage | `workers/p31-passport/src/passport-do.ts` | IMPLEMENTED |
| Sandbox SDK agent execution | `workers/p31-passport/src/index.ts` (dormant) | STUBBED |
| Custom Limits (cpuMs, subRequests) | `workers/p31-dispatch/src/index.ts` | IMPLEMENTED |
| Hibernation-friendly DO pattern | `workers/p31-passport/src/passport-do.ts` | IMPLEMENTED |
| Client bridge (fetch to dispatch) | `src/lib/substrate.ts` | IMPLEMENTED |
| Feature flag (`substrate: false`) | env var + bridge guard | IMPLEMENTED |
| Mode-gated security | `src/features/worker/substrate-bridge.ts` | IMPLEMENTED |
| Verification phase in dispatch | `workers/p31-dispatch/src/index.ts` | IMPLEMENTED |
| Per-passport CPU limits | `workers/p31-dispatch/src/index.ts` | IMPLEMENTED |
| Pre-Review Quick Gate | `workers/p31-dispatch/src/index.ts` | IMPLEMENTED |
| Handoff protocol (JSON payloads) | `src/lib/substrate.ts` | IMPLEMENTED |
| Regression recovery protocol | `src/lib/substrate.ts` | IMPLEMENTED |
| Measurable success criteria | `docs/17-PROMPT-UPGRADES.md` | DOCUMENTED |

## 8. Architecture summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    QPJ Portal (Browser)                         │
│  User → WorkerPage → WorkerChat → delegateGoal()                │
│         → substrate.ts → fetch() to dispatch Worker             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ POST /api/goal
                           │ Host: dillpickle.qpj.p31ca.org
                           │ Body: { type: "goal", passportId, goal, mode, autonomy }
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              p31-dispatch Worker (Cloudflare)                    │
│  1. Read Host header → extract passportId                       │
│  2. Custom Limits check (cpuMs: 5000, subRequests: 50)          │
│  3. Verification phase (pi-ux audit gate check)                 │
│  4. Route to passport Worker: {passportId}.qpj.p31ca.org        │
│  5. Post-review quick gate                                      │
│  6. Return response or deferred status                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Worker-to-Worker call
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           p31-passport Worker (per-persona, Cloudflare)          │
│  1. Receive request → extract method + payload                  │
│  2. Route to PassportDO (Durable Object by passportId)          │
│  3. DO operations: SQLite (memory, tasks, identity)             │
│  4. Sandbox SDK: getSandbox(env.Sandbox, id) → runCode(goal)    │
│     (dormant behind substrate: false flag)                      │
│  5. Return result                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ DO binding
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              PassportDO — Durable Object                         │
│  SQLite storage: memory, tasks, identities, preferences         │
│  Hibernation: HTTP fetch → process → hibernate                  │
│  No WebSocket needed (request/response pattern)                  │
└─────────────────────────────────────────────────────────────────┘
```

## 9. Feature flag: `substrate: false`

- Env var: `VITE_SUBSTRATE_ENABLED` in portal (default: `false`)
- When `false`: bridge falls back to local sandbox store (existing behavior).
- When `true`: bridge sends goals to dispatch Worker; response handled as async (deferred status polling).
- Dispatch Worker checks: `substrate` flag in its bindings. If disabled, returns 503 with message.
- This allows incremental rollout: portal first, then workers, then full integration.
