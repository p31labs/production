<!-- P31-HEADER
id: p31_fix_plan_marketplace_h2_content_density_20261012_v1.0
type: fix-plan
component: portals/mcp-marketplace
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: marketplace-h2-content-density (H2 — composition density)

**Discovered by:** agent:subagent:heuristics-h2 (research verdict: the portal
fails "too sparse" on the H2 content-density heuristic)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** medium (UX standard; gate-enforced)
**Plan ref:** `docs/plans/mcp-marketplace-hub-runbook.md` (H2 wave)

## The gap

The portal's five public routes read as sparse: one header, one grid, done.
The research fix is **composition density, not more words** — "substance with
structure": live stats, step strips, summary rows, and empty states that
teach the next action. Every new string must stay 5th-grade plain
(`scripts/plain-language-scan.mjs`) and every grid must stay ≤7 cards
(`scripts/check-cognitive-load.mjs`).

## The work (this session, single writer, per route)

1. **HOME** — hero sentence under PageHeaderV2, a LIVE stats row computed
   from the registry catalog (N servers · M live · T tools — checked X
   minutes ago) with graceful fallback ("We couldn't check right now."), a
   3-step "How it works" strip (Find → Try → Share, one line each), the
   existing 3 cards, and a featured row of up to 3 real catalog servers
   (each with an Open button). Two grids, each ≤7.
2. **DISCOVER** — a stats bar ABOVE the filters ("Showing N servers · M
   live · T tools"), and the badge legend moved BELOW the grid as a
   collapsible "What the badges mean" disclosure.
3. **SERVER** — the summary row above the tabs is reordered to lead with
   the four storefront facts (status pill, tool count, last checked, price
   tier); PriceTierBadge is now rendered. Install stays the default tab.
4. **PLAYGROUND** — one-sentence intro; the no-server state becomes an
   EmptyState with a "Pick a server" CTA that focuses step 1; the no-tools
   state becomes an EmptyState ("No tools here yet.") with a "Browse the
   catalog" CTA; the helper console's empty state gains a "Pick a server"
   CTA.
5. **PUBLISH** — step 1 gains a "What you'll need" checklist (a name, a
   one-line description, the address where it lives — about 2 minutes).

## Verification

- `pnpm typecheck` / `lint` / `test` (24/24) / `build` / `v:gate` green.
- `node /home/p31/production/tools/canon-audit/canon-source-audit.mjs --target portals/mcp-marketplace` → 0 forks.
- `node scripts/plain-language-scan.mjs` + `scripts/check-cognitive-load.mjs` green.
- `node scripts/raw-element-gate.mjs` + `scripts/canon-lint.mjs` green.
- `node scripts/render-gate.mjs` vs production after deploy → exit 0.
- Deploy via `scripts/deploy.mjs`; live-check 200 + assets.

## Evidence

- **Home** (`src/features/marketplace/HomeSurface.tsx`): hero subtitle
  "Your family's toolbox, checked for you." (:93); live stats row computed
  from the full unfiltered catalog via `listServers()` + `computeStats()`
  (:25-34, :57-77, :96-102), fallback "We couldn't check right now." (:97);
  "How it works" 3-step strip (:104-119); the 3 cards (:121-135); featured
  row `featuredRow.slice(0, FEATURED_MAX)` of real catalog servers with Open
  buttons (:137-146). Two grids, each ≤7.
- **Discover** (`src/features/marketplace/DiscoverSurface.tsx`): stats bar
  above the filters "Showing N servers · M live · T tools" (:61-66); badge
  legend as a closed `<details>` "What the badges mean" below the grid
  (:102-112).
- **Server** (`src/features/marketplace/ServerSurface.tsx`): summary row
  now leads with status pill → tool count → last checked →
  PriceTierBadge (new import, rendered :95) before the rest of the badge
  stack (:91-108). Install stays the default tab.
- **Playground** (`src/features/playground/PlaygroundSurface.tsx`,
  `components/LlmConsole.tsx`): one-sentence intro (:157); no-server
  EmptyState "Pick a server to begin." with a CTA that focuses step 1 via
  `#playground-server-select` (:176-193); no-tools EmptyState "No tools
  here yet." with a "Browse the catalog" CTA → `#/discover` (:224-254);
  LlmConsole's empty state gains a "Pick a server" CTA (`onPickServer`,
  LlmConsole.tsx :12, :33, :177-186).
- **Publish** (`src/features/publish/PublishSurface.tsx`): step 1 gains the
  "What you'll need" checklist (name, one-line description, address —
  about 2 minutes) (:154-161).

### Gates (all green)

- `pnpm typecheck` ✓ · `pnpm lint` ✓ · `pnpm test` 24/24 ✓ · `pnpm build` ✓ · `pnpm v:gate` PASS (5 packages) ✓
- `plain-language-scan.mjs` ✓ (240 strings extracted) · `check-cognitive-load.mjs` ✓
- `raw-element-gate.mjs` ✓ · `canon-lint.mjs` ✓ · `canon-source-audit.mjs --target portals/mcp-marketplace` ✓ (0 forks)
- `render-gate.mjs` vs production: 30/30 cells clean, exit 0 (first run's 1280px
  "load failed" cells were post-deploy CDN flake; clean on retry).

### Deploy + live

- Deployed via `portals/mcp-marketplace/scripts/deploy.mjs` →
  https://e28e34ca.p31-portal-mcp-marketplace.pages.dev (production alias
  https://p31-portal-mcp-marketplace.pages.dev).
- Live-check: root 200; `assets/index-C5ciQHiH.css` 200,
  `assets/index-DGbG3hG2.js` 200, `assets/react-vendor-dgengZBm.js` 200.
- New H2 strings confirmed present in the served bundle (hero sentence,
  stats fallback, "How it works", "What the badges mean", "No tools here
  yet.", "Pick a server to begin.", "What you'll need").