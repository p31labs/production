# P31 Sovereign Shell — Ambient Instructions

## Toolchain Invariants
- Direct binaries, not pnpm:
  - `./node_modules/.bin/tsc --noEmit` → exit 0
  - `./node_modules/.bin/vitest run` → all pass
  - `./node_modules/.bin/vite build` → succeed
  - `./node_modules/.bin/wrangler deploy` → deploy
- Verify suite: `NODE_PATH=/home/p31/node_modules node scripts/verify-shell.cjs` → ~186/186 (run twice before deploy).

## Crew
All experts are defined in `~/p31-agents/`. Invoke them by name, e.g. "Home Guardian, ..." or "Crypto Warden, ...".

| Agent | Surface |
|---|---|
| Home Guardian | Home + Dashboard command center |
| Bonding Steward | Bonding / social / gaming / rituals |
| Crypto Warden | Identity / wallet / PQC / KERI |
| Mesh Conductor | libp2p / WebRTC / sync / presence |
| Spaceship Navigator | Geodesic dome / spaceship |
| Sandbox Artisan | Vibe-coding / chat / artifacts |
| Research Curator | Zenodo / papers / visualizations |
| SOULSAFE Architect | Orchestration + 3-gate verification |

## SOULSAFE Protocol
All agents follow the SOULSAFE protocol (Paper XIX — Johnson, 2026): competence
boundaries, Red Board diagnostics, Objective Quality Evidence, zero-work
detection. Shared protocol block lives at `~/p31-agents/SOULSAFE.md` — do not
edit generated copies.

## Verify Hooks
`__P31_VERIFY__` is set by the verify suite. Hooks are exposed only when
`MODE !== 'production'` or `window.__P31_VERIFY__` is set.

## Design System (Lego Discipline)

All crew members are bound by this system. Deviating requires a design critique from Sandbox Artisan + SOULSAFE Architect approval.

### Card Footprint
- Max: 280px wide × 160px tall. Min: 140px × 100px.
- Content zones: header-strip (10px, top) → value (28px bold, center) → sub-label (12px) → graph (32px fixed, pinned to bottom via `margin-top: auto`).
- All cards in the same row must share the exact same height.

### Grid Discipline
- `grid-auto-rows: 154px` (fixed, not `minmax`) for dashboard and profile grids.
- Game page uses `grid-auto-rows: minmax(0, 1fr)` with a bounded `height: 100%` + `flex: 1; min-height: 0; overflow: hidden` chain so cards fill the viewport exactly and scroll internally when content overflows (no page scroll).
- Fixed column count (2 or 3), never `auto-fit`.
- Gap: 12px minimum, never more than 16px.
- Max 6 cards above fold per page.

### Color Tokens (Mandatory)
- All HTML/CSS colors use `var(--p31-*)` tokens.
- Zero hardcoded hex in production code except Canvas/Three.js.
- Run `grep -Er "#[0-9a-f]{6}" src --include="*.tsx" --include="*.css" | grep -v comment` before deploy — must return zero.

### Graph Anchoring
- All graph zones have `margin-top: auto` + `height: 32px`.
- Spoon gauge, sparkline, bar chart — all pinned to card bottom at same height.

### Design Gate (verify suite)
- [ ] Zero hardcoded hex colors in production code
- [ ] Max 6 cards above fold per page
- [ ] All graph zones anchored (margin-top: auto, height: 32px)
- [ ] Dashboard/profile grids use fixed px height; game page uses minmax(0, 1fr) with internal scroll

## Design Tokens
- `--p31-header-height: 61px` — headers flush at y=56, drawer overlays y=56→117.
- Glass opacity: `--p31-glass-bg: oklch(100% 0.01 75 / 0.10)`.

## Known Flakes (do not chase)
- a2ui `.glass-card` mount gate (cold start)
- Posner-24O `saw24O=false` load timing
- Zenodo feed returning 0 papers (environmental; research page now shows a Retry state and Zenodo is excluded from SW caching)

## SW / CSP invariants (do not regress)
- `wrangler.toml` sets `run_worker_first = true`; `src/worker.ts` serves `/sw.js` and `/workbox-*` with a CSP that omits `require-trusted-types-for 'script'` (it breaks workbox's `importScripts`, so the new-SW banner never clears).
- Zenodo (`https://zenodo.org`) must stay in `connect-src` in both `public/_headers` and `src/worker.ts`, or the research paper list goes blank.

## Gate Map
See `~/p31-agents/commands/gate.md` for the 3-gate protocol (`/gate` in
opencode and Claude Code).
