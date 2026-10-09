<!-- P31-HEADER
id: p31_surface_chat_20261005_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-05T00:00:00Z
owner: will
-->

# Surface: Convergence (Chat)

## Identity

- **Name:** Convergence
- **Slug:** `chat`
- **Tier:** declarative
- **Audience:** Operators + admins (the primary interface to the P31 backend);
  viewers read history but cannot send
- **Purpose:** A full-page LLM chat interface with the P31 backend baked in —
  Workers AI (`env.AI`), the hash-chained bus ledger, and the canon `ChatShell`
  + `Chameleon` compositions — every turn persisted, replayable, and role-gated.

## The MVP bar

Convergence is enterprise-market-ready when all eight are true:

1. **A send produces an assistant reply** — composer → `POST /api/chat/stream`
   → `env.AI.run` → `message.*` events into the bus, no dead ends
2. **Every turn persists** — user + assistant messages append to the hash-chained
   ledger, replayable and tamper-evident
3. **Reload re-attaches** — a mid-turn reload rehydrates the thread from the
   ledger and resumes live delivery, no lost messages
4. **Abort is real** — Stop cancels the subscription reader, not just the local UI
5. **Every message carries a stable key** — messages are keyed by ledger id,
   never index (prepend-stable for the Wave 3 virtualized thread)
6. **Cost is visible** — `model.usage` events render a live token meter
7. **The Chameleon adapts** — density, tool palette, and composer tone shift by
   role, spoons, and theme (no new component — a selector over existing state)
8. **The surface is role-gated** — `can(role, 'create')` on the composer; the
   surface itself stays open (viewers read, operators send, admins see the debug panel)

## UX

### Screens

| Screen | Trigger | What renders |
|---|---|---|
| **Empty** | First load, no thread | Lumi orb + suggested prompts + the composer |
| **Streaming** | Message sent | User bubble, then the assistant bubble filling as `message.content` events land |
| **Tool call** | (Wave 3 — ToolBlock primitive) | Collapsible inline block |
| **Approval** | (Wave 3 — consequential tool) | Inline `ApprovalGate` |
| **Done** | `message.ended` | The assistant bubble completes; the token meter settles |
| **Error** | `run.error` | The failing turn in red; Retry |
| **Forbidden** | `?role=viewer` on send | Composer disabled, "Viewers can read but not send"; history still scrolls |
| **Debug** | `?role=admin` + `?debug=1` | Right panel shows raw events + token counts |

### The frame (the Chameleon shell)

Two canon frames, one surface — the shell owns the split:

- **Desktop (≥900px):** the `Workbench` from Wave 1 (threads | chat | context).
- **Mobile (<900px):** canon `ChatShell` (header + chat body + slide-up drawer).

```
┌─────────────┬──────────────────────────────────┬──────────────────────┐
│ LEFT 16rem  │  CENTER flex-1                  │  RIGHT 22rem         │
│  Threads    │  Conversation                   │  Context Panel       │
│             │                                  │                      │
│  ▸ Today    │  ┌─ you ──────────────────────┐ │  ┌────────────────┐  │
│  ▸ Yesterday│  │  what's on my plate?       │ │  │ Artifacts      │  │
│  Search     │  └─────────────────────────────┘ │  │ (Wave 3)       │  │
│  ▾ Archive  │  ┌─ assistant ────────────────┐ │  └────────────────┘  │
│             │  │  ⟳ thinking… (tokens)      │ │                      │
│  Spoons ●●● │  └─────────────────────────────┘ │                      │
│  Theme ☀/🌙 │  ┌─ composer ─────────────────┐ │                      │
│             │  │  Ask anything…  [→]        │ │                      │
└─────────────┴──────────────────────────────────┴──────────────────────┘
```

**Chameleon adaptations** (all derived from existing state, no new component):
- **Theme:** `resolveShellTheme()` (already in `store.ts`) — user pick wins, else face default.
- **Spoons:** `useShellStore((s) => s.spoons)` — composer placeholder softens at low spoons.
- **Role:** `flags.narrow` over `can()` narrows the available tools; `can(role,'create')` gates send.
- **Density:** compact on mobile, comfortable on desktop.

### Flows

**Flow 1 — First message**
1. Land → empty, composer focused, suggested prompts.
2. Type → send → user bubble appends (published to the bus).
3. `POST /api/chat/stream` → `message.started` → `message.content` (assistant) → `message.ended`.
4. The assistant bubble fills as events stream over `/api/bus/stream`.

**Flow 2 — Reload mid-turn**
1. Send → reload.
2. On mount, the thread store rehydrates the last N events from `/api/bus/events`.
3. The cursor is derived from the latest ledger id — never localStorage.
4. Live SSE resumes; dedupe by ledger id (no double-count).

**Flow 3 — The role gate**
1. `?role=viewer` → `can('viewer','create') === false`.
2. Composer disables with the read-only note; history stays readable.
3. `?role=operator` → composer enabled.

### States

| State | Visual | Behavior |
|---|---|---|
| **Empty** | Centered Lumi + composer | Composer focused |
| **Streaming** | Assistant bubble filling | Token meter live |
| **Done** | Bubble complete | Meter settles |
| **Error** | Red turn + Retry | Error names the cause |
| **Forbidden** | Disabled composer | Read-only history |

### Mobile (≤900px)

- `ChatShell` frame: header + chat body + the context/artifact drawer slides up.
- Composer sticky at the bottom; thread scrolls above it.

