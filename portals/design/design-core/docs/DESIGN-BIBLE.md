# P31 Design Bible

**Canonical home:** `production/portals/design/design-core` · **Version:** 2.2.0 · **Status:** Sovereign

## 1. Principles

1. **Spoon-aware by default** — every component respects `data-spoons="0…5"` on `<html>`. Motion, blur, and decoration scale down as energy depletes; at 0–1 the system goes still, opaque, and essential-only.
2. **Crisis is instant** — crisis CSS ships inline in every bundle. No lazy-loading, no FOUC (Decision 4A).
3. **One accent** — quantum cyan (`--p31-accent`) is the only primary accent. Semantic colors (danger/success/warning) exist for meaning, never decoration.
4. **Two weights only** — 400 body, 500 emphasis. Hierarchy comes from size and spacing, not weight.
5. **Glass is a token** — Pattern A: `--p31-glass-blur` holds a full filter function; components never hard-code blur values.
6. **Reasoning visible** — components carry design rationale; agents generate with cited constraints (see AGENTIC.md roadmap).

## 2. Architecture

```
tokens/      TS source of truth (color ramps, type, motion ladder, glass)
             ↓ scripts/gen-tokens.mts
generated/   CSS custom properties (committed, deterministic)
recipes/     class-level CSS (index.css pins cascade order)
primitives/  12 React components (the only place to build UI from)
compositions/ higher-level patterns (Topbar, SpoonDial, CrisisOverlay…)
mcp/         tool registry + stdio/HTTP servers for agent access
agentic/     intent DSL + agent pipeline (Phase 5+)
```

Cascade order (single import = `@p31/design-core/css/all.css`):
`base → tokens → layout → recipes(legacy sheet) → motion → typography → typography-scale → color-palette → forms → responsive → spoon-ladder → accessibility`

The deploy artifact `dist/design-system.css` is the same chain concatenated by the Vite plugin.

## 3. Hard invariants (violations reject in review)

- Touch targets ≥44px (`--p31-touch-min`); primary actions ≥48px.
- Contrast ≥4.5:1 everywhere; ≥7:1 for crisis-critical text.
- No animation at spoons 0–1. No infinite loops without reduced-motion + crisis kill switches.
- No pure white/black text or backgrounds. No opaque backgrounds on glass tiers at spoons ≥2.
- Every interactive primitive has visible `:focus-visible`.

## 4. The spoon cascade

| spoons | motion | glass | interaction |
|-------|--------|-------|-------------|
| 0 Crisis | none | none, opaque | essential-only |
| 1 Minimal | none | none, opaque | essential-only |
| 2 Low | 200ms | 4px | normal |
| 3 Moderate | 300ms | 8px | normal |
| 4 High | 150ms | 12px | enhanced |
| 5 Full | 100ms | 16px | full |

Source: `src/tokens/motion.ts` → `generated/spoon-ladder.css`. Components must never read spoon level in JS for styling — the cascade is pure CSS via custom properties.

## 5. Theming (Decision 1A)

Personas are overlays that re-map tokens only:

```css
@import '@p31/design-core/css/all.css';
@import '@p31/design-core/themes/rebel.css';    /* p31ca.org */
@import '@p31/design-core/themes/caretaker.css'; /* phosphorus31.org */
```

Never fork component CSS per site. If an overlay needs it, add the token first.

## 6. Testing doctrine

- Unit: token resolution, primitive behavior, intent parser (`pnpm -C design-core test`).
- A11y: axe-core on every primitive's canonical render (tests/accessibility.test.tsx).
- Visual: Playwright matrix at 375 / **768** / 1024 / 1440 × spoons {0, 3} (`e2e/design-system.spec.ts`).
- MCP probes: 13-tool contract check after any worker change.

## 7. Migration rule of thumb

Import primitives → delete local look-alikes → keep only persona overlay CSS locally. See MIGRATION.md.
