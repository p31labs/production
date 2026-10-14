# fix-plan: p31ca content refresh 2 — registry 42,753, Mordor observability line, DO tool-matching note, paragraph pass, RUM web-vitals v6 note

<!-- P31-HEADER
id: p31_fix_plan_p31ca_content_refresh2_20261013_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: keep-forever
created: 2026-10-13T23:59:00Z
owner: will
-->

**Discovered by:** agent:subagent:content-refresh2 (task: light content refresh,
research-verified 2026-10-13)
**Discovered at:** 2026-10-13
**Severity:** low (content refresh; no structure changes, no new pages)

## The changes (all research-verified 2026-10-13)

### 1. Registry 42,753 — /sovereign-vs-saas + /enterprise

The official MCP Registry hit **42,753 servers** as of 2026-10-13. Source:
Forkast News, "Bifurcation: Tool Discovery Hits 42,000 as Agent Governance
Stalls" (Blair Hayes, 2026-10-13 12:15 UTC) —
https://forkast.news/bifurcation-tool-discovery-hits-42000-as-agent-governance-stalls/
(article verified live 2026-10-13; figure text: "As of October 13, 2026, the
registry hit 42,753 servers"). Growth path (from the same reporting): 7,711
May → 30,375 Sept 10 → 35,491 Sept 24 → 42,753 Oct 13. The framing line is
Forkast's own: "connectivity is abundant but trust is unverified" — rendered
on both pages as *connectivity is abundant, trust is unverified*, attributed.

**/sovereign-vs-saas.astro (Stacklok block):** one paragraph added after the
49%/34% blocker paragraph, with inline link:

> The official MCP Registry hit **42,753 servers** on October 13, 2026 — in
> Forkast's framing, connectivity is abundant, trust is unverified
> (Forkast, 2026-10-13 ↗).

**/enterprise.astro (governance section):** one paragraph added after the
sources paragraph, before the closing one-liner, with inline link:

> The registry keeps growing: the official MCP Registry hit **42,753 servers**
> on October 13, 2026 — in Forkast's framing, "connectivity is abundant, trust
> is unverified".

**URL registration:** new constant `forkastRegistryBifurcationUrl` in
`src/data/p31-mesh-constants.json` (verify-content-consistency requires every
page URL there). Growth path intentionally NOT on the pages — fix-plan only,
per "do not bloat".

### 2. Observability market line — /sovereign-vs-saas

Mordor Intelligence, Agent Observability & Governance Market (May 2026):
$1.23B (2025) → $1.68B (2026) → $8.62B (2031), 38.69% CAGR. URL already
registered as `mordorAgentObservabilityUrl` (also cited on /enterprise).

One paragraph added to the Stacklok block, after the 42,753 line, with inline
link:

> Mordor Intelligence sizes the agent observability and governance market at
> $1.23B (2025), $1.68B (2026), and $8.62B by 2031 (38.69% CAGR). As
> regulations start requiring real-time audit trails, observability turns into
> a compliance mandate — the Loom is that, for pennies (Mordor, May 2026 ↗).

"The Loom is that, for pennies" is honest on this page: the table row above
cites the Loom's hash-chained ledger on D1 within the $5 plan's included
allowances — architecture math, not a claimed bill.

### 3. DigitalOcean tool-matching note — /sovereign-vs-saas

DigitalOcean reports 99.3% tool-matching accuracy in internal testing;
Forkast's framing: the bottleneck for agents is not compute but tool
integration (auth, permissions, retries, monitoring). Source: Forkast News,
"Five Runtime Architectures, Five Bets on Where Agent Execution Lives" —
https://forkast.news/five-runtime-architectures-five-bets-on-where-agent-execution-lives/
(verified live 2026-10-13; quote: "DigitalOcean reports 99.3% tool-matching
accuracy in internal testing. The bet here is that the bottleneck for agents
is not compute but tool integration — managing authentication, permissions,
retries, and monitoring across dozens of external systems.").

**Date correction (honesty note):** the task brief said "Cite Forkast
2026-09-22". The article's verified byline is **2026-09-23 10:36 UTC** — the
page cites the verified byline date (2026-09-23), matching the precedent set
in `p31ca-sovereign-refresh-2026-10-13.md` (Forkast 07-28 vs 07-27).

One line appended to the existing DO row's `theirsDetail`:

> DigitalOcean reports 99.3% tool-matching accuracy in internal testing — its
> bet is that the bottleneck for agents is not compute but tool integration
> (Forkast, 2026-09-23). Their bet is tool-matching; ours is governance — the
> same problem, different layer.

The Forkast article URL is cited in the page's Sources section (`<li>`), since
`theirsDetail` is plain text (no inline links). New constant
`forkastRuntimeArchitecturesUrl` registered.

### 4. Paragraph-level pass — /verify, /treasury, /accessibility, /hire

Indig's finding (53% of citations come from mid-paragraph sentences) was
applied as a *consideration*, not a mandate. Each candidate paragraph was
checked for a definitive sentence opening the paragraph. Result: **all four
pages kept first-sentence placement for readability** — no sentences moved,
no rewrites, no new content.

| File | Decision | Rationale |
|---|---|---|
| verify.astro | kept first-sentence for readability | Every paragraph answers a question-shaped heading; the answer must lead (e.g. "Is there another chain?" → "The workspace event bus keeps its own…"). The "no trust required" definitive sentence already sits at paragraph end. The 40–60-word answer-first opening block was not touched per constraints. |
| treasury.astro | kept first-sentence for readability | "Can I check the numbers myself?" → "The ledger is append-only with a SHA-256 hash chain." Moving the answer mid-paragraph would bury the yes/no answer a 5th-grade reader needs first. Opening block untouched. |
| accessibility.astro | kept first-sentence for readability | "Does this site meet WCAG 2.2 AA?" → "P31 Labs is partially conformant…" leads with the conformance status — the W3C statement pattern and the best first sentence for a screen-reader user. "How was this checked?" → "Self-evaluation." is the direct answer to the question. "How do I report a problem?" already has its definitive sentence ("report it so we can fix it") at paragraph end. |
| hire.astro | kept first-sentence for readability | Hero paragraph is the 40–60-word answer-first opening (constraint: do not break). "Try it. Change a block, watch the chain break, then verify." is a three-step instruction, not a definitive-claim paragraph. CTA "One email. A working MCP server in 3 days." is deliberately telegraphic. |

### 5. RUM fix-plan update — web-vitals v6 named

`docs/fix-plans/p31ca-inp-measurement-2026-10-13.md` updated:
- The "web-vitals disposition" bullet now names the version to wire: **web-vitals v6**.
- The upgrade path now specifies **web-vitals v6** — v6.0.0, released
  2026-07-21, adds soft-navigation support. npm registry check 2026-10-13
  shows latest **6.2.3** (published 2026-10-05), superseding the brief's
  "v6.1.1 current" — recorded honestly in the plan.
- Installation path specified as **vendored-inline, not `pnpm add`**: vendor
  the web-vitals v6 module into `apps/p31ca/src/vendor/web-vitals/` from the
  published tarball and import locally, sending `onINP` beacons to a
  **collector worker**. No root lockfile mutation
  (`/home/p31/production/pnpm-lock.yaml` is consumed with `--frozen-lockfile`
  across the monorepo).

## Files touched

- `apps/p31ca/src/pages/sovereign-vs-saas.astro` (edited — frontmatter source
  note, DO row detail, 2 governance-gap paragraphs, 3 Sources `<li>`s)
- `apps/p31ca/src/pages/enterprise.astro` (edited — frontmatter note,
  1 governance-section paragraph)
- `apps/p31ca/src/data/p31-mesh-constants.json` (edited — 2 new Forkast URLs)
- `docs/fix-plans/p31ca-inp-measurement-2026-10-13.md` (edited — v6 + vendored-inline)
- NEW `docs/fix-plans/p31ca-content-refresh2-2026-10-13.md` (this file)

## Verification

- `npm run prebuild` green (no-HTML-comments, ground-truth, content-sources,
  content-consistency, compliance-drift, neurodivergent + heading hierarchy,
  WCAG 2.2) and `npm run build` + postbuild green (39 pages, rendered H1→H2→H3
  no skips, WCAG runtime pass).
- Dist check before deploy: `42,753`, `tool-matching`, `compliance mandate`,
  `38.69% CAGR`, and the framing line all present in
  `dist/sovereign-vs-saas/index.html` / `dist/enterprise/index.html`.

## Deploy + live evidence (2026-10-13)

- One deploy: `npm run deploy` → `https://321b8ac3.p31ca.pages.dev` (uploaded
  3 files, 551 already uploaded).
- Live: https://p31ca.org/sovereign-vs-saas/ → HTTP 200; carries `42,753`,
  `38.69% CAGR`, `compliance mandate`, `Mordor, May 2026 ↗`, `Forkast,
  2026-10-13 ↗`, `99.3% tool-matching`, `Forkast, 2026-09-23`.
- Live: https://p31ca.org/enterprise/ → HTTP 200; carries `42,753` and
  `connectivity is abundant, trust is unverified` (Forkast framing, linked).
- Live: /verify /treasury /accessibility /hire all HTTP 200 (paragraph-pass
  files untouched — no content change to re-verify).
- e2e: `PLAYWRIGHT_BASE_URL=https://p31ca.org PLAYWRIGHT_SKIP_WEBSERVER=1
  npx playwright test e2e/five-dollar-stack.spec.ts` → 5 passed; the spec's
  console sniffer (page.on("console", error-type capture, "No JS console
  errors" assertion) covers /sovereign-vs-saas and /verify — 0 console errors.
- Honesty rails: Forkast DO article cited at its verified byline date
  2026-09-23 (brief said 09-22); web-vitals "current" corrected to 6.2.3 per
  npm registry 2026-10-13; Mordor figures exactly as published ($1.23B 2025 →
  $1.68B 2026 → $8.62B 2031, 38.69% CAGR); our numbers (the Loom, the $5
  plan) marked ours; registry growth path kept off the pages (no bloat).