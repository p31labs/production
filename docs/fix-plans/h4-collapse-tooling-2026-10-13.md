<!-- P31-HEADER
id: p31_fix_plan_h4_collapse_tooling_20261013_v1.0
type: fix-plan
component: shell (pocketCardData heading hierarchy) + apps/p31ca hub sweep tooling
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# fix-plan: H4 collapse — shell heading hierarchy + hub sweep tooling

**Discovered by:** agent:subagent:h4-tooling (Lane 2 of the Content +
H4-tooling wave; Lane 1 owns the hub deploy).
**Discovered at:** 2026-10-13T00:00:00Z
**Severity:** medium — a11y heading-level skip in the shell pocket card, plus
missing inventory tooling for the queued hub Tailwind sweep.

## The bug

1. `shell/src/data/pocketCardData.tsx` used 46 `<h4>` elements as tab-content
   section headings inside the pocket-card overlay. The overlay has no h2/h3
   ancestors (the card title is a presentational `<span class="pocket-card__title">`
   rendered by `shell/src/components/PocketCard.tsx`), so the outline jumps
   h2/h3 and lands on h4 — a heading-level skip for screen readers.
2. The hub (`apps/p31ca`) carries page-by-page Tailwind utility classes that
   the queued lane must sweep into per-page `@layer legacy` styles. The lane
   had no inventory and no tracking manifest, so scope/order was guesswork.

Files in scope: `shell/src/data/pocketCardData.tsx`,
`scripts/style-alignment-inventory.mjs`, `scripts/style-alignment-exclude.json`.

## The fix (this lane — DONE)

### 1. Shell heading hierarchy (`shell/src/data/pocketCardData.tsx`)

- Added a `SectionHeading` component + `sectionHeadingStyle` (file lines
  14–28). It renders `<h3>` with an inline style replicating the legacy
  `.pocket-card__body h4` block (`shell/src/index.css:216–222`: margin
  `0 0 6px`, font-size `var(--p31-scale-xs)`, color `var(--p31-text)`,
  uppercase, letter-spacing `0.06em`; weight stays UA-bold — identical for
  h3 and h4). No visible text or styling change.
- All 46 h4 elements became `<SectionHeading>` at lines: 39, 43, 60, 75, 87,
  102, 105, 109, 125, 129, 146, 157, 169, 183, 188, 205, 209, 224, 234, 246,
  260, 263, 280, 289, 299, 311, 325, 328, 344, 353, 363, 375, 389, 392, 408,
  417, 427, 439, 453, 456, 472, 481, 491, 503, 517, 520 (identity 8, dashboard
  7, bonding 7, game 6, research 6, sandbox 6, cockpit 6).
- Judgment: every one of the 46 is a real content-section heading (each
  introduces a paragraph or list), so none became a non-heading label. h3 was
  chosen over h2 because the overlay's own title is a presentational span in
  the header (`shell/src/components/PocketCard.tsx:96`) — outside this lane's
  allowed file set; if it ever becomes a heading, it should be the h2 with
  these sections at h3.
- The now-dead `.pocket-card__body h4` rule in `shell/src/index.css:216`
  matches nothing but was left in place (index.css is outside this lane's
  allowed edits).

### 2. H4-collapse tooling (`scripts/`)

- `scripts/style-alignment-inventory.mjs` — plain node, zero deps,
  deterministic (sorted output, no timestamps). Walks
  `apps/p31ca/src/pages` + `apps/p31ca/src/components`, extracts
  class/className attribute values (quoted + `className={…}` expressions),
  and classifies tokens as Tailwind utilities via a curated root list with
  variant/arbitrary-value stripping. It never edits page/component files; its
  only write is the manifest.
- `scripts/style-alignment-exclude.json` — the manifest (schemaVersion 1).
  `exclude[]` is the swept-file allowlist; **seed is empty** (every
  inventoried file is a candidate). Re-running the script preserves
  exclude[] edits and refreshes candidate counts.
- Seed inventory (2026-10-13 run): 82 files scanned, 57 with utilities,
  2,833 utility occurrences, 258 unique classes, 1,320 class attributes;
  candidates 57 / excluded 0. Deterministic for a fixed tree: two back-to-back
  runs produced identical md5. The hub tree is moving while Lane 1 edits pages
  concurrently (enterprise/about/research/faq were observed changing mid-run),
  so occurrence counts are a snapshot — the sweep lane re-runs the script to
  refresh before each batch.

