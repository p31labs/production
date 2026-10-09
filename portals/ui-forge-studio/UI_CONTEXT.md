# UI Forge — Design Context & Chapter Content

Ground truth for generating or reviewing any UI in `portals/ui-forge-studio/src/`.
Read this before writing UI for the Forge. Verified against `src/App.tsx`,
`src/index.css`, `src/components/Lumi.tsx`, and `packages/canon/src/theming/theme-store.ts`.

## The five chapters

```
Ch0 Front Door → Ch1 Your Idea → Ch2 Your Brief → Ch3 Your Schema → Ch4 Your Surface
```

- **Ch0 Front Door** (`welcome`) — always greets first (never auto-enters prior
  work). If prior work exists (brief or schema or forgeResult), it shows a
  memory line — "You were working on <title>." — derived from `store.brief.title`,
  plus a quiet **▶ Continue** door that resumes at the highest chapter. No prior
  work → **▶ Start**.
- **Ch1 Your Idea** (`idea`) — one textarea + "Write my brief". Lumi is
  `thinking` while the brief is written.
- **Ch2 Your Brief** (`brief`) — the living card + a **visible refinement
  thread** (capped at 30dvh, scrolls internally) + the **clarifying-questions
  gate** (confidence-aware — `shouldClarify` triggers on medium/low confidence,
  i.e. a thin brief; every answer is optional with a Skip-all door; each answer
  becomes a `/api/refine` instruction) + "Show me my schema".
- **Ch3 Your Schema** (`schema`) — the **conversation timeline** (the glass box):
  - The pipeline run renders **inline in the chat flow** as a **StageTrace**
    block (the DeepSeek/Claude "thinking block" pattern): while streaming, each
    agent is a one-line blurb (`⟳ Grounder · reading the brief · 3 facts · 1 gap`)
    with a dropdown into the **paragraph-length `detail` prose** the engine emits
    (what each agent read, wrote, repaired, and decided). On completion the block
    collapses to a summary (`✓ 4 operations · 2.1s · show`).
  - The **agent's output message** below it renders the schema report — the
    compiler's input, gate, survivors, raw schema folded behind a `<details>`,
    and the artifact when present. This is the "glass box": the process is the
    product surface, not a hidden implementation detail.
  - The pipeline is **never-fail** (five tiers): intent → ground → dream →
    deterministic repair → best-effort fallback. Any input produces an artifact;
    the user chooses proceed or refine.
- **Ch4 Your Surface** (`surface`) — the rendered artifact + a **celebration
  beat** when the gate passes (Lumi `greeting` + a one-shot pulse ring, phase
  machine `waiting → celebrating → celebrated` driven by `animationend`).

Every interactive element carries the Loom's `data-agent-*` discipline
(`data-agent-kind`, `data-agent-action`, `data-agent-danger="none"`,
`data-agent-confirm="never"`).

## Design Tokens (CSS custom properties)

All colors resolve from `--p31-*` tokens. Reference as
`var(--p31-token, <literal-fallback>)`. Zero bare `hex`/`rgb()` strings in
`.tsx` files. The studio overrides the tokens to the canon's **`family`** theme
(the warm side) in `src/index.css`:

| Token | Value | Role | Research source |
|---|---|---|---|
| `--p31-bg` | `oklch(17% 0.03 55)` | warm near-black canvas | "the reading lamp, not the developer terminal" — warm dark is the 2026 premium pattern |
| `--p31-surface` | `oklch(23% 0.04 55)` | cards, panels | warm brown, not cool gray — "warm neutrals reflect natural materials" |
| `--p31-surface2` | `oklch(29% 0.045 55)` | raised surfaces, refine button | elevation reads as warmth |
| `--p31-accent` | `oklch(80% 0.16 75)` | amber — the one accent | "amber — glows, energy, activity"; accents glow, they don't vibrate |
| `--p31-accent-gold` | `oklch(83% 0.16 65)` | gold highlight | muted gold for emphasis |
| `--p31-accent-green` | `oklch(72% 0.16 145)` | gate pass wash | sage — natural, balanced success |
| `--p31-accent-red` | `oklch(68% 0.16 25)` | gate needs-revision wash | soft, never a red alert |
| `--p31-text-primary` | `oklch(97% 0.02 70)` | headings | warm off-white, softer than `#fff` |
| `--p31-text-secondary` | `oklch(82% 0.03 70)` | body, quiet doors | warm gray |
| `--p31-text-tertiary` | `oklch(60% 0.03 65)` | step label, placeholders | |
| `--p31-radius-full` | `9999px` | pills (buttons, inputs, gate) | "pill shapes welcome"; extreme radii eliminate sharp edges |
| `--p31-radius-lg` | `20px` | cards, textarea, surface | claymorphism: 20–28px on cards/buttons/inputs |
| `--p31-touch-min` | `48px` | minimum target | P31 canon family floor, above WCAG AAA |
| `--p31-touch-recommended` | `56px` | primary buttons | "generous padding and large hit targets" |