### Accessibility (WCAG 2.2 AA)

- Touch targets ≥ 24×24 CSS px (2.5.8).
- The thread is `role="log"` `aria-live="polite"`.
- The composer is a labelled textarea + button; focus visible at 3px.
- `prefers-reduced-motion` collapses streaming animations (the store already sets `--motion-scale`).

## Objective

Bind the P31 backend into a chat surface: `env.AI` turn generation, the bus
ledger as the source of truth, a stable ledger id on every message, and a
role/spoons/theme presentation selector — all composed inside canon `ChatShell`
(mobile) and the Wave 1 `Workbench` (desktop). Token-level virtual scrolling and
the `Thread`/`Composer`/`ToolBlock` primitives are **Wave 3**, not this wave.

## Inputs

| Field | Type | Source | Required | Default |
|---|---|---|---|---|
| `messages` | `{role,content}[]` | The thread store | yes | `[]` |
| `sessionId` | string | The thread store / URL | no | `crypto.randomUUID()` |
| `role` | `Role` | `useAdapters().identity.role` | no | `null` |
| `spoons` | number | `useShellStore((s) => s.spoons)` | no | `3` |
| `debug` | boolean | `?debug=1` (admin only) | no | `false` |

## Outputs

| Field | Type | Destination | Persisted |
|---|---|---|---|
| `messages` | `ChatMessage[]` | The thread store | yes (ledger) |
| `cursor` | `string` (ledger id) | The thread store | derived, not localStorage |
| `usage` | `{total_tokens,calls,cached}` | The token meter | yes (`model.usage`) |

## Procedure

1. **Read** `portals/shell/functions/api/forge/stream.ts` — the proven `env.AI` + write-queue pattern.
2. **Read** `portals/shell/functions/_lib/ledger.ts` — `append`, `rowToEvent`.
3. **Read** `portals/shell/src/bus/client.ts` + `src/bus/events.ts` — the transport seam.
4. **Read** `portals/shell/src/shell/{authz,flags,store}.ts` — role/flag/theme/spoon state.
5. **Read** `node_modules/@p31ca/design-core/src/compositions/ChatShell.tsx` — the mobile frame.
6. **Fix the seam** — `rowToEvent` stamps `id: String(row.id)`; `MessageContent` gains `role`.
7. **Create** `portals/shell/functions/api/chat/stream.ts` — `env.AI.run` multi-turn, emits `message.*` + `model.usage`.
8. **Create** `portals/shell/src/shell/chat/threadStore.ts` — messages keyed by ledger id, cursor derived from the ledger.
9. **Create** `portals/shell/src/shell/chat/streamClient.ts` — SSE subscribe with `AbortController`.
10. **Create** `portals/shell/src/shell/chat/useChatPresentation.ts` — role/spoons/theme selector.
11. **Create** `portals/shell/src/faces/chat/ChatFace.tsx` — composes `ChatShell` + `Workbench`; gates send on `can(role,'create')`.
12. **Register** `chat` in `App.tsx`.
13. **Run** `node scripts/gate.mjs --surface chat`.

## Specifications (postconditions)

- [ ] `rowToEvent` returns events carrying their ledger `id`
- [ ] `MessageContent` round-trips a `role`
- [ ] `functions/api/chat/stream.ts` emits `message.started/content/ended` + `model.usage`
- [ ] The thread store keys messages by ledger id, never index
- [ ] The cursor is derived from the ledger, never localStorage
- [ ] The composer gates on `can(role,'create')`
- [ ] The face composes canon `ChatShell` (no hand-rolled drawer)
- [ ] `node scripts/gate.mjs --surface chat` exits 0

## Acceptance criteria (runnable assertions)

| # | Assertion | Command | Expected |
|---|---|---|---|
| 1 | The surface gate passes | `node scripts/gate.mjs --surface chat` | exit 0 |
| 2 | Typecheck passes | `npm run typecheck` | exit 0 |
| 3 | Build passes | `npm run build` | exit 0 |
| 4 | Viewer cannot send | `node scripts/gate.mjs --check-role viewer chat` | exit 0 (open surface; send is a `create` check) |
| 5 | The seam fix shipped | `grep "String(row.id)" functions/_lib/ledger.ts` | match |

## Forbidden actions

- Do not create a new `Chameleon` component — canon's is already mounted by `ShellChrome.tsx`.
- Do not hand-roll the mobile drawer — use canon `ChatShell`.
- Do not use index keys for messages — ledger id only.
- Do not persist the cursor in localStorage — derive it from the ledger.
- Do not modify the `BusEvent` union's existing event shapes — `role` is additive-only.
- Do not add a dependency beyond what is already installed.

## Required from the user

- Confirm the audience: **operators + admins** (viewer is read-only).
- Confirm the model: the same `env.AI` binding the forge uses (non-streaming, single-shot per turn — token-level streaming is Wave 3).

## The canon contract

- **Frame:** `ChatShell` (mobile), `Workbench` (desktop), `GlassPanel` (context).
- **Conversation:** the thread store + `StageTrace`/`ReasoningBlock` (Wave 1).
- **Actions:** `Button` (primary send), `ApprovalGate` (Wave 3 consequential).
- **Metadata:** `StatusBadge` (turn status), `MetricBadge` (token meter).
- **Chrome:** `Chameleon` (theme), `SpoonDial` (spoons), `Starfield` (ambient) — all already mounted.