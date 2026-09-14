# 16 — UI Polish Narrative

Status: reconstructed. The original narrative existed only as a conversation
artifact (`docs16-UI-POLISH-NARRATIVE.md.txt`) and was never persisted. This
file is the authoritative spec going forward. Each "unowned" item is scored
against the current codebase with file:line evidence.

## State as of `d8d0914`

Of the nine "unowned" items in the original narrative:

- **2 are VALID** — real deltas, still open (Workshop pin-dialog tokenization,
  PIN entry container)
- **1 is ABSENT** — WorkerChat has no empty state at all; worth creating
- **6 are STALE** — already resolved in the current code; they become
  regression guards in `triad-surfaces.test.ts`

---

## SiteShell (`src/components/SiteShell.tsx` + `App.tsx` chrome)

**What this surface is for:** the persistent frame for the family dashboard —
brand wordmark, active passport identity, route navigation, and the main viewport.

**What is actually on the screen:** the chrome is `qpj-topbar` (`App.tsx:60-90`):
wordmark left; right cluster holds the mode chip, SpoonDial, LOVE, **ThemeCharm**
(rendered inside flex `qpj-topbar__right`, `App.tsx:84`), VerifiedBadge, and
AvatarMenu. The page frame is `.shell` (`index.css:304`): `max-width: 980px`,
`margin-inline: auto`, `padding: 0 clamp(12px,3vw,24px) env(safe-area-inset-bottom)`
(`index.css:311-313`).

**Unowned items (from the original):**

| Item | Verdict | Evidence |
|------|---------|----------|
| Outer padding reads as a browser-default `16px` | **STALE** | `.shell` uses `0 clamp(12px,3vw,24px) …` (`index.css:313`) |
| Active tab uses a browser-default background block | **STALE** | No tab bar in QPJ; nav is the `qpj-topbar`, tabs live in design-core's routing shell |
| ThemeCharm floats `fixed; bottom/right`, no anchor | **STALE** | Anchored in flex `qpj-topbar__right` (`App.tsx:84`) |

---

## WorkerChat (`src/features/worker/WorkerChat.tsx`)

**What this surface is for:** a quiet room to give the worker a goal and review
what it drafted before approving an action.

**What is actually on the screen:** head (eyebrow + task count, autonomy
toggle group), composer (`worker-chat__composer`, `gap: var(--space-2)`,
`worker.css:47-51`), and the recent-task list. **When there are no tasks,
nothing renders** — there is no empty state.

**Unowned items (from the original):**

| Item | Verdict | Evidence |
|------|---------|----------|
| Composer/Delegate gap reads as a `gap: 8px` default | **STALE** | `gap: var(--space-2)` (`worker.css:49`) |
| Tool execution logs read as unstyled monospace | **STALE** | No raw `<pre>` for tool output; tasks render as inline rows with status glyphs |
| Empty state is a plain centered string | **ABSENT** | `WorkerChat.tsx:74` renders the list only when `recent.length > 0`; nothing when empty — **create a tokenized empty state** |

---

## WorkshopPage (`src/pages/workshop/WorkshopPage.tsx`)

**What this surface is for:** a protected workbench for building and inspecting
tools once access is verified by PIN (caregiver door).

**What is actually on the screen:** head (pickle-name title, mesh status),
tab nav (`wbench__tabs`), body. The hub shows `wbench__powers` (grid with
`gap: var(--p31-space-3)`, `workshop.css:125-138`) and `PinChangeCard`.
The locked gate is the `pin-dialog` overlay (`PinDialog.tsx`).

**Unowned items (from the original):**

| Item | Verdict | Evidence |
|------|---------|----------|
| Locked gate uses a stock modal with heavy blur | **VALID** | `.pin-dialog` overlay uses raw `backdrop-filter: blur(6px)` (`index.css:1672-1675`) — not the token `var(--p31-glass-blur)` used elsewhere (`index.css:450,548,882,1688`) |
| Vertical rhythm uses `margin-bottom: 24px` stacks | **STALE** | `wbench__powers` is a grid with `gap` (`workshop.css:125-138`) |
| PIN entry sits as isolated form elements, no container | **VALID** | `.pin-change__form` (`PinChangeCard.tsx:58`, index.css `pin-change` block) is a bare flex column with no visual container |

---

## Divergences recorded

- **Token namespace split.** SiteShell and WorkerChat use design-core's
  `--space-*`/`--radius-*` scale; Workshop uses the QPJ-local `--p31-space-*`
  scale. Both are canonical on their own surfaces. Do not unify without a
  decision record in `docs/15`.
- **There is no tab bar in QPJ.** The original narrative's "active tab
  indicator" item described a UI primitive QPJ doesn't use; nav is a topbar
  with route links. The item is scored STALE, not silently deleted.