## Motion contract

- Every animation is **transform-only** and scaled by `--motion-scale`
  (`:root { --motion-scale: 1 }`, `prefers-reduced-motion: reduce` → `0.01`).
- Lumi's bob: `calc(3s * var(--motion-scale))` (6s when `calm`). Menu slides in
  `calc(0.2s * var(--motion-scale))`.
- Never a bare `cubic-bezier` spring — duration always multiplies `--motion-scale`.

## Accessibility contract

- Touch floor 48px; primary buttons 56px. 8px minimum spacing between targets.
- Every button carries a visible label or `aria-label` (the `☰` menu button,
  the textarea).
- Focus-visible outlines use `3px solid var(--p31-text-primary)` — warm, not cold.
- No red banners, no error codes, no flashing. Failure is a warm sentence + one
  way back.

## Viewport contract (the page never scrolls)

- The shell is `height: 100dvh` + Grid `auto auto 1fr` (header, step indicator,
  content). The content row is the scroll container (`min-height: 0;
  overflow-y: auto`) — the **page never scrolls**, only the content row does,
  and only when a chapter genuinely overflows.
- **Lumi scales by chapter:** 132 welcome, 96 idea, 40 inline in the workbench.
- The refinement thread is **capped at 30dvh** with internal scroll.
- The textarea is `6rem` min / `34dvh` max.
- The schema chapter is a **two-pane workbench** (activity | canvas) that stacks
  to one column below 640px.

## The never-fail pipeline (any input produces output)

The `/api/forge/stream` pipeline is five tiers: **intent → ground → dream →
deterministic repair → best-effort fallback**. Empty/garbage input synthesizes a
default brief; the Dreamer's candidates are always joined by **2 deterministic
catalog-walk trees** (admissible by construction), so a real renderable artifact
is the default — `tier: 'dream'` or `tier: 'catalog-walk'`, rarely `fallback`.
The user always has something to proceed with or refine — never a dead end.

**Event contract conformance.** The pipeline emits the frozen `ForgeEvent` shape:
`pipeline.stage` uses `status` (start/done); `agent.start` carries a `label`;
`agent.done` carries a real `durationMs`; `agent.result` carries a rich summary
("N facts · M gaps", "K candidates", "A admissible of M shaped", "R repairs");
`artifact.final` carries `tree` plus `tier` + `fellBack`. The ActivityPane and the
schema report read these — the live artifact lands in the store, not a dead end.

---

# Chapter 0 — The Front Door (`welcome`)

**Copy (exact):**

```
(Lumi — warm amber orb, idle bob)

Welcome to the Forge

You and the Forge are going to build something together.
Tell us what you have in mind — in your own words.

(if prior work)  You were working on Calm Dashboard.   ← memory line

[ ▶ Continue ]   ← prior work exists, resumes at the highest chapter
[ ▶ Start ]      ← no prior work
```

**The one button:** `▶ Start` / `▶ Continue` → enters the flow.

**Rationale (research-grounded):**
- The Loom's launchpad pattern — one character, one button, no chrome. The
  family research validates this as the "Atmosphere Principle": *"Interfaces
  should feel like a warm hug, not a corporate handshake."*
- The Dynamic Action Button pattern: one omnipresent control that changes
  meaning by context. Calm screens: *"Calm is not the absence of information;
  it is the absence of spatial confusion."*
- Family-tactile guardrail: *"Keep softness structured. Do not let blobs,
  depth, or color clouds erase hierarchy. Preserve accessible contrast."*
