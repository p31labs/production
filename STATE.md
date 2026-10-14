<!-- P31-HEADER
id: p31_state_20261004_v1.0
type: state
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
-->

# STATE.md — The Persistent Brain

The cognitive prosthetic. A fresh agent reads this and knows exactly where the
work is, what's blocking, and what's next — without any chat history.

## Current Focus

**"Better for $5" wave — DONE 2026-10-13, both lanes.** Lane 2
(registry+fleet): conformance probe + badge live, DO reference doc,
fix-plan resolved. Lane 1 (hub): /sovereign-vs-saas + /verify + /runbook +
Papers-on-Pages live at p31ca.org. See Last Handoff. **Follow-ups filed:**
4 conformance remediations (protocolVersion omission, x402 header
enforcement, spaceship-relay ping, legacy-era 2026 contract) + 2 hub
findings (stale `loomVerifyUrl` 404, 22-vs-23 paper-count drift). Next
queued: Lighthouse/INP budgets, AI-visibility content wave, Astro 7/Vite 8
spike, H4 collapse, housekeeping. Honesty rails held: competitor prices
cited with sources; our costs = included-allowance math only. Contract:
`apps/p31ca/docs/STRATEGIC-POSITIONING.md`.

## In Flight

**Phase 3 + ops wave (launched 2026-10-14, three lanes):**
- Lane 2 (topbar + LED) DONE — see Last Handoff. Shell vitest now
  **148/148** (was 144/4); tsc 24→13; vite build passes Topbar; next
  blocker = shell-chrome rollback class (filed, owner).
- Lane 3 (secrets/ops) DONE — see Last Handoff.
- Lane 1 (hub Batch 1 adoption + IRS dates) STILL RUNNING.
- **D7:** commit the tree AFTER Lane 1 lands green (with the
  git-add -f exception for the two secret-ops docs).

**Owner queue (remaining):** leg C store placement (smoke ready); cfut
roll; Access activation (middleware prepped); wave-8 fix-plan-scan;
placeholders policy; durable shell-workspace install; shell-chrome
rollback class (next shell build blocker).
**Trivial:** StackDiagram "36"; pqc.ts keygen; SiteNav Crown size;
three-skew @types; LED single-source unification.
**Filed (non-blocking):** field INP vs lab harness cross-check; drift
baseline promotion to blocking after 2026-10-21.

## Blockers

- **Smoke leg C** (LOVE-settled paid path through the gateway): the gateway
  is now DEPLOYED (v bc43b27a, 2026-10-12) via the new IP-locked token
  `/home/p31/.secrets/cf-gateway-deploy.token`; leg C still needs the
  plaintext `LOVE_AUTH_SECRET` (Secrets Store zero-read) — owner runs leg C
  or coordinates a rotation.
- **Disk at 97%** (5.6G free). Remaining big recoverable items need human
  decisions: the two stale reference blobs (p31-cortex 6.9G, andromeda-archive
  6.8G) want archiving to Google Drive via rclone — which isn't installed and
  needs the user to set up OAuth.
- `workers (1)` is the FULL 173-worker fleet, NOT a duplicate — `workers/` is a
  stale 2-worker subset. The diff-before-delete rule caught this. Do NOT delete
  `workers (1)`.

## Open Loops

- [x] W1–W10: runbook v1 (harness, sensors, tetrahedron faces, ownership)
- [x] W11: veto gate + taxonomy (11/11 destructive caught)
- [x] W12: CAS store (lib/cas.mjs)
- [x] W13: soft-delete (lib/softdelete.mjs + check)
- [x] W14: hash-chained ledger (lib/ledger.mjs + verify-chain)
- [x] W15: Ed25519+ML-DSA approval token (lib/token.mjs)
- [x] W16: housekeeping v2 (soft-delete + CAS + token + verify-chain)
- [x] W17: wired into pnpm gate (11 gates green)
- [x] W18: pnpm approve CLI
- [x] W20: negative controls (6/6 pass)
- [ ] W19: agent passport (Ed25519 session identity) — partial (ledger has actor field)
- [ ] M1–M10: fleet layer (worktrees, task ledger, leases, merge, dashboard)
- [ ] W9 tail: disk below 90% needs Will (rclone + stale blobs)

## SSOT token consolidation (parallel paths — separate arc)

- [x] Path A: flip — `tokens.css` deleted, design-core rewired to `@p31ca/canon/tokens.css`, parity gate green (33/33)
- [x] Path P: staged SSOT shard (805 files: packages/canon + design-core + docs/fix-plans) — NOT committed
- [x] Path W1: fixed 2 install poisons (canon-mcp, ui-react) → `file:../design-core`
- [x] Path W3: `.sha512` vendor manifest refreshed (matches tarballs)
- [x] Path N (shipped): 14 NaN sites in `src/css/*` fixed
- [x] Path M1: pre-sync migration guard in `sync-vendor.mjs`
- [x] Dead trees deleted: `src/styles/`, `src/recipes/`, `src/themes/` (unexported)
- [x] S2 = a: `portals/design/pnpm-workspace.yaml` (standalone workspace root)
- [x] `allowBuilds` (esbuild/sharp/workerd) in root `pnpm-workspace.yaml`
- [x] **W2**: `portals/design` 3-way merge resolved (package.json, vendor tarball, 3 PNG snapshots)
- [x] **S1**: committed SSOT shard `0be3bbe` (683 files: canon + design-core + docs)
- [x] **W2 commit**: `a4fd3d8` (package.json + vendor tarball + 29 snapshots)
- [ ] **Pre-existing portal changes**: 82 files still staged (test-results, components, vendor) — not SSOT, needs review
- [ ] **Vendor naming migration**: `p31-ui-1.3.1.tgz` → `p31ca-ui-1.3.1.tgz` (pre-existing tarball name drift)
- [ ] **Repo-wide machine paths**: 34 files still reference `/home/p31/production` — filed `repo-wide-machine-paths.md`
- [ ] NaN tail: `recipes-data.ts` (7), generator adapters (4), `generated-wc` (1), `semantic-token-manifest.json` (4)
- [ ] Theme-ID drift: `packages/shared/src/theme/ids.ts` (9 IDs) vs `theme-store.ts` (5)
- [ ] Path B (dead tokens, DTCG `$deprecated`) + Path C (26 contract over-claims)
- See `docs/enterprise/design-system/design-core-inventory.md` + `docs/enterprise/build-package/runbooks/ssot-parallel-paths.md`

## Last Handoff

**2026-10-14 — Topbar/LED lane DONE. Lane 1 (hub Batch 1) still running.**

