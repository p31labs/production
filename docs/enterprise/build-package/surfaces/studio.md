<!-- P31-HEADER
id: p31_surface_studio_20261005_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-05T00:00:00Z
owner: will
-->

# Surface: Studio

## Identity

- **Name:** UI Forge
- **Slug:** `studio`
- **Tier:** declarative
- **Audience:** Operators (neurodivergent creators, solo builders, small teams)
- **Purpose:** Turn a brain dump into a working artifact through a transparent,
  four-agent pipeline — every step visible, every decision inspectable.

## The MVP bar

A Studio is enterprise-market-ready when all six are true:

1. **A brain dump produces an artifact** — typed text → rendered surface, no dead ends
2. **Every agent step is visible** — Grounder/Dreamer/Shaper/Governor as collapsible
   blocks with one-line summaries and expandable reasoning
3. **The chat surface carries the run** — user message → agent stage blocks →
   artifact message, in one scrolling thread
4. **The artifact previews beside the chat** — the right panel renders the tree live
5. **The cost is visible** — the StageTrace header shows tokens, calls, cached tokens
6. **The surface is role-gated** — a viewer sees the fallback, an operator builds

## UX

### Screens

| Screen | Trigger | What renders |
|---|---|---|
| **Empty** | First load, no messages | Lumi orb + "Type a brain dump…" + the composer |
| **Running** | Composer submitted | The user message, then a live StageTrace block (agents appear one-by-one) |
| **Done** | `artifact.final` received | StageTrace collapses to `✓ 4 operations · 2.1s · show`; the artifact renders in the right panel |
| **Error** | `stream.end` reason `error` | The failing agent in red; a "Retry" button |
| **Forbidden** | `?role=viewer` | "This surface requires operator or above." |

### The 3-panel workbench

```
┌─────────────┬──────────────────────────────────┬──────────────────────┐
│ LEFT 16rem  │  CENTER flex-1                  │  RIGHT 22rem         │
│  Sidebar    │  Conversation                   │  Artifact Panel      │
│             │                                  │                      │
│  Faces      │  ┌─ user ──────────────────────┐ │  ┌────────────────┐  │
│  ▸ Studio   │  │  a calm spoon tracker…      │ │  │  GlassPanel    │  │
│  ▸ Docs     │  └─────────────────────────────┘ │  │   ▸ MetricBadge│  │
│  ▸ Sheets   │  ┌─ The agents are working… ▾ ─┐ │  │   ▸ Button     │  │
│  ▸ Slides   │  │  ⟳ Grounder · reading brief │ │  └────────────────┘  │
│             │  │  ⟳ Dreamer · 4 candidates   │ │                      │
│  Workspace  │  │  ✓ Shaper · 5 repairs       │ │  [Download][Deploy]  │
│  Identity   │  │  ✓ Governor · 2 admissible  │ │                      │
│  Mesh       │  └─────────────────────────────┘ │                      │
│  Family     │  ┌─ composer ─────────────────┐ │                      │
│             │  │  Type a brain dump…  [→]   │ │                      │
└─────────────┴──────────────────────────────────┴──────────────────────┘
```

### Flows

**Flow 1 — First build**
1. User lands on Studio → empty screen, composer focused
2. User types a brain dump → clicks "Build my surface" (or ⌘↵)
3. The user message appends; a StageTrace block mounts below it
4. Agents appear one-by-one: `⟳ Grounder · reading the brief · 3 facts · 1 gap`
5. Each agent row expands (click) to show its reasoning paragraph
6. On `artifact.final`: the StageTrace collapses; the artifact renders in the right panel
7. The right panel shows `Download` + `Deploy` actions

**Flow 2 — The approval gate**
1. If the pipeline emits `run.interrupted` (a consequential action), an `ApprovalGate` renders inline
2. The gate shows the reason, the risk level (medium/high), and Approve/Reject
3. On approve → `run.resumed` outcome `approved`; the pipeline continues
4. On reject → `run.resumed` outcome `rejected`; the pipeline stops cleanly

**Flow 3 — The role gate**
1. User navigates to `?role=viewer`
2. The shell's `FaceRoute` checks `canAccessSurface('viewer', 'studio')` → false
3. The `FaceForbidden` fallback renders: "Studio needs operator or above"

### States

| State | Visual | Behavior |
|---|---|---|
| **Empty** | Centered Lumi + composer | No scroll; composer focused |
| **Running** | StageTrace open, agents streaming | Auto-scroll to the newest agent row |
| **Done** | StageTrace collapsed, artifact rendered | Scroll position locked at the artifact |
| **Error** | Failing agent in red, retry button | The error text is specific |
| **Forbidden** | Fallback card | No composer; no stream |

### Mobile (≤900px)

- The left sidebar collapses to a slide-in drawer (`@starting-style`, `translate: -100% 0`)
- The right artifact panel becomes a full-screen overlay when an artifact exists
- The composer is sticky at the bottom; the thread scrolls above it

### Accessibility (WCAG 2.2 AA)

