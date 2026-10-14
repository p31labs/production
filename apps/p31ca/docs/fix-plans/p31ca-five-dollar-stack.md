<!-- P31-HEADER
id: p31_fix_plan_p31ca_five_dollar_stack_20261013_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# fix-plan: p31ca.org "$5 stack" surface wave

**Discovered by:** agent:subagent:five-dollar-stack (task wave: comparison
page, public verify surface, $5-stack runbook, papers-on-pages)
**Discovered at:** 2026-10-13T00:00:00Z
**Severity:** low (new surfaces) + one stale constant (medium, live-404)

## The gaps

1. **No public price-comparison surface.** The hub's positioning ("the stack
   governments buy in bulk, rebuilt for the kitchen table") has no page that
   shows the honest arithmetic against published SaaS pricing.
2. **No public Loom verify surface on p31ca.org.** The Loom's hash-chained
   log has live public verify endpoints
   (`https://loom-verify.pages.dev/api/loom/verify`,
   `https://loom-verify.pages.dev/api/loom/provenance/:seq`), but the hub
   never links them from a page that a visitor can read and re-run.
3. **`loomVerifyUrl` in `src/data/p31-mesh-constants.json` is stale.**
   It points at `https://b30e37b5.loom-8z0.pages.dev/api/loom-public/verify`,
   which returns HTTP 404 live (2026-10-13). The Loom functions source
   (`apps/loom/functions/api/loom-public/verify.ts`) itself documents the
   live public surface as the `loom-verify` Pages project.
4. **No "$5 stack" deployment runbook.** The runbook story (one Workers Paid
   account runs the whole stack) is stated in prose but never written as
   steps a family/team could follow.
5. **Papers are not on Pages.** 22 DOI-verified papers exist in
   `src/data/p31-research.ts`; only two PDFs exist anywhere in the repo
   (`docs/grants/payloads/Paper_XII_v2.pdf`,
   `admin/P31_Consciousness_Memory_Architecture.pdf`). The research page
   links DOIs only; no local static assets.
6. **Paper-count drift (filed, not acted).** `docs/STRATEGIC-POSITIONING.md`
   proof block says "23 DOI-verified papers"; `src/data/p31-research.ts`
   contains 22. The strategy doc is locked; the count used on all new
   surfaces is `papers.length` (22) from the data source.

## The fix

- New page `/sovereign-vs-saas` — published competitor pricing (retrieved
  2026-10-13, each row with its source link) vs P31 architecture, our own
  costs stated as architecture math only.
- New page `/verify` — the Loom public verify surface: live server verdict,
  client-side SHA-256 (JCS) chain recompute against the provenance chain,
  honest unreachable state, plus the portal-shell bus ledger verify-chain as
  a second, clearly-labeled chain.
- New page `/runbook` — step-by-step "$5 stack" deployment on one Workers
  Paid account, with the included-allowance table and overage rates, linked
  to Cloudflare pricing docs.
- Papers: two real PDFs copied into `public/papers/`; all 22 DOIs remain the
  canonical links; R2 documented as the scale path for self-hosting all PDFs.
- Nav atoms (`compare` in the research act, `verify` in the action act),
  footer links, mesh-constants URL registry entries.

## Evidence (resolved)

### Surfaces shipped

- `/sovereign-vs-saas` — `src/pages/sovereign-vs-saas.astro` (comparison
  table `src/pages/sovereign-vs-saas.astro:86`, method block
  `:117-124`, closing line `:149`). Five rows, each competitor figure
  "published pricing, retrieved 2026-10-13" with the vendor's own pricing
  page linked; our costs stated as architecture math only.
- `/verify` — `src/pages/verify.astro`. Wired to the LIVE Loom public
  verify endpoints: `https://loom-verify.pages.dev/api/loom/verify`
  (server verdict) + `https://loom-verify.pages.dev/api/loom/provenance/:seq`
  (chain slice with raw `data` for in-browser recompute). The page replays
  SHA-256 over RFC 8785 canonical JSON of `{seq, ts, data, prev_hash}` —
  byte-identical to `@p31ca/canon/loom/hash-chain.ts` (proven before
  shipping: a Node run of the same algorithm reproduced head
  `90e0ba419a881dc1c75281c0e22842c135bb67f498e8e3824dae52921fa4faf8` from
  the live provenance chain). Honest states: verified / broken (names the
  seq) / unreachable ("We couldn't reach the ledger right now.").
  The portal-shell bus ledger (`GET /api/bus/verify-chain`,
  `https://p31-portal-shell.pages.dev`) is linked, not fetched — it sends no
  CORS headers for p31ca.org (verified 2026-10-13), and a blocked fetch
  would pollute the console. The Loom verify endpoint DOES allow
  `https://p31ca.org` (`access-control-allow-origin` confirmed live).
