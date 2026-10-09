# β Brief — UI Forge (the family-side studio)

**Owner:** `portals/ui-forge-studio/**`
**Reads:** `@p31ca/ui-forge/src/{center,grounder,dreamer,governor,shaper}.mjs`, `src/forge-schema.json`
**Writes:** `src/App.tsx`, `src/index.css`, `src/components/Lumi.tsx`
**Does not touch:** `packages/canon/src/theming/**`, `packages/ui-forge/**`, `apps/phos/worker-ai-proxy/**`

## Purpose

UI Forge is the family-side studio of the P31 canon: the place a person turns a
natural-language idea into a living UI surface — the same way the Loom turns a
session into a shared artifact. It is the Loom's sibling, not a developer tool.
It must feel warm, one-thing-at-a-time, and never clinical.

The four endpoints (`/api/brief`, `/api/refine`, `/api/schema`) are the engine.
This app is the face. The engine is cold; the face is warm.

## The one architectural decision

**The front door always greets; the chapter position is derived from the store.**
`App.tsx` keeps a local `started` flag (front door = welcome until the user
enters), then derives:

```ts
const screen: Screen =
  !started ? 'welcome'
  : !store.brief ? 'idea'
  : !store.schema ? 'brief'
  : !r ? 'schema'
  : 'surface';
```

Prior work (brief or schema or forgeResult) is surfaced on the front door as a
memory line — "You were working on <title>." — derived from `store.brief.title` —
plus a quiet `▶ Continue` door that resumes at the highest chapter. It is never
auto-entered; the warm front door is the point.

`studioStore.ts` persists to localStorage (`p31:ui-forge:studio`) and a storage
listener re-syncs a second tab. A half-finished flow grows, it never resets.

## The five chapters

| Chapter | Screen | The one button | Produces |
|---|---|---|---|
| 0 — Front Door | `welcome` | `▶ Start` / `▶ Continue` | — |
| 1 — Your Idea | `idea` | `Write my brief` | brief |
| 2 — Your Brief | `brief` | `Show me my schema` (clarify gate on thin briefs) | schema |
| 3 — Your Schema | `schema` | `Show me my surface` (or `Make the brief clearer` when empty) | artifact render |
| 4 — Your Surface | `surface` | `Start something new` | export |

Each chapter is one thing on screen. Everything else folds behind `☰` (the menu).

## Design gates (enforced by AGENTS.md + this brief)

1. **Family theme only.** `data-theme="family"` on `<html>` and the app shell.
   The canon's `family` palette: warm near-black `oklch(17% 0.03 55)`, amber
   accent `oklch(80% 0.16 75)`. Never cyan. Never `rebel`.
2. **No bare hex in `.tsx`.** Every color resolves through `var(--p31-*, fallback)`.
   The only literals live in `index.css` token overrides.
3. **One accent.** Amber is the only confident color. Everything else is warm
   neutral (`--p31-text-*`, warm surfaces). Gate tones are soft washes, never
   red alerts.
4. **48px family floor.** Every interactive element ≥ `--p31-touch-min` (48px),
   primary ≥ `--p31-touch-recommended` (56px).
5. **`--motion-scale` everywhere.** Motion is transform-only and scaled by the
   token; `prefers-reduced-motion` collapses to 0.01, never disables.
6. **Lumi is the face.** The orb lives on the welcome (default bob) and the
   surface (calm; greeting when the gate passes). Motion is the Loom's grammar.
7. **No dead ends.** An empty forge result (the known Dreamer run-dependence)
   must offer a warm way back — "Make the brief clearer" — never an error wall.
8. **data-agent-* on every interactive element.** Mirror the Loom's discipline
   (`data-agent-kind`, `data-agent-action`, `data-agent-danger`, `data-agent-confirm`)
   so the agent surface can trace the flow.
9. **The schema chapter is a report, not a success/failure screen.** It renders
   from `forgeResult` even when the artifact is null — showing the compiler's
   input, gate, survivors, and the warm retry below. Never a dead click.
10. **Clarify, don't guess.** When the brief is thin (no entities or no actions),
    pause and ask 1–2 targeted questions before schema compilation. Answering is
    always optional (Skip-all door); each answer is a `/api/refine` instruction.
11. **Validation-triggering CTAs, not disabled buttons.** The primary stays
    enabled and validates on press, showing a warm inline prompt (Cloudscape
    pattern) — a greyed-out button says nothing.
12. **The HTML export always renders legibly.** `data-theme="family"`, a warm
    fallback stylesheet when the live CSS can't be read, and a warm record (not
    a bare "No artifact.") when there is no artifact.
13. **The page never scrolls.** The shell is `100dvh` Grid `auto auto 1fr`; only
    the content row scrolls internally, and only when a chapter overflows.
14. **Lumi scales by chapter** — 132 welcome, 96 idea, 40 inline in the workbench.
15. **The pipeline never fails.** Any input produces output: intent → ground →
    dream → deterministic repair → best-effort fallback. The Dreamer's candidates
    are always joined by **2 deterministic catalog-walk trees** (admissible by
    construction) so a real renderable artifact is the default. The user chooses
    proceed or refine — never a dead end.
16. **The agents' work is live.** `/api/forge/stream` (SSE) streams conformant
    `ForgeEvent`s (`pipeline.stage` uses `status`; `agent.start` carries a label;
    `agent.done` a real `durationMs`; `agent.result` a rich summary;
    `artifact.final` carries `tree` + `tier` + `fellBack`). The ActivityPane
    renders them and collapses to a summary when done. The agent's work *is* the
    progress indicator. The live artifact is read from the stream's return value
    (never a stale closure) and lands in the store.
17. **The schema chapter is a two-pane workbench** — activity (collapses when
    done) | canvas (always visible). Stacks to one column on mobile.

## Grounding (verified against disk)

- `src/App.tsx` — the four-chapter screen machine, one button per chapter, the
  `☰` menu with `Download the brief/schema/page`.
- `src/components/Lumi.tsx` — copied verbatim from `apps/loom/src/components/Lumi.tsx`.
- `src/lib/studioStore.ts` — the cross-stage shared state (B1a), localStorage.
- `src/lib/exportBrief.ts` — `briefToMarkdown`, `downloadBrief`.
- `src/lib/exportDoc.ts` — `buildDocHtml` (renderToStaticMarkup of the tree).
- `src/renderer/registry.ts` — engine `type` → design-core composition; unknown
  types fall back to `UnknownBlock` (never crash).
- `src/forge-schema.json` — the bundled ui-schema the `/api/schema` function uses.
- `functions/api/brief.ts`, `refine.ts`, `schema.ts` — the four live endpoints.