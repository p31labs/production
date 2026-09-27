# 13 — Command palette & crisis floor

Status: shipped (chunk 3 + design-core consolidation)

Two guardrails that keep the jar calm-to-touch everywhere:

## Command palette — `src/components/CommandPalette.tsx`

The surface **is** `@p31ca/design-core`'s `CommandPalette` composition — the
shell never reimplements chrome. `CommandPalette.tsx` is a thin *bridge*:
it owns the ⌘K/Ctrl+K trigger, builds mode-filtered items, and dispatches
selection; the composition owns filtering, keyboard nav, and the accessible
`role="dialog"` listbox. One qpj override: `.cmdk-item.is-active` reads on
`--p31-accent-contrast` rather than design-core's `--p31-void` — the latter
*is* defined (in design-core `base.css`), QPJ just prefers its family contrast
token on the accent row. See `docs/15-DIVERGENCES.md`.

- Global **⌘K / Ctrl+K** opens the jump menu; Esc or backdrop closes.
- Commands are mode-filtered (`qpjCommands(mode)`): doors a passenger's
  `canAccess(mode, minMode)` cannot reach are never listed. The palette is a
  fast door, **not** a PIN bypass — workshop/craft stay out of reach until
  mode rank allows, at which point `ModeGuard` remains the authority.
- Navigation doors come from `ROUTES`/`ROUTE_ORDER` (single source). Actions:
  `Rest the day` (refills jar + success notice) and `Switch lanes`, dispatched
  by the pure `runQpjCommand(id)`.

## Crisis floor — `src/components/CrisisOverlay.tsx`

> **Kept custom.** design-core's `CrisisOverlay` is a generic rest interstitial;
> QPJ's floor needs three agency actions + once-per-dip engagement. Full
> rationale: `docs/15-DIVERGENCES.md`.

- When spoons transition to **0**, a calm rest-stop dialog appears: "The jar
  is running low". Copy is deliberately non-punitive — the floor protects, it
  doesn't scold.
- Actions: **Rest the day** (primary, auto-focused) → `restartDay()` + refill
  notice; **Keep going** → dismiss without refill; **Switch lanes** → switch
  page. Esc and backdrop also dismiss.
- The overlay only re-engages after spoons climb back above 0 and fall again —
  it nags once per dip, never on repeat while still at the floor.
- Tokens only (`--p31-glass-*`, `--p31-accent-red`, existing Button
  `variant="primary"|"ghost"`); reduced-motion users get zero animation.

## Mounting

Both live in `App.tsx` beside `Toast`/`NotificationStack`/`Starfield`:
notifications at `z-index: 60`, crisis floor `65`, palette `70`.

## Tests

`src/__tests__/crisis-palette.test.tsx` — floor transition edge cases,
rest/keep-going semantics, re-engagement, palette open/filter/execute/
mode-gating, route execution.