- `/runbook` — `src/pages/runbook.astro`. Steps 1–7 for one Workers Paid
  account; allowance/overage table (data `src/pages/runbook.astro:45-53`,
  rendered `:85-107`) from Cloudflare's published pricing docs retrieved
  2026-10-13, each row linked. Written as instructions.
- Papers — `public/papers/sovereign-stack-paper-xii-v2.pdf` (Paper XII,
  DOI 10.5281/zenodo.19782969) and
  `public/papers/consciousness-memory-architecture.pdf` (DOI
  10.5281/zenodo.19416491) copied from the repo's own PDFs; the other 20
  papers stay DOI-linked to Zenodo; R2 documented as the scale path.
  `/research` section added (`src/pages/research.astro:101-131`).
- Nav atoms — `src/lib/nav.ts:37` (`compare`, act in) and
  `src/lib/nav.ts:43` (`verify`, act through); LAB_ITEMS `runbook` entry
  `src/lib/nav.ts:55`; footer links
  `src/components/marketing/Footer.astro:22-24`.
- URL registry — pricing/docs URLs registered in
  `src/data/p31-mesh-constants.json` (verify-content-consistency gate).
- e2e — `e2e/five-dollar-stack.spec.ts` (prod-gated, prod-smoke pattern,
  console-clean sniffer per spike-appshell-field).

### Gate results (2026-10-13)

- `npm run prebuild` — all legs green: no-html-comments clean,
  ground-truth OK, content freshness OK, content consistency OK (38 pages),
  compliance drift in sync, neurodivergent clean, WCAG static clean.
- `npm run build` — 39 pages built; postbuild
  `check-neurodivergent --dist` (H1→H2→H3, no skips, ≤3 levels) and
  `verify-wcag22 --runtime` (2.4.11, 2.5.8, console) all pass.
- Deploy — `npm run deploy` green (deployment `ea3fc050.p31ca.pages.dev`).

### Live evidence (2026-10-13)

- HTTP: `/sovereign-vs-saas` 200, `/verify` 200, `/runbook` 200 (308→200
  trailing-slash redirect, normal Pages behavior); both PDFs 200
  `application/pdf`.
- Playwright prod pass — `e2e/five-dollar-stack.spec.ts` 5/5 green against
  p31ca.org, zero console errors on all four surfaces.
- `/verify` live DOM: "Chain verified — 16 records replayed by the server,
  head 90e0ba419a881dc1…", checkedAt live; after "Verify now": "Verified
  in your browser — 16 records replayed, recomputed head 90e0ba419a881dc1…
  matches the server verdict. This chain is intact."

### Findings filed for follow-up

1. ~~`loomVerifyUrl` in `src/data/p31-mesh-constants.json` points at
   `https://b30e37b5.loom-8z0.pages.dev/api/loom-public/verify` — HTTP 404
   live.~~ **CLOSED 2026-10-13** by the P0 wave
   (`docs/fix-plans/p31ca-inp-lighthouse-budgets.md`): the constant now
   points at the working public surface `https://loom-verify.pages.dev`;
   consumer sweep fixed `enterprise.astro`, `how-do-you-verify.md`, and the
   Access-gated link on `hire.astro`.
2. ~~Paper-count drift: `docs/STRATEGIC-POSITIONING.md` proof block says "23
   DOI-verified papers"; `src/data/p31-research.ts` has 22.~~ **CLOSED
   2026-10-13** by the same wave: proof block corrected to 22, and the
   wrong count was also swept off four live FAQ surfaces
   (is-p31-a-nonprofit, what-is-tetrahedron-protocol,
   what-is-the-care-economy, how-do-i-contribute). All live surfaces now
   derive from `papers.length` (22).