- Lumi is present but quiet — a presence, not a control room.
- **Always-greet:** the front door shows on every load. Prior work is a memory
  line + Continue, never an auto-enter. The warm front door is the reset's
  point; auto-resume would skip it.

**On a fresh visit there is no header** — no "UI Forge" wordmark, no ☰, no
step label. The chrome appears only once you're inside (the `screen !== 'welcome'`
guard in App.tsx). This is the Loom's level-1 discipline.

# Chapter 1 — Your Idea (`idea`)

**Copy (exact):**

```
(header: 28px amber dot + "UI Forge"   "2 of 5 · Your idea"   ☰)
(step dots: ● ● ○ ○ ○)

(Lumi — thinking while the brief is being written)

What do you want to build?

A calm dashboard, a task list, a shopping helper —
describe it the way you'd tell a friend.

[ textarea: "I want a calm dashboard for tracking daily spoons —
             a level meter, a task list, and a log action…" ]

[ Write my brief ]    ← the one primary button (enabled at > 5 chars)

Start over           ← quiet door
```

**The one button:** `Write my brief` → `POST /api/brief` (nl text → brief).

**Rationale (research-grounded):**
- Progressive onboarding = *"displaying information while giving the user the
  freedom to navigate"* — value first, setup only when needed.
- The textarea is the **only** interactive element. No settings, no model
  picker, no token inspector — those live in the ☰ menu, deferred until the
  user knows enough to need them.
- Claymorphism touch-first: generous padding, large hit targets.
- The copy is plain and warm — *"describe it the way you'd tell a friend"* — not
  "enter your specification." Jargon breaks the warm tone.

# Chapter 2 — Your Brief (`brief`)

**Copy (exact):**

```
(header: "Your brief"   "3 of 5"   ☰)

Here's your brief

┌────────────────────────────────────────┐
│ YOUR BRIEF (amber label)               │
│ Calm Dashboard (title)                 │
│ Track spoons and view their level.     │
│ Entities · spoon · task                │
│ Actions · log · complete               │
└────────────────────────────────────────┘

┌─ Refinement (the visible conversation) ─┐
│ "add a task entity"                (you) │
│ "Applied: track spoons and tasks." (Forge)│
└─────────────────────────────────────────┘

┌─ A couple of quick questions (thin brief only) ─┐
│ What should this surface show?        [___][OK] │
│ What should someone be able to do?    [___][OK] │
│ Answering is optional.          [ Skip all ]    │
└─────────────────────────────────────────────────┘

[ Make it better… (e.g. add a task entity) ][ Refine ]   ← quiet refine row

[ Show me my schema ]    ← the one primary button

Start over               ← quiet door
```

**The one button:** `Show me my schema` → `POST /api/schema` (brief → schema).

**Rationale (research-grounded):**
- Calm as a **spatial condition**: *"Consistent spacing creates trust because it
  implies the system has an internal logic. Alignment creates invisible rails.
  Proportion sets expectations for importance and sequence."*
- The brief card: warm surface (`--p31-surface`), soft radius, one amber label.
  Everything else warm neutral.
- The refine row is the **bidirectional sync** pattern: the agent updates the
  shared state (`studioStore`), and edits flow back. The refinement history is
  the conversation — appended, never replaced, now **visible** as a warm thread.
- Progressive disclosure = layers of depth the user controls: **brief is
  Layer 1**, schema is Layer 2, artifact is Layer 3. Each is earned.

# Chapter 3 — Your Schema (`schema`) — the two-pane workbench

**Copy (exact):**

```
(header: "Your schema"   "4 of 5"   ☰)

┌─ ACTIVITY (left, collapses when done) ─┐  ┌─ CANVAS (right) ────────────┐
│ Steps                                  │  │ (Lumi — thinking while the  │
│   intent ✓                             │  │  agents work)              │
│   ground ✓ · 3 facts · 1 gap           │  │ The agents are working…     │
│   dream running                        │  │ (or: Here's your schema)    │
│     ↳ repair: token (denger→danger)    │  │                            │
│   gate · pass                          │  │ [ the report + raw schema ] │
└────────────────────────────────────────┘  └────────────────────────────┘
```

