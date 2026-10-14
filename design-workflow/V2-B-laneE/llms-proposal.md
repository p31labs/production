# B-4 — llms.txt tier-contract additions (PROPOSAL — portal frozen)

<!-- P31-HEADER
id: p31_v2_b4_llms_proposal_20261011_v1.0
type: proposal (do NOT edit the portal)
component: design-workflow/V2-B-laneE
status: proposal — PENDING EXPLICIT HUMAN OVERRIDE (RB-SPINE-001)
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: half-sour
-->

Runbook v2.0 §5 B-4, §9 constraint 11 (portal freeze RB-SPINE-001). **The
portal's llms files were NOT edited.** This file contains the exact additions
proposed, marked PENDING EXPLICIT HUMAN OVERRIDE, for the human anchor to apply
once the freeze is lifted.

Target files (all copies in the portal build — apply to the `public/` sources,
`dist/` regenerates):

- `production/portals/design/public/llms.txt` (35 lines, short form)
- `production/portals/design/public/llms-full.txt` (67 lines, full form)
- (`dist/llms.txt`, `dist/llms-full.txt` are build outputs — do not hand-edit.)

Facts come from `production/design-workflow/B-device-tiers/device-tiers.json`
(the manifest contract — the same SSOT the DESIGN.md doctrine and the MCP tier
tools cite).

---

## Addition A — `public/llms.txt` (short form)

**Insert a new `## Device tiers` section between `## Foundations` (line 5) and
`## Components` (line 11):**

```markdown
## Device tiers

Capability → tier, never device brand. Manifest contract:
`production/design-workflow/B-device-tiers/device-tiers.json` (+ resolver
`device-tiers.mjs` — pure ESM, zero deps, fail-closed).

- embedded — Node Zero (ESP32-S3 + LVGL): `windowSizeClass: null`, no pointer/hover,
  `touchTargetMin: 44`, `navigation: minimal-html`, `delivery: [embedded-css, lvgl-c]`,
  SPIFFS assets partition, budget ≤ 100 KB gzip (web) / ≤ 8 KB raw (`p31_theme.h`).
- mobile — compact (<600dp): coarse/none, 44px floor, bottom-nav, css-mobile, safe-area.
- tablet — medium (600–840dp): mixed/mixed, 44px floor, nav-rail, css-full, safe-area.
- desktop — expanded (≥840dp): fine/hover, 34px floor under pointer:fine ONLY, sidebar, css-full.

Rules: tiers are semantic value swaps, never component forks (subset, not fork);
320px litmus with @media disabled; 44px touch floor on coarse; `dvh`/`svh`, no bare
`100vh`; pointer/hover are independent flags — surfaced, never collapsed (a 1200px
coarse device is desktop WITH `flags.coarse: true`). Unknown capability values fail
closed (TypeError → ask a human, never a guess).
```

## Addition B — `public/llms-full.txt` (full form)

**Insert a new `## Device tiers (manifest contract)` section after
`## Rules (non-negotiable)` (line 61):**

```markdown
## Device tiers (manifest contract)

Manifest schema pointer: `production/design-workflow/B-device-tiers/device-tiers.json`
(v1.0.0). Per tier: `windowSizeClass`, `pointer`, `hover`, `touchTargetMin`,
`navigation`, `delivery[]`, plus tier-specific `breakpointMinDp`/`breakpointMaxDp`
(viewport tiers), `safeAreaInsets` (mobile/tablet), `assetsPartition: spiffs` +
`maxGzipBytes: 102400` (embedded), and a `rationale`. Breakpoints also exist as DTCG
dimension tokens (`breakpoints.tokens.json`): compact 600px/37.5rem, medium
840px/52.5rem, expanded 1200px/75rem.

| Tier | Class | Width (dp) | Pointer/hover | Touch floor | Navigation | Delivery |
|------|-------|-----------|----------------|-------------|------------|----------|
| embedded | null | — | null/null | 44 | minimal-html | embedded-css, lvgl-c |
| mobile | compact | < 600 | coarse/none | 44 | bottom-nav | css-mobile |
| tablet | medium | 600–840 | mixed/mixed | 44 | nav-rail | css-full |
| desktop | expanded | ≥ 840 | fine/hover | 34 (fine-only) | sidebar | css-full |

Embedded budgets (enforced by `D-embedded/embedded-budget.mjs`): served web UI
≤ 100 KB gzip total (`maxGzipBytes: 102400` — SPIFFS `assets` partition discipline;
current bundle 2,960 B gz); LVGL theme header `p31_theme.h` ≤ 8,192 B raw.

Tier doctrine: tiers are semantic value swaps, never component forks — the embedded
tier is a subset of the same DTCG tokens (`gen-p31-theme.mjs` → `p31_theme.h`),
fewer of them, never hand-forked. Capability flags (coarse/fine/canHover) are
independent axes, surfaced never collapsed: the resolver returns them alongside the
width class and consumers reconcile the 44px floor per capability; unknown
pointer/hover throws (fail closed).
```

---

## Status

- [ ] **PENDING EXPLICIT HUMAN OVERRIDE (RB-SPINE-001)** — portal freeze. No file
      under `production/portals/**` was modified by this lane. The additions above
      are exact-insertion text; the anchors are `llms.txt:5-11` and
      `llms-full.txt:61-67`.
- [ ] After override: apply Additions A + B to `public/`, run `pnpm build` (the
      portal gate chain) so `dist/llms*.txt` regenerate, and re-run the B-1 matrix
      against the portal build (then the recorded fixture limitation retires).