- Touch targets ≥ 24×24 CSS px (WCAG 2.5.8)
- The StageTrace block is `role="status"` `aria-live="polite"`
- The agent rows are `<details>` — keyboard-navigable, `aria-expanded` correct
- The resize handles carry `role="separator"`
- `prefers-reduced-motion` collapses the collapse animation (`--motion-scale: 0.01`)
- Every interactive element is keyboard-reachable; focus visible at 3px

## Objective

Rebuild the Studio face as a 3-panel workbench where the pipeline run renders as
a chat conversation, the artifact previews in the right panel, and every agent
step is a collapsible block with one-line summary + expandable reasoning.

## Inputs

| Field | Type | Source | Required | Default |
|---|---|---|---|---|
| `dump` | string | The composer textarea | yes | — |
| `title` | string | Derived (first 60 chars) | no | "Untitled surface" |
| `entities` | `{name, fields[]}[]` | The Grounder | no | `[]` |
| `actions` | `{name}[]` | The Grounder | no | `[]` |
| `k` | number | The Dreamer's candidate count | no | 4 |
| `role` | `Role` | The `?role=` query param | no | `null` |

## Outputs

| Field | Type | Destination | Persisted |
|---|---|---|---|
| `sessionId` | string | The bus ledger + StageTrace header | yes (ledger) |
| `events` | `ForgeEvent[]` | The conversation thread | no (transient) |
| `artifact` | `TreeNode` | The right panel | yes (via download) |
| `usage` | `{tokens, calls, cached}` | The StageTrace meter | yes (via `model.usage`) |

## Procedure

1. **Read** `portals/shell/src/faces/studio/StudioFace.tsx` — the current face (125 lines)
2. **Read** `portals/shell/src/faces/studio/forgeClient.ts` — the `runForge` client
3. **Read** `portals/shell/src/components/StageTrace.tsx` — the existing block
4. **Read** `portals/shell/src/components/ReasoningBlock.tsx` — the reasoning block
5. **Read** `portals/shell/src/shell/surface-registry.ts` — the role floors
6. **Create** `portals/shell/src/shell/Workbench.tsx` — the 3-panel `Group` layout
7. **Create** `portals/shell/src/shell/Workbench.css` — the geometry + mobile drawer
8. **Rewrite** `StudioFace.tsx` — the conversation timeline: user message → StageTrace → artifact message
9. **Wire** `StudioFace.tsx` — read `useAdapters().identity.role`; render `FaceForbidden` on `viewer`
10. **Wire** the artifact panel — render `renderA2UISurface(artifact)` in the right panel
11. **Install** `react-resizable-panels@^4` — the v4 API (`Group`, `Separator`, `useDefaultLayout`)
12. **Run** `node scripts/gate.mjs --surface studio`
13. **Run** `npm run build && npm run deploy`

## Specifications (postconditions)

- [ ] `portals/shell/src/shell/Workbench.tsx` exists and exports `Workbench`
- [ ] `StudioFace.tsx` renders a chat thread, not a card layout
- [ ] The right panel renders the artifact tree
- [ ] `?role=viewer` renders `FaceForbidden`, not the composer
- [ ] `node scripts/gate.mjs --surface studio` exits 0
- [ ] The deployed bundle contains `workbench` and `stagetrace`
- [ ] The deployed CSS contains `card-body{padding:24px}`

## Acceptance criteria (runnable assertions)

| # | Assertion | Command | Expected |
|---|---|---|---|
| 1 | The surface gate passes | `node scripts/gate.mjs --surface studio` | exit 0 |
| 2 | The build passes | `npm run build` | exit 0 |
| 3 | Typecheck passes | `npm run typecheck` | exit 0 |
| 4 | Viewer is forbidden | `node scripts/gate.mjs --check-role viewer studio` | exit 1 |
| 5 | The card fix is live | `node scripts/gate.mjs --surface studio --live` | exit 0 |

## Forbidden actions

- Do not modify `design-core/src/css/chrome.css` — the cascade fix lives in the shell
- Do not add a dependency beyond `react-resizable-panels@^4`
- Do not touch a surface outside `portals/shell/src/faces/studio/**` and `portals/shell/src/shell/Workbench.tsx`
- Do not modify the `ForgeEvent` union — `model.usage` is already defined
- Do not remove the `CardBody` wrapper from the empty-state cards

## Required from the user

- Confirm the surface's audience: **operators** (viewer is forbidden)
- Approve the tier: **declarative**
- Approve the panel split: **left 16rem · center flex · right 22rem**

## The canon contract

- **Frame:** `GlassPanel` (artifact preview), `GlassCard` + `CardBody` (list items)
- **Conversation:** the shell's `StageTrace` + `ReasoningBlock`
- **Actions:** `Button` (primary "Build my surface", ghost "Download")
- **Metadata:** `StatusBadge` (agent status), `MetricBadge` (token meter)
- **Chrome:** `Chameleon` (theme), `SpoonDial` (spoons), `Starfield` (ambient)