**The one button:** `Show me my surface` → the stored artifact renders (no new
API call — the SSE stream already delivered `artifact.final`).

**The empty-artifact state (the never-fail fallback):**

```
The pipeline produced a starting point — refine the brief to make it yours.

[ Make the brief clearer ]    ← one button → back to Ch2
```

**The activity pane** is the live agent-work feed: SSE from `/api/forge/stream`,
ChainOfThought rows, auto-expand while running, **collapse to a summary when
done**. The agent's work *is* the progress indicator.

**The one button:** `Show me my surface` → the stored artifact renders (no new
API call — the `/api/schema` call already happened in Ch2's action).

**Rationale (research-grounded):**
- Calm as a **spatial condition**: *"Consistent spacing creates trust because it
  implies the system has an internal logic. Alignment creates invisible rails.
  Proportion sets expectations for importance and sequence."*
- The brief card: warm surface (`--p31-surface`), soft radius, one amber label.
  Everything else warm neutral.
- The refine row is the **bidirectional sync** pattern: the agent updates the
  shared state (`studioStore`), and edits flow back. The refinement history is
  the conversation — appended, never replaced.
- Progressive disclosure = layers of depth the user controls: **brief is
  Layer 1**, schema is Layer 2, artifact is Layer 3. Each is earned.

# Chapter 4 — Your Surface (`surface`)

**Copy (exact):**

```
(header: "Your surface"   "5 of 5"   ☰)

(Lumi — calm; greeting face + bright glow when the gate passes)

(pulse ring blooms once on entry when the gate passed)

Your surface is ready!      ← celebration (role="status") → then the title

┌────────────────────────────────────────┐
│ (the rendered component tree)          │
│ [ Gate · pass ]   ← soft sage pill     │
└────────────────────────────────────────┘

[ Start something new ]    ← the one primary button

Save or share it          ← quiet door → opens ☰ menu
```

**The celebration beat:** the Loom's phase machine (`waiting → celebrating →
celebrated`), driven by the pulse's `animationend` — reduced-motion collapses to
~instant with no separate code path. `role="status"` announces the passing gate.

**The ☰ menu (any chapter ≥ idea):**

```
Take it with you
  Download the brief (.md)      → briefToMarkdown
  Download the schema (.json)   → the instance schema
  Download the page (.html)     → buildDocHtml — warm, self-contained, family theme
  Download the record (.html)   → same export when no artifact — the record, not a page
  ──
  Start over                     ← soft red, resets the store
```

The HTML export is self-contained: it inlines the live CSS (or a warm fallback
of the family tokens when the live stylesheets can't be read), renders the tree
when an artifact exists, and always renders a legible warm record otherwise.

**Rationale (research-grounded):**
- Low-stimulus UX: *"stable environmental elements, low-contrast visual
  transitions, optional low-pressure activities."*
- The gate pill is the one piece of semantic color — a soft wash, not an alarm.
  `needs-revision` is a gentle `oklch(68% 0.16 25 / 0.18)`, never a red banner.
- Failure is warm: no error codes, no dead ends. The empty state always leads
  somewhere (the "empty state should always lead somewhere" micro-onboarding rule).
- Every menu row is 48px (the family floor).

---

## Color roles (from the family-design research)

| Color | Emotion | Usage in the Forge |
|---|---|---|
| Cream / warm off-white | Calm, warm | text-primary, backgrounds |
| Amber / gold | Glowing, energy | the one accent — buttons, active states |
| Peach | Friendly, inviting | (reserved) highlights |
| Sage | Natural, balanced | gate pass wash |

**The Forge uses one accent, not a rainbow.** This is the research's clearest
directive: *"Accented by a single muted amber/gold and anchored by a deep
roasted-coffee brown. No generic purple gradients."*

## Write constraint

Components are **read-only consumers**. Writes go through the store
(`setStudio`/`resetStudio`) or the API calls in `App.tsx`. Never `fetch` a write
from a component, never touch files or DOM writes directly.

## Canonical source

The design token source of truth is `packages/canon/src/theming/theme-store.ts`
(the `family` theme). The studio's `src/index.css` overrides to those values.
If the canon's `family` palette changes, update `src/index.css` to match.