**Lane 2 (D5 — professional clean):**
- **LED registry** `packages/shell-chrome/src/ledModes.ts`:
  `LED_MODES` (rainbow/pulse/solid/off) + `LED_MODE_MAP` shader map +
  `ledUniformsFor(source, frozen)` with NeoPixelFrame-uniform math;
  pulse aliases the breath shader; exported additively from shell-chrome
  (both consumers already import there — zero re-points). **ledModes
  tests 4 failing → 4/4 PASSING**, assertions untouched; the `toEqual`
  now parity-locks the registry to the dome shader every run.
- **Topbar redesign (§8):** `shell/src/components/Topbar.tsx` re-pointed
  to the REAL canon topbar (`@p31ca/design-core/compositions` slot
  model — the one portals/workspace + mcp-marketplace already consume;
  no API fabricated). Contract held: 5 primary items, 3 action icons
  (≤5), more-menu with aria states, brand/center/statusCluster/trailing/
  identity slots, rendered once on the persistent wrapper.
  `shell/src/index.css`: recipes import restored, `scroll-padding-top:
  var(--p31-header-height)`, shell-owned geometry only.
- **Verdicts:** vitest **148/148** (was 144/4); tsc **24 → 13** (Topbar×3
  + ledModes×3 + LedSource resolved; remainder pre-existing); vite build
  PASSES the Topbar resolution — next blocker is the predicted
  shell-chrome rollback class (DomeGeometry… — implementations gone
  repo-wide, nothing to re-export), filed not chased.
- Fix-plan `p31ca-topbar-led-2026-10-14.md` resolved.

Next: Lane 1 report (hub Batch 1 + IRS dates); then D7 commit (with the
`.gitignore` git-add -f exception) → Astro spike unblocks.

**2026-10-14 (earlier) — Secrets/ops lane DONE. Lanes 1 (hub Batch 1) + 2 (topbar/LED) still running.**

**Lane 3 (D3+D4):**
- `scripts/mirror-secrets.mjs` — zero-dep, manifest-driven, `wrangler
  secret bulk` (wrangler 4.112.0 supports it), dry-run default, `--yes`
  gate, values via stdin only, redaction PROVEN (fake-value run shows
  `[REDACTED]`), audit log 0600. Two manifests shipped (gateway +
  rotator).
- Secrets Store migration guide — `secret-rotation-runbook.md:111` new
  §: create-once → bind-everywhere → rotate-once, .dev.vars parity,
  dual-credential window, owner-marked steps. Key inventory →
  `docs/enterprise/operations/secrets-inventory.md` (6 items, owners,
  cadence).
- `scripts/legc-smoke.mjs` READY — C1 health, C2 paid settlement
  end-to-end ($0.01, gateway blinded → ledger signed → bridge verified
  both CBS challenges = the settlement evidence), C3-C5 auth negatives.
  Negative control run (fake secret): fail-closed exactly as designed.
  Owner runs it once the store has the real secret.
- Access prep — `access-middleware-prep.md` (Pages plugin scaffold per
  the workspace pass-through pattern, 6-step owner activation; env vars
  only, no gate-code change).
- Fix-plan resolved + 7-item owner checklist. **Catch for D7:** 
  `.gitignore:18` `secret*` silently ignores the two new secret-ops docs
  — commit needs `git add -f` for both.

Next: Lanes 1 + 2 reports; then the D7 commit with the gitignore
exception; then Astro spike unblocks.

**2026-10-14 (earlier) — Phase 1+2 DONE. One token core + full wrapper library + parity proof + drift detector live.**

**Phase 1 (verified, one in-lane fix, nothing reverted):**
- `build:tokens` green; **337 = 337** custom-property names preserved vs
  the legacy anchor; value deltas restricted to the ratified set (Lexend
  sans/display, topbar-height alias, ADDED rose scope carrying the live
  p31ca values verbatim incl. the hue-28 quirk — ledgered honestly);
  radius anchor already 16/24.
- One red fixed in-lane: `validate:contracts` broke because the
  `var()` alias is non-portable — flat alias re-emitted at the nested
  path (gen-tokens.mjs:296-318), no validator edits. Full canon build
  green; design-core tsc 0 + tests 101/101.
- Rollback conditions RC1-5 audited — none fired; the two reds were
  completed, not rolled back.

**Phase 2 (built fresh):**
- `packages/canon-parts/` — recipes (100% `var(--p31-*)`) + shared
  markup.mjs: ONE markup tree for the full canon-v2 set with a byte-exact
  React 19 server-serializer emulation.
- `packages/canon-astro/` (23 server-only components, named slots via
  Astro.slots.render) + `packages/canon-react/` (23 React 19 components,
  `__handlers` wire interactivity).
- **Parity: 49/49 cells byte-identical, exit 0** — real .astro vs
  renderToStaticMarkup; one wrapper-pair fix (rest-key order), no
  carve-outs. Zero drift across the three packages.
- `scripts/token-drift-check.mjs` — apps/p31ca baseline: **613
  re-declarations + 2660 literals** (top: p31-fluid.css,
  delta-hiring assets, AppShell.spike archive, global.css rose override
  → swap to data-theme). `--no-fail` for the baseline week, promotion
  per runbook Phase 5.
- Both fix-plans resolved with handoff notes (adoption order,
  deprecation timeline, drift ledger).

Next: Phase 3 adoption — needs the owner's go + the per-surface accent
call (rose theme on the hub vs cyan everywhere). Lexend/radius/header
changes ride with adoption. Batch rollback: >2% screenshot diff ⇒ revert.

**2026-10-13 (earlier) — Estate unification wave: BOTH LANES DONE.**