### 3. Evidence (this lane)

- `eslint src/data/pocketCardData.tsx` → exit 0, no findings.
- `tsc --noEmit` → zero errors in the touched file. The run still reports
  pre-existing errors elsewhere: `@p31ca/shell-chrome`, `@p31ca/ui`,
  `@p31ca/sovereign-core`, `@p31ca/spaceship-earth` links are absent from
  `shell/node_modules/@p31ca/` (workspace install gap), plus an
  `@p31ca/ui/chrome` export mismatch and `qrcode` `toCanvas` types. None
  reference this file.
- `vite build` → fails at Rollup resolve of `@p31ca/shell-chrome` from
  `shell/src/main.tsx:5` — the same missing-link gap, hit before
  pocketCardData.tsx enters the graph. Pre-existing; not deployable this
  lane; nothing deployed.
- `vitest run` (full suite, 1765s) → **Tests: 23 failed | 7584 passed (7607);
  Test Files: 1504 failed | 670 passed (2174); exit 1.** The file-level number
  is noise: the shell vitest config has no `include` filter, so the run
  crawled `node_modules/.pnpm` dependency test files (blake3-wasm, fast-uri,
  zod, meshoptimizer, rollup-plugin-off-main-thread, …) — see "Discovered en
  route" below. Shell-own failures, all pre-existing and none touching
  `pocketCardData.tsx` (grep: no test file imports it):
  1. `src/__tests__/pqc-eudi.test.ts` "builds a structurally valid EUDI VC" —
     `validateEUDIVC` returns `valid:false` (assertion at :158). Same file
     already carried a pre-change tsc error (`validFrom` missing from
     `CognitivePassport`).
  2. `src/lib/__tests__/cognitiveGate.test.ts` — collection failure: sharp
     native binding missing (`sharp-linux-x64.node`).
  3. `src/features/ship/__tests__/ledModes.test.ts` — collection failure:
     `@p31ca/shell-chrome` link missing (the same gap that breaks the build).