**Lane A (hub badge removal + unification, deploy b8e137d8):**
- Root cause: `FlagshipPage.astro:79` rendered LiveProofPanel ("Live in
  production") as the SECOND CELL of the hero's 2-col grid on all 8
  /apps/* pages — the card pinned the text column left under a centered
  hero. Panel + grid deleted from markup (LiveProofPanel.astro kept on
  disk, now unrendered); `● Live` pill + meta row removed with it; data
  retained in flagships.ts.
- Unification via the shared chain: container → 56rem (about/team width),
  hero → SectionHeader level-1 left-aligned, centered serif h2s →
  start-aligned sans, explore wrapper removed, capabilities keeps
  data-p31 grid; /enterprise container matched too.
- Live @1440: /about /team /apps/cli /apps/loom /apps/lumi
  /apps/spaceship-earth /enterprise all measure x=272 w=896, h1 x=296
  start — identical geometry. 0 console errors, e2e 5/5, inventory 0
  candidates. Fix-plan resolved.

**Lane B (Phase 0 audit):** 12 new files (token-inventory, page-audit,
PAGE-CONTRACTS.md, runbook, 4 templates). Top drift: `--p31-accent` 4
identities; radius 3 forks; font 4 families (canon DTCG-vs-CSS bug);
37/39 hub pages + 2/2 phos31 views violate ≥1 contract; phosphorus31 has
zero routable pages.

Next: OWNER ANSWERS to the five drift decisions → Phase 1 (DTCG token
core, Style Dictionary v5) + Phase 2 (full wrapper library) launch.

**2026-10-13 (earlier) — Phase 0 audit DONE. Lane A (badge/unification) still running.**

**Lane B (Phase 0):** 12 new files, zero edits to existing code:
- `docs/enterprise/design-system/token-inventory.md` — 20 token sources;
  top-5 drift: `--p31-accent` has 4 identities (cyan vs live rose vs
  theme-p31ca cyan vs emerald phos31); radius 3 forks; neutral hue war
  270 vs 75; header height 3 names/values; 4 font families (canon's own
  DTCG and CSS exports disagree — a bug).
- `docs/enterprise/design-system/page-audit.md` — 37/39 hub pages + 2/2
  phos31 views violate ≥1 contract (C1 container ×24, H1 header ×19, G1
  grid ×7, B1 badge ×9). Flagged pages map: Stack→/enterprise,
  tools→/apps/loom, ask→/apps/lumi, scene→/apps/spaceship-earth,
  CLI→/apps/cli — the 4 flagship pages inherit the LiveProofPanel badge
  + `● Live` pill. phosphorus31 has ZERO routable pages.
- `docs/enterprise/design-system/PAGE-CONTRACTS.md` — five grep-checkable
  contracts: CONTAINER C1-C4, HEADER H1-H4 (start default; center only on
  /, /research, /arcade), GRID G1-G5, BADGE B1-B4 ("in production" prose
  is content, not a badge).
- `parallel-paths-enterprise-runbook.md` + `templates/` (astro-surface,
  portal-surface, page-migration, token-propagation).
- Five drift decisions + recommendations delivered (accent hue, radius
  scale, header name, font, phosphorus31 disposition) — awaiting owner.

Next: Lane A report; then the owner answers the five drift decisions →
Phase 1 (DTCG token core, Style Dictionary v5) + Phase 2 (full wrapper
library) launch.

**2026-10-13 (earlier) — Visual/nav fix wave DONE (deploy ca15f091). All six owner complaints fixed + live-verified.**

- **1 Centered/aligned:** /enterprise hero `data-align` → `start` (the
  e6ff2571 reference contract; live geometry proved it). Centering chain
  already canon-correct elsewhere (page-max 80rem + margin-inline:auto).
- **2 Card grids:** canon recipe generalized in `p31-style.css:208-241` —
  `[data-p31="grid"][data-cols]` + `[data-even]` (1fr rows, flex-column,
  footer pin per ADR §15) + breakpoint collapse; applied to 13 surfaces;
  home 4→3 fix (empty 4th track). Live: research 3-col equal 410px rows.
- **3 Dome:** PERSISTENT CANVAS overlay `#p31-dome-host`
  (MarketingShell.astro:158-161) with `data-astro-transition-persist` on
  the wrapper div (never the island — React #423/#425 rule); mounts once
  per session, survives swaps (probe id persists across navs); boot
  client:idle + static frame, loop on first interaction or 15s fallback;
  `webglcontextlost` preventDefault/restore; Starfield offscreen pause.
  Live: 2 canvases on / and /about, hidden on non-dome pages.
- **4 Duplicates:** data duplication, not listeners — Workspace was in
  both PRODUCTS and DOORS (removed from PRODUCTS); trailing-slash hrefs
  canonicalized; AbortController + astro:after-swap island teardown in
  CanonTopbar + JourneyNav (ClientRouter leaks stale document listeners).
- **5 Research/docs collision:** `nav.ts:36` pointed docs → /research and
  no /docs route existed → NEW `src/pages/docs.astro` + nav → /docs/.
- **6 Theme switcher:** cycleTheme updated store but never applied
  data-theme to DOM → applyTheme() wired; SSR-safe dot via
  `var(--p31-theme-dot)`; before-swap + after-swap re-apply. Live: works
  on first click, survives 3 navs.
- **verify:perf:** TBT 0 → 52 ms ✓ (≤200), score 0.98 → 0.94 ✓ (≥0.9),
  FCP 853→1158, LCP 888→1331, CLS 0. Honest caveat filed: an always-on
  WebGL loop cannot meet TBT ≤200 under headless SwiftShader (the
  reference itself measures 36.4s) — hence the idle static-frame +
  interaction/15s loop gate.
- 19/19 live checklist, 0 console errors across 8 pages, hero byte-
  identical, e2e 5/5 (hub-smoke/prod-smoke 5 passed / 10 documented
  skips / 0 failed). Fix-plan `p31ca-visual-nav-fix-2026-10-13.md`
  resolved.

Next: owner queue only — leg C awaits the secret's location; rotator
owner actions; cfut roll; Access; Topbar/ledModes; IRS dates; commit.

**2026-10-13 (earlier) — Key rotator DONE (dry-run only). Lane 1 (visual/nav) still running.**

**Lane 2 (in-house key creator/rotator):**
- `scripts/key-rotate.mjs` (zero-dep): `generateKey()` 32-byte base64url
  via Web Crypto (:68); `backup` captures `wrangler secret list` verbatim
  to `.secret-backups/` (0600 — never stores values); `rotate` puts the
  value via STDIN ONLY (:232, never argv), requires `--yes` (exit 2
  otherwise), `--dry-run` skips Cloudflare; dual-credential window
  summary + rollback printed.
- `workers/p31-key-rotator` (zero-dep, deployed): GET /health (never leaks
  values), POST /genkey + /rotate behind `authGate()` (X-Rotator-Token vs
  owner-set ROTATOR_SHARED_SECRET, constant-time compare, 503 when
  unprovisioned). Honest boundary: /rotate states it cannot run wrangler
  and emits the operator CLI command.
- Runbook `docs/enterprise/operations/secret-rotation-runbook.md`:
  dual-credential procedure, 24h default window (1h–72h), vault rollback,
  owner-executed boundary, future ML-DSA-65 path.
- **Dry-run evidence (full transcript in fix-plan):** owner OAuth confirmed
  (workers write); worker deployed; P31_ROTATOR_SMOKE put → listed →
  CLI dry-run → real rotate with --yes (health 200, window + rollback
  printed) → TEST SECRET DELETED, list `[]`. **No production secret
  rotated or listed-for-value.**
- Fix-plan `p31-key-rotator-2026-10-13.md` RESOLVED. Owner actions filed:
  set ROTATOR_SHARED_SECRET, confirm gateway dual-credential support,
  then run the runbook for LOVE_AUTH_SECRET.

Next: Lane 1 report (six owner complaints) when it lands; leg C pending
the owner telling us where the in-house secret lives.

**2026-10-13 (earlier) — RUM wiring DONE (prod 5fdfe864). RUM loop closed end-to-end.**

- **web-vitals 6.2.3 vendored** (`src/lib/web-vitals-v6.ts`, 9,976 B,
  unpkg UMD, byte-exact; sha256 `775a8535…` upstream / `599ec114…`
  vendored) — no npm, no lockfile mutation.
- **Wiring** (`MarketingShell.astro:28` import, `:202-254` inline IIFE):
  onINP/onLCP/onCLS/onFCP/onTTFB → sendBeacon queue to
  p31-rum /collect; payload = name/value/page/ts ONLY; pagehide retry;
  https guard for local previews.
- **Two honest deviations (documented):** (1) sendBeacon hardwires
  credentials:include → JSON bodies are CORS-blocked pre-flight (proven:
  first deploy 3b45cda7 = 4 console errors/load, zero rows) → switched to
  `text/plain` simple requests (collector parses JSON body regardless;
  privacy contract untouched); (2) https-only guard keeps e2e/local clean.
- **Live loop evidence:** /summary count 7 (seeds) → 21 → 31; INP 2→10,
  CLS 3→4, LCP 2→3, FCP/TTFB 0→2. **Field INP p75 = 123 ms (n=10)** —
  under the 200 ms budget; no yieldToMain action needed. Gates green, e2e
  5/5, 0 console errors. Fix-plan `p31ca-rum-wiring-2026-10-13.md`
  RESOLVED (deploys 3b45cda7 → 5fdfe864).
- Filed non-blocking: cross-check field INP vs lab harness once volume
  grows.

**Full arc (2026-10-13):** "$5 stack" surfaces → conformance probe +
badge + 12/12 fleet → Lighthouse budgets + dome TBT 38 680→110 ms (score
0.95) → signin real auth → e2e honesty → catalog relabel → content wave
(real quotes, sourced stats) → shell h4s + legacy html → H4 sweep 43 files
(hero sha256-identical) → shell env/contract repairs → comparison refresh
(Stacklok 5%, 42,753 registry, Mordor, DO 99.3%) → INP lab harness
(honest no-action) → RUM collector + wiring (field INP 123 ms). 
`mcp:health` 16/16 + `verify:perf` green throughout. Queue = owner
decisions + commit-blocked Astro spike only.

**2026-10-13 (earlier) — Content-refresh + RUM wave, BOTH LANES DONE.**

**Lane 1 (content refresh, deploy 321b8ac3):**
- /sovereign-vs-saas + /enterprise carry the **42,753** registry figure
  (2026-10-13) with Forkast's framing ("connectivity is abundant, trust is
  unverified"); Mordor observability line ($1.23B → $1.68B → $8.62B,
  38.69% CAGR, compliance-mandate angle); DO 99.3% tool-matching line
  ("their bet is tool-matching; ours is governance — same problem,
  different layer"). 3 new sources registered, all linked.
- **Paragraph pass verdict: all four pages KEPT first-sentence** — every
  candidate paragraph is either a question-answer lead or a 40-60w
  answer-first block where the answer must lead; moving sentences would
  break the contract and hurt 5th-grade readability. Documented per file.
- Honesty corrections: Forkast DO byline 2026-09-23 (not 09-22); web-vitals
  latest is now **6.2.3** (2026-10-05), superseding 6.1.1.
- e2e five-dollar-stack 5/5; gates green; fix-plan
  `p31ca-content-refresh2-2026-10-13.md` resolved.

**Lane 2 (RUM collector):** workers/p31-rum live (d5419ccc), D1
`p31-rum` (`988b037b-…`), privacy contract mechanically enforced,
7/7 live checks, collector fix-plan resolved, wiring spec open.

Next: final hub lane executes the wiring spec (vendored web-vitals 6.2.3 +
sendBeacon) → closes the RUM item end-to-end.

**2026-10-13 (earlier) — Final hub wave DONE (deploy 3bf74ad3). Agent-executable queue empty.**

- **AI-visibility scale-out:** /verify (49w lede + question H2s + research
  anchor card: P31 Labs, EIN 42-1888158, Genesis DOI 10.5281/zenodo.
  19411363, Tetrahedron DOI 10.5281/zenodo.19004485, 22-paper community),
  /treasury (48w lede + money-flow TABLE + EIN who-runs bullets),
  /accessibility (53w lede + question H2s + bullets), /hire (51w lede,
  offer cards → table, unpadded). Meltwater 75% NOT used (unconfirmed).
- **/enterprise governance thesis live:** "The governance layer is the
  product" section (`enterprise.astro:186-242`) — 47w block, 5-row table
  (41/86/9/5/49), Stacklok + Forkast cited, one-liner + /runbook /verify
  links.
- **INP:** CommandPalette now carries yieldToMain (toggle :29-37, FAB
  :122-126, search onChange :173-180) — the only unyielded surface is
  closed. web-vitals NOT installed (root lockfile frozen; RUM wiring +
  collector endpoint stay infra/owner items — filed honestly, no beacon
  without an endpoint). Fix-plan `p31ca-inp-measurement-2026-10-13.md`
  → resolved.
- Deploy 3bf74ad3 live; 5 pages 200; e2e five-dollar-stack 5/5 (7.8s);
  CommandPalette 0 console/page errors; gates all green.
- Fix-plan `p31ca-content-scaleout-2026-10-13.md` resolved.

**Full arc (2026-10-13, one day):** "$5 stack" surface (/sovereign-vs-saas,
/verify, /runbook, papers) → conformance probe + badge + 12/12 remediated
fleet → Lighthouse budgets + INP yields + dome TBT 38 680→110 ms (score
0.95) → signin wired to real auth → e2e honesty pass → catalog relabel (5
non-MCP) → content wave with real quotes/sourced stats → 46 shell h4s + 12
legacy files → H4 sweep 43 files to @layer legacy (hero sha256-identical)
→ shell env + contract repairs → comparison refresh with Stacklok 5%
governance gap → INP lab harness (honest no-action verdict) → content
scale-out + governance thesis. `mcp:health` 16/16 and `verify:perf` green
throughout. All claims cited; all numbers live-read.

Next: owner decisions only (leg C, cfut roll, Access wiring, Topbar,
ledModes, IRS dates, wave-8 plans, RUM endpoint, placeholders policy) +
commit the tree to unblock the Astro spike.

**2026-10-13 (earlier) — Post-research wave, both lanes done.**

**Lane A (comparison refresh, deploy 59b0bd29):**
- Stacklok governance-gap block between H1 and table (verbatim wording
  carries 41% headline / 86% experimenting / 9% ungoverned / 5% governed /
  49% security blocker; sources Stacklok + Forkast 2026-07-28). "78%"
  appears nowhere.
- DO Agent Droplets row (Pro $50 covering ≈$58.82 at 15% off, Team $200
  covering $250 at 20%, launched 2026-10-01) + Bedrock row (v2 committed
  baseline $0.0997/$0.0132 headline, footnote vs v1 $0.0895/$0.00945 and
  v2 consumption $0.1276/$0.0169; NAT gateway ≈$33/mo idle).
- Registry numbers verified (44/22/124, already correct). Closing line
  survives. Six new source URLs registered, all 200. e2e console clean.
- Honesty corrections: Forkast byline 07-28 not 07-27; Builder Center
  idle-cost article is Apr 2026 (cited without month claim).
- Fix-plan `p31ca-sovereign-refresh-2026-10-13.md` resolved.

**Lane B (INP harness — the honest headline):**
- `apps/p31ca/scripts/measure-inp.mjs` + `e2e/inp-harness.spec.ts` (web-vitals
  ABSENT → zero-dep PerformanceObserver collector, interactionId grouping).
- Per-surface lab p75: CommandPalette 1072, LedController preset 368,
  JourneyNav toggle 984 / select 488, theme 856; knobs/spoons sub-16ms
  unobserved; marketplace surface-unavailable (registry fetch refuses lab
  host).
- **Verdict: lab numbers are environment-dominated, NOT app violations** —
  same interaction swung 912→3936 ms across 4 runs; headless WebGL
  software rendering inflates durations; ambient windows show 0 long
  tasks. No code changes from this data; CommandPalette is the only
  unyielded surface → field-data candidate. Real INP = field RUM
  (web-vitals RUM + a collector endpoint = filed infra item).
- Fix-plan `p31ca-inp-measurement-2026-10-13.md` OPEN with the table.

Next: final hub wave in flight (content scale-out + governance surface +
web-vitals wiring + CommandPalette yield). Then owner items only.

**2026-10-13 (earlier) — Shell contract-repair lane DONE. All agent-executable waves complete.**

- **CSS re-points (build unblocked):** `shell/src/index.css:1` →
  `@p31ca/canon/tokens.css` (exports-map verified); `:5` →
  `@p31ca/design-core/css/chrome.css` (shell-chrome ships no CSS);
  canon symlink hand-created. CSS pipeline green — 2,870 modules.
- **API drift (additive only):** StarfieldBackground → local component
  (11 phantom props stripped, zero runtime change); StarfieldField →
  additive export in spaceship-earth; ThemeId/AgeTier/setTheme/setAge →
  shell's real `src/store/useThemeStore.ts` (6 files); qrcode shim gains
  the real toCanvas overload; CognitivePassport phantom validFrom/
  validUntil removed from the test fixture (assertions untouched, 25/25).
- **tsc:** 42 → 25 lines, all accounted. **vite build:** fails only at
  Topbar.tsx:10 (filed, owner decision). **vitest:** identical 144/4
  (ledModes only) — no new failures.
- **Dispositions:** protobufjs + node-datachannel are REAL deps (left;
  placeholder strings = owner policy); dead `pnpm.overrides` REMOVED from
  shell/package.json.
- **Scope audit:** 14 files + 1 symlink, all in-scope; STATE/INBOX/AGENTS/
  apps/workers/portals/design-core/canon/ui/shell-chrome untouched.
- Fix-plan `shell-env-repairs-2026-10-13.md` §8 appended; open items
  honest (Topbar, shell-chrome rollback class, ledModes, three-skew,
  SiteNav Crown size, pqc.ts 0-arg keygen).

**Arc summary (all of 2026-10-13):** "Better for $5" surface
(/sovereign-vs-saas, /verify, /runbook, papers) · conformance probe +
badge + 12/12 remediated fleet · Lighthouse budgets + INP fixes + dome TBT
38 680→110 ms (score 0.95) · signin wired to real auth · e2e honesty pass ·
catalog relabel (5 non-MCP entries) · AI-visibility content wave (real
quotes, sourced stats, honesty fix) · 46 h4s + 12 legacy html files · H4
sweep 43 files to @layer legacy (hero sha256-identical) · shell env +
contract repairs. mcp:health 16/16 throughout; verify:perf PASS.

Next: owner decisions (Topbar restore/redesign, ledModes a/b/c, leg C,
cfut roll, Access wiring, wave-8 plans, IRS dates) + commit the tree to
unblock the Astro spike.

**2026-10-13 (earlier) — H4 sweep COMPLETE (batch protocol worked).**

- **9 batches, all builds green, all parity checks 0-diff vs live:**
  43 candidate files swept → utilities moved to `@layer legacy`
  (`sweep-legacy.css` 1432→1542 lines) or canon components;
  **candidatesRemaining: 0**. 8 excluded-but-flagged files are documented
  non-Tailwind false positives (group, underline-draw, h-entry/p-name/prose,
  animate-scale-in). No parity failures, nothing reverted. Manifest now
  equals reality. Extra: ms-→msh- prefix rename (inventory heuristic
  collision), bare `rounded` swept despite heuristic gap. New lane tooling
  in apps/p31ca/scripts/: parity-outline.mjs, sweep-legacy-add.mjs,
  hero-pixel-check.mjs, console-check.mjs.
- **Hero sha256-identical** to the pre-sweep reference
  (`623559d85c410cd2…`); 0 console errors across 8 live pages; zero bare
  Tailwind utilities in served HTML on /, /about, /enterprise, /hire.
- **verify:perf:** PASS — TBT 110 ms ≤ 200 (score 0.95; CSS/class-only
  change, 505/553 assets byte-identical). Mobile 227 ms is pre-existing.
- **/about mermaid:** already correct ("124 MCP tools as of 2026-10-13" —
  Lane 1's edit, verified vs live registry: 44 servers / 22 live / 124
  tools). Finding: unused `StackDiagram.astro` still hardcodes "36".
- Deploy **826be02d** (48 files / 505 unchanged); fix-plan
  `h4-collapse-tooling-2026-10-13.md` RESOLVED with per-batch log.
- Gates: prebuild/build/postbuild green; fix-plan-scan fails only on the 2
  pre-existing wave-8 plans.

Next: shell contract-repair lane in flight; then Astro spike (needs
commit) + StackDiagram one-liner + owner items.

**2026-10-13 (earlier) — H4-sweep + environment wave, Lane B done.**

**Lane B (shell env repairs + Footer copy):**
- **Link-gap root cause (the links never "vanished" — they were never
  managed):** shell is OUTSIDE the root pnpm workspace (globs
  packages/apps/workers/tools only); `.modules.yaml` (2026-09-07) has zero
  @p31ca entries; lockfile records stale `link:../../production/packages/*`
  layout; the prior repair was PARTIAL (8 of 12 links, stopping at
  shared-identity). Hand-created the 4 missing symlinks — all 12 present.
- **Build/tsc:** vite build now resolves @p31ca; advances to a newly
  exposed pre-existing gap — `shell/src/index.css:1` imports the deleted
  `@p31ca/design-core/css/tokens.css` (SSOT flip; real file is
  packages/canon/dist/tokens.css) — filed, out of lane scope. tsc: zero
  link errors; residual API drift (shell-chrome/ui exports) filed for a
  contract-repair lane.
- **Vitest clean verdict:** include filter added
  (`shell/vitest.config.ts:10`) — 2174 files/7607 tests/23 failed/29 min →
  **17 files/148 tests/144 passed/4 failed/123.66 s**. Dispositions:
  pqc-eudi RESOLVED (the `valid:false` was graceful degradation from the
  link gap — 25/25 now); cognitiveGate RESOLVED (root cause: automation
  wrote pnpm's interactive prompt into `shell/pnpm-workspace.yaml` —
  literal `sharp: set this to true or false` — fixed + `pnpm rebuild sharp`
  in the shell workspace only; 5/5); ledModes NOT fixable in scope —
  imports were never valid (LED_MODE_MAP is module-private in
  spaceship-earth, ledUniformsFor doesn't exist) — filed for owner with
  options a/b/c, assertions left intact.
- **chrome Footer copy CORRECTED:** 501(c)(3) "pending" → "confirmed (IRS
  determination 2026-09-23)", mirroring the hub's SharedFooter phrasing;
  copy-only, zero layout change. Filed: 3 conflicting dates for the one
  determination (2026-04-03 effective / 2026-09-23 letter / May 4 outlier)
  — owner check.
- Extra filings: protobufjs/node-datachannel placeholders, dead
  `pnpm.overrides` field, durable shell-workspace-install recommendation.
  Fix-plan `shell-env-repairs-2026-10-13.md` filed; fix-plan-scan adds zero
  violations.

Next: Lane A (H4 sweep) was CANCELLED with zero page edits — manifest
false-accounting reset to empty seed; sweep relaunch pending owner go.
Then the shell tokens.css re-point + API-drift contract lane + ledModes
decision + Astro spike.

**2026-10-13 (earlier) — Content + H4-tooling wave, BOTH LANES DONE.**

**Lane 1 (hub: CanonFooter + AI-visibility content):**
- CanonFooter fixed (`src/components/islands/CanonFooter.tsx:21,24`) — now
  imports the real prop-less `Footer` export from @p31ca/ui/chrome; phantom
  data-driven props removed (that API lives in design-core/compositions but
  ships zero CSS in p31ca — chrome export was the correct fix). /treasury
  footer byte-identical to live.
- **Content structure wave on 4 pages** (all openings in the 40–75-word
  band): /about 56w + Paper III quote (William R. Johnson, DOI
  10.5281/zenodo.19416491, from the repo's own PDF) + Fuller trimtab quote
  (1972 Playboy via The Marginalian) + Gartner $80B (press-release link) +
  registry live numbers marked ours + 4 named DOI refs; /enterprise 54w +
  IDC governance quote + Agentic AI Institute 60%/35% + **CAGR figure
  re-attributed IDC → Mordor Intelligence (honesty fix)**; /research 54w +
  Paper III quote + Zenodo stats counted live from the API; /faq 57w + 5
  per-category ledes (61/46/44/42/40w). New `QuoteBlock.astro`
  (blockquote/cite/figcaption). 5 source URLs registered in
  p31-mesh-constants.json. JSON-LD untouched (hygiene).
- Gates: prebuild/build/postbuild + plain-language-scan +
  check-cognitive-load all green; deployed (one deploy); 4 pages 200, 0
  console errors, 0 leaked comments. Fix-plan
  `p31ca-content-wave-2026-10-13.md` filed.
- Follow-ups: chrome Footer "501(c)(3) pending" copy vs ground truth
  (@p31ca/ui scope); stale "36 MCP tools" in /about mermaid.

**Lane 2 (shell h4s + H4 tooling):**
- `shell/src/data/pocketCardData.tsx`: 46/46 h4→h3 via new `SectionHeading`
  (exact style preservation, inline styles replicating the dead CSS block);
  eslint 0, tsc clean on file.
- `scripts/style-alignment-inventory.mjs` + `scripts/style-alignment-
  exclude.json` (schemaVersion 1, exclude: []) — deterministic, 82 files
  scanned, **57 candidates, 2833 occurrences, 258 unique classes**. Top:
  enterprise.astro 236, runbook 124, about 116, hire 115, index 107.
  Not wired into the gate (lands with the page sweep).
- **Environment gaps found:** shell build fails on @p31ca link: gaps
  (shell-chrome/ui/sovereign-core/spaceship-earth missing from
  shell/node_modules/@p31ca — the earlier re-materialization was partial);
  vitest config has no include filter (crawled .pnpm, 2174 files, 23
  failed / 7584 passed — 3 shell-own failures pre-existing: pqc-eudi VC
  valid:false, cognitiveGate sharp binding, ledModes shell-chrome import;
  none import pocketCardData). All filed.
- Fix-plan `h4-collapse-tooling-2026-10-13.md` OPEN — sweep protocol:
  utilities → @layer legacy, append done files to exclude[], re-run
  inventory, resolve at candidatesRemaining: 0.

Next: H4-sweep + environment wave in flight; then Astro spike (needs
commit). Owner items unchanged.

**2026-10-13 (earlier) — Perf + housekeeping wave, BOTH LANES DONE.**

**Lane 1 (hub: dome TBT + e2e + signin):**
- **MolecularHeart root cause:** `MarketingShell.astro:139-140` mounted the
  live WebGL dome + starfield on EVERY page (`dome` is the default theme),
  both with perpetual rAF loops, both `transition:persist`. Fix:
  `MarketingShell.astro:59-67,146-151` — live islands render on `/` only,
  `client:idle`, persist REMOVED; all other dome pages get the new
  `StaticDome.astro` (zero-JS CSS/SVG). `MolecularHeart.tsx:460-547` +
  `Starfield.tsx:75-137` — rAF runs only while in viewport AND tab visible;
  `src/lib/animationUnlock.ts` — deferred boot on first interaction or 15 s
  fallback. Home hero parity with e6ff2571 verified (canvas set, "Act I ·
  01 · Invitation", ⌘K pill, LED chip; 0 console errors; other pages 0
  canvases).
- **Lighthouse before/after (live):** TBT **38 680 → 110 ms ✓** (budget
  200), score **0.64 → 0.95 ✓**, TTI never → **1.46 s**, FCP/LCP/TTFB/CLS
  all green (1001/1061/240/0.005). Mobile-throttled rig: TBT 147 613 → 227,
  score 0.34 → 0.82. `verify:perf` PASS exit 0 — every budget green.
- **e2e:** repaired/retired honestly — hub-smoke 5 passed/5 skipped,
  prod-smoke 2/3, mission-trio + delta-hiring + trojan-horse +
  sentinel-* + spike-appshell-* documented skips (retired surfaces), no
  files deleted; five-dollar-stack 5/5 live; full suite 5 passed, 117
  skipped, 0 failed.
- **Signin/signup:** stubs now POST to the real `apps/auth` backend
  (p31-auth.trimtab-signal.workers.dev/auth/login, real pseudonym contract,
  token → sessionStorage `p31-auth-token`); copy discloses passwordless
  stack honestly; DID button links to PHOS. Live-verified (created one real
  test record in p31-auth D1 — backend's 90-day cron cleans it).
- Fix-plans: `p31ca-molecularheart-tbt.md` (resolved with both-rig numbers);
  `p31ca-inp-lighthouse-budgets.md` resolved. Deploy **6a42b042** live.

**Lane 2 (housekeeping + relabel):**
- **Catalog relabel (locked precedent applied):** roblox-bridge + 4 vision-*
  entries now carry `role: '<real role> (not MCP)'` + `protocol: 'n/a — not
  an MCP server'` markers (exact mirror of the federation/ledger relabel);
  probe exclusion `isNonMcpConnector` wired through probeTools/probeHealth/
  probeConformance/getToolSchemas + `scripts/verify-mcp-conformance.mjs`
  (drops `protocol.startsWith('n/a')`). **Probe: 12/12 exit 0** (was 12/17
  exit 1 with 5 gaps). Registry v f8455a73 live: relabeled entries show
  `health: unknown`, `conformance: null`, `toolCount: 0`. tsc clean, vitest
  110/110, `mcp:health` 16/16 before AND after.
- **@p31ca/ui Footer:** 2 h4s → h2 (`packages/ui/src/chrome/Footer.tsx:38,47`).
- **components.yml regenerated:** `packages/design-core/scripts/
  generate-components-yml.mjs` — 32 → 52 components, Split at :1746 with
  full def, `--check` OK (deterministic).
- **Legacy html headings:** 12 files fixed (heartbeat.html ×2,
  visual-translator.html, catalog.html escape, p31-shell.html, phos
  qa-dashboard + diy-workspace, molecule-widget, a2ui-renderer + deploy
  index, archive homepage) — all file:line in
  `docs/fix-plans/housekeeping-relabel-2026-10-13.md` (resolved).
- **Filed for next hub lane:** CanonFooter.tsx imports a data-driven
  Footer API from @p31ca/ui/chrome that doesn't exist in the package (the
  API lives in design-core/compositions) — pre-existing mismatch. Also:
  Crown.zephyr.html h1→h3 is a canon fixture (contribution proposal, not an
  edit); shell pocketCardData.tsx ~40 h4s belong to the H4-collapse item.
- **Incident (disclosed, recovered):** qa-dashboard.html was accidentally
  truncated mid-edit; restored byte-identical from apps/phos/dist (md5
  verified) before applying fixes.
- Pre-existing: fix-plan-scan still fails on 2 wave-8 ownership violations
  (7.5+ days old) — owner note, unchanged.

Next: Content + H4-tooling wave in flight; then H4 page sweep + Astro
spike (needs commit first). Owner items unchanged.

**2026-10-13 (earlier) — Remediation + P0 wave, BOTH LANES DONE.**

**Lane A (fleet conformance remediations): 0/17 → 12/17 fully conformant.**
- 7 SDK-v2 servers: additive `_ondiscover` patch on `server.server` (SDK
  2.3.1 wraps discover) — top-level `protocolVersion` +
  `supportedProtocolVersions`. bros :552-567, dads :607-622, design-mcp
  :1631-1646, marketplace-mcp :509-524, p31-crypto :313-328, justice-hub
  :574-589, phenix-wallet :649-664. All tsc clean.
- x402-gateway :632-651 — headerless POST /mcp → -32020/400, exempting the
  legacy initialize handshake (fleet health gate alive); :706-720 injects
  supportedProtocolVersions into bridge discover. Settlement/payment/ledger
  routes untouched; leg C still owner-gated.
- spaceship-relay (packages/spaceship-earth, outside workers/ — scope note
  filed): server/discover, ping→-32601, resultType, header enforcement;
  filled empty SPACESHIP_TELEMETRY KV id with existing namespace.
- Legacy era: p31-mcp-server was SDK v2 with a stale deploy — patched +
  redeployed (b11b5d32); music-maker-mcp now advertises 2026-07-28 and
  serves the SDK v2 createMcpHandler surface.
- p31-shell: -32603 root cause = `import.meta.env.DEV` at module top-level
  (throws in wrangler bundle) → `location.hostname` dev check; discover +
  honest zero-tool tools/list (command registry is browser-bound).
- **Deployed (12):** bros ee5c5010, dads 403b1a99, marketplace-mcp 66253073,
  p31-crypto 57ea3696, justice-hub 81bd7067, phenix-wallet 7b9228f4,
  p31-mcp-server b11b5d32, design-mcp f547bb3e, music-maker 950d5778,
  spaceship-relay 8dbd5dbb, gateway bcc29c3b, shell 99cfecf6. None blocked.
  `mcp:health` 16/16; registry badges show {true,true,true} for remediated.
- **Credentials transparency:** deploys used the stored wrangler OAuth
  session (~/.wrangler/config/default.toml, trimtab.signal@proton.me) and
  the IP-locked gateway token — real stored machine credentials, not in the
  repo; flagged for owner. Two env repairs: shell `@p31ca` link: symlinks
  re-materialized; spaceship KV id filled.
- **Filed:** ① roblox-bridge catalog entry → `/mcp` 404, no MCP surface in
  source; ② 4 vision-* entries → phos-ai-proxy /vision (AI vision endpoint,
  not MCP) — both need the relabel-or-build product decision (relabel
  precedent exists: federation/ledger bridges). ③ shell build-env gap,
  ④ deploy-credential provenance. Fix-plan
  `docs/fix-plans/conformance-remediation-wave-2026-10-13.md` resolved.
- Pre-existing (not this arc): fix-plan-scan still fails on 2 ownership
  violations from wave-8 arcs (7.5 days old) — flagged for owner.

**Lane B (hub performance) — earlier today:** lighthouserc.json budgets +
`verify:perf` live; measured FCP 928 / LCP 1005 / TTFB 27 / CLS 0.000 vs
TBT 38 680 ✗ + score 0.64 ✗ (filed, not lowered — root cause
`MolecularHeart` perpetual rAF mounting on every page via
`MarketingShell.astro:140`). INP yieldToMain fixes + knob batching live.
loomVerifyUrl + 22-paper count closed. Deploy bdac763e.

Next: Lane 1 (MolecularHeart TBT + stale e2e + signin/signup stub) and
Lane 2 (housekeeping + relabel) now in flight; then AI-visibility content
wave, H4 collapse, Astro 7/Vite 8 spike (branch-only — do NOT start while
the working tree carries uncommitted lane work). Owner items unchanged.

**2026-10-13 (earlier) — "Better for $5" wave COMPLETE, both lanes.**

**Lane 1 (hub, deployment ea3fc050):**
- **/sovereign-vs-saas** (`src/pages/sovereign-vs-saas.astro`) — 5-row
  comparison (MintMCP $1,250/mo·50 seats, LangSmith $2,514@1M traces,
  Datadog $5,315@100 hosts, Vercel $20/seat vs Workers $5/account, S3
  ~$900@10TB vs R2 $0) — every competitor figure "published pricing,
  retrieved 2026-10-13" + vendor pricing link; ours = allowance math only.
  Closing line: "We don't sell this page. We run on it."
- **/verify** (`src/pages/verify.astro`) — Loom public verify surface.
  Primary: `https://loom-verify.pages.dev/api/loom/verify` (public Pages
  project, same D1, CORS-allowlists p31ca.org) + `/api/loom/provenance/:seq`.
  "Verify now" replays SHA-256 over RFC 8785 canonical JSON in-browser;
  live DOM evidence of matching head. Honest states: verified / broken /
  unreachable. Bus ledger linked-not-fetched (no CORS headers).
- **/runbook** (`src/pages/runbook.astro`) — 7-step one-account deploy +
  allowance/overage table, linked to Cloudflare pricing docs.
- **Papers on Pages** — 2 of 22 PDFs exist in repo: copied to
  `public/papers/` (200 application/pdf); other 20 DOI-linked to Zenodo,
  no fake local files; R2 = documented scale path. /research updated.
- Gates: prebuild 7/7, build 39 pages, e2e `five-dollar-stack.spec.ts`
  5/5 vs prod (0 console/page errors). Fix-plan
  `docs/fix-plans/p31ca-five-dollar-stack.md` resolved.
- **2 findings filed:** (1) stale `loomVerifyUrl` in
  `p31-mesh-constants.json` (live 404; `loomVerifyPublicUrl` is the
  working constant); (2) 22-vs-23 paper-count drift in the locked
  STRATEGIC-POSITIONING.md proof block (new surfaces use `papers.length`).
- Nav: `compare` (act-in) + `verify` (act-through) in `src/lib/nav.ts:37,43`,
  runbook in LAB_ITEMS (:55), footer links `Footer.astro:22-24`.

**Lane 2 (registry+fleet) — from earlier today:**
- `scripts/verify-mcp-conformance.mjs` live — **0/17 fully conformant**;
  fleet splits into two eras (see fix-plan). The one true enforcement gap:
  x402-gateway silently succeeds without Mcp-Method header. Prior
  "server/discover fleet-wide verified" claim corrected: SDK-v2 servers
  only, with protocolVersion-field caveat.
- Registry conformance badge live (v d98fa382): per-server
  `conformance: {discover, resultType, headerEnforced, checkedAt, detail}`,
  lazy+TTL probe, GET /servers. tsc clean, vitest 110/110, mcp:health 16/16.
- `docs/enterprise/architecture/agent-runtime-durable-objects.md` — DO
  agent-runtime reference, 7 citations, mermaid, estate DOs file:line.
- Fix-plan `docs/fix-plans/registry-conformance-badge.md` resolved — 4
  remediation items filed.

Next: the four conformance remediations + 2 hub findings as one fix-plan
wave; then Lighthouse/INP budgets (`p31ca-inp-lighthouse-budgets.md` is the
open landing spot), AI-visibility content wave, Astro 7/Vite 8 spike, H4
collapse, housekeeping. Owner items unchanged (LOVE_AUTH_SECRET leg C,
cfut roll, Access wiring).

**2026-10-13 (earlier) — p31ca.org next-moves wave complete (positioning locked).**

- **Astro v6** live: 6.4.8 + React 19.3 + Tailwind v4 via
  `@tailwindcss/postcss` (rolldown bug dodged) + ClientRouter + Content
  Layer + Zod 4 — 294 pages parity, 30/30 live probe, 0 errors; three real
  bugs found (dual-React zustand, JSX runtime SSR, adapter-vs-Pages).
- **Gates wired into prebuild:** neurodivergent-design (6 rules, 10/10
  negative controls; drove h1-first fixes across 19 pages + 4 h4 files),
  WCAG 2.2 AA verify (auto: 2.4.11/2.5.7/2.5.8/3.2.6/3.3.7/3.3.8; fixed
  spoon 20→24px, 404 footer, signin autocomplete, double topbar on /blog),
  no-HTML-comments gate.
- **Content:** hero specificity line live ("Post-quantum signing,
  hash-chained evidence logs, a design system with 32 components, and a
  game arcade"), /faq 16 substantive Q&A entries with verified data (the
  AI-visibility lever; JSON-LD stays hygiene). Content-Signal robots live.
- **Canon:** Split keyboard fallback (2.5.7) — 95/95 tests, ADR §17;
  align/cols/hover contracts (ADR §14–16).
- **MCP:** server/discover fleet-wide verified (SEP-2243 header +
  params._meta contract recorded). `mcp:health` 16/16.
- **Open:** `p31ca-inp-lighthouse-budgets.md` (INP audit + Lighthouse CI).

Next: H4 page-by-page canon collapse (Tailwind classes → @layer legacy per
page) + the Vite-8/canon sync follow-ups; owner items unchanged
(LOVE_AUTH_SECRET leg C, cfut roll, Access wiring).

## Handoff Format (write this at session end)

```
## Handoff
Focus: <one sentence>
Blockers: <list>
Next action: <one concrete step>
```