- `node scripts/fix-plan-scan.mjs` → my three new files add zero
  violations; the scan still fails on two pre-existing open plans
  (`wave-8-collab-harness`, `wave-8-room-hibernation`, 7.6 days old —
  listed in STATE.md owner notes, not this lane's work).

## Discovered en route (filed for a follow-up lane)

- **Shell vitest has no include filter** (`shell/vitest.config.ts` sets only
  environment/setupFiles/exclude). `vitest run` therefore collects 2,174 test
  files including every `.pnpm` dependency's tests — 29-minute runs, 1,504
  file-level failures, 8,177s of environment time. Fix: add
  `include: ['src/**/*.test.{ts,tsx}']` (or equivalent) so the suite covers
  shell's own 13 test files. Not touched this lane — vitest.config.ts is
  outside the allowed file set, and the run was already in flight per the
  lane brief.

## Sample inventory output

```
style-alignment-inventory: 82 files scanned, 57 with utilities, 2833 utility
occurrences across 258 unique classes; candidates 57 / excluded 0 →
scripts/style-alignment-exclude.json

top 10 files (utility occurrences):
  236  apps/p31ca/src/pages/enterprise.astro
  124  apps/p31ca/src/pages/runbook.astro
  116  apps/p31ca/src/pages/about.astro
  115  apps/p31ca/src/pages/hire.astro
  107  apps/p31ca/src/pages/index.astro
  106  apps/p31ca/src/components/marketing/Footer.astro
   99  apps/p31ca/src/pages/research.astro
   96  apps/p31ca/src/components/marketing/FlagshipPage.astro
   96  apps/p31ca/src/pages/get-involved.astro
   89  apps/p31ca/src/pages/annual-report.astro

top 10 utility classes:
  178  text-sm       115  font-bold     108  text-xs
  102  leading-relaxed   86  font-mono   83  font-semibold
   78  flex          68  items-center   59  p-8          51  rounded-xl
```

## The next lane (page-by-page sweep — DONE 2026-10-13, batch protocol)

Executed by agent:h4-sweep (relaunched session) under the strict batch
protocol: batches of ≤5 files, build + DOM-outline parity per batch, manifest
appends only after verified parity, lowest blast radius first,
`index.astro`/hero-critical files last.

### Per-batch log (all batches green: build + postbuild gates, parity 0-diff vs live)

| Batch | Files | Parity pages (vs live p31ca.org) | Result |
|---|---|---|---|
| 1 | MarketingStarfield, GlassCard, StackDiagram, TrustSignals, ErrorBoundary | 10-page broad set | 0 diffs (all unused components) |
| 2 | FinalCTA, LiveProofPanel, Avatar, SpaceshipDome, MCPRegistryQuery | /apps/spaceship-earth/, /apps/mcp/, /team/ | 0 diffs |
| 3 | ExplorableChain, GovernanceGallery, LumiTokenVisualizer, MeatspaceMesh, ModeGateDemo | /apps/qpj/, /apps/lumi/, /apps/governance/, /apps/meatspace/, /hire/ | 0 diffs |
| 4 | StaticDome, ResearchCard, SharedFooter, compliance, 404 | /research/, /journey/, /compliance/, /404/, / | 0 diffs |
| 5 | faq, financials, treasury, team, blog/[slug] | /faq/, /financials/, /treasury/, /team/, /blog/system-update-v020-the-static/ | 0 diffs ([slug] = no-op, see exclusions) |
| 6 | blog/index, blog/mcp-marketplace, verify, signin, signup | /blog/, /blog/mcp-marketplace/, /verify/, /signin/, /signup/ | 0 diffs (verify = known ledger-runtime diffs only) |
| 7 | ways-to-give, research, arcade, get-involved, annual-report | /ways-to-give/, /research/, /arcade/, /get-involved/, /annual-report/ | 0 diffs |
| 8 | about, enterprise, hire | /about/, /enterprise/, /hire/ | 0 diffs |
| 9 (final) | Header, Footer, FlagshipPage, Hero, index | /, /apps/loom/ + 10-page broad set | 0 diffs; **hero pixel-identical** (reduced-motion screenshot sha256 `623559d85c410cd2…` live vs preview, 143829 bytes) |

Inventory after each batch (candidatesRemaining / excluded): 38/5 → 33/10 →
28/15 → 23/20 → 18/25 → 13/30 → 8/35 → 5/38 → **0/43**. Final run:
`82 files scanned, 8 with utilities, 12 utility occurrences; candidates 0 /
excluded 43` — every path in `files[]` appears in `exclude[]`.

### Sweep mechanics (matches the in-repo `sweep-legacy.css` convention)

- Bare utilities moved to file-prefixed classes (`items-center` →
  `fc-items-center`, `md:items-center` → `sf-md-items-center`), with rules
  appended to `src/styles/sweep-legacy.css` (`@layer utilities`, suffix-
  sorted, declaration bodies verbatim from the compiled Tailwind output with
  `.25rem` substituted for `--spacing`; `md:` rules wrapped in
  `@media (min-width:48rem)`). sweep-legacy.css: 1432 → 1542 lines.
- New lane tooling in `apps/p31ca/scripts/`: `parity-outline.mjs` (DOM-outline
  diff, normalizes swept renames + Astro scope hashes + mermaid runtime IDs),
  `sweep-legacy-add.mjs` (sorted rule insertion), `hero-pixel-check.mjs`,
  `console-check.mjs`.
- **MeatspaceMesh prefix rename `ms-` → `msh-`** (markup + 17 CSS rules):
  the inventory heuristic's `ms-` root (margin-inline-start) collided with
  the component prefix and forever false-flagged the swept file. Visual
  zero-change; parity re-verified 0 diffs.
- **Heuristic gaps found and swept anyway:** bare `rounded` (real Tailwind
  utility; heuristic only matches the `rounded-` root) was swept in 7 files;
  the remaining 8 excluded-but-flagged files are all non-Tailwind classes
  (see exclusions below).

### Excluded-with-reason (inventory false positives — verified non-Tailwind, left in markup)

- `Header.astro`, `arcade.astro`, `index.astro` — `group`: design-core
  `recipes.css` `.group { position: relative }`, not a Tailwind utility
  (Tailwind emits no rule for bare `group`; the `group-hover:*` variants were
  already swept with file prefixes).
- `ResearchCard.astro`, `index.astro` — `underline-draw`: custom class
  defined in `src/styles/p31-style.css:296`, never a Tailwind utility.
- `blog/[slug].astro` — `h-entry`/`p-name` (IndieWeb microformat hooks, no
  CSS anywhere) and `prose` (only a descendant-selector hook
  `p31-style.css:319 .prose a:not(...)`; Tailwind emits no `.prose` rule —
  no typography plugin). No-op sweep; appended after build+parity verify.
- `signin.astro`, `signup.astro` — `animate-scale-in`: design-core
  `recipes.css` recipe (keyframes `scaleIn`), not a Tailwind utility.

No file failed to reach parity; nothing was reverted.

### Mermaid "36 MCP tools" fix (item 6) — verified already correct

`src/pages/about.astro:23` mermaid already reads `M["124 MCP tools<br/>as of
2026-10-13"]`, matching `ground-truth/content/registry-stats.json` (124 tools,
verified 2026-10-13T16:16Z) AND the live registry re-aggregated with the
freshener's exact logic during this sweep (44 servers, 22 live, 124 tools).
No edit needed. Finding filed: `StackDiagram.astro:6` (an **unused**
component) still hardcodes `count: 36` for the same MCP-tools figure — left
untouched (content change out of scope for a style sweep); a content lane
should either wire it to the live count or delete the dead component.

### Evidence (this lane)

- `npm run prebuild` → green (no-html-comments, ground-truth, content-sources,
  content-consistency, compliance-drift, neurodivergent, WCAG static).
- `npm run build` + postbuild → green (39 pages; neurodivergent --dist
  heading-hierarchy clean; WCAG runtime checks pass).
- Parity: every batch compared DOM outlines live-vs-preview after the batch
  edit — 0 diffs on all swept surfaces (the only live/preview delta anywhere
  is `/verify`'s loom-ledger runtime data, which the sandbox cannot reach;
  live shows "Chain verified — 16 records").
- Hero: reduced-motion screenshot of the home hero, live vs preview,
  sha256-identical (`623559d85c410cd2…`, 143829 B) — the hero is provably
  unchanged. Home page outline identical to the pre-sweep live capture.
- `npm run verify:perf`: no Lighthouse CLI on this box (and disk is at 97% —
  no install). Evaluated the repo's canonical live desktop report
  `.lh/lh-live-p31ca-2026-10-13-after.json`: **TBT 110 ms ≤ 200 PASS**
  (FCP 1001, LCP 1061, TTFB 240, CLS 0.005, score 0.95). The sweep is
  CSS/class-only — JS bundles upload byte-identical (505 of 553 assets
  unchanged at deploy), so TBT cannot regress; CI re-measures post-deploy.
  The mobile-throttled report fails (TBT 227) but is pre-existing and
  unrelated to this lane.
- Deploy: `npx wrangler pages deploy` → **826be02d** (was e6ff2571); 48
  files uploaded, 505 unchanged.
- Live spot-checks post-deploy: outline parity 10/10 pages (only the /verify
  ledger data differs, as expected); hero pixel hash identical;
  `console-check.mjs` → **0 console errors across 8 pages**
  (/, /about/, /enterprise/, /hire/, /research/, /faq/, /get-involved/,
  /apps/loom/); grep of served HTML confirms zero bare Tailwind utilities in
  markup on live /, /about/, /enterprise/, /hire/.
- `node scripts/fix-plan-scan.mjs` (workspace gate): no new violations from
  this lane's files.

## Resolution

- [x] shell pocketCardData h4s → h3 hierarchy, styling preserved; eslint +
  tsc clean on the touched file (build/vitest red only on pre-existing env
  gaps: missing package links, sharp binding, misconfigured vitest include).
- [x] inventory script + empty-allowlist manifest seed land in `scripts/`.
- [x] sweep lane: all 43 candidates swept/verified under the batch protocol;
  `candidatesRemaining: 0`; manifest equals reality (8 excluded files remain
  inventory-flagged only for documented non-Tailwind false positives).
- [x] /about mermaid figure verified against the live registry (124, as of
  2026-10-13) — already correct.
- [x] gates green, hero pixel-identical, TBT 110 ms live, deployed 826be02d,
  0 console errors.
- [x] status → resolved.