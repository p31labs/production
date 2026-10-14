# fix-plan: p31ca.org AI-visibility content scale-out — /hire /treasury /accessibility /verify + /enterprise governance thesis

<!-- P31-HEADER
id: p31_fix_plan_p31ca_content_scaleout_20261013_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: keep-forever
created: 2026-10-13T23:10:00Z
owner: will
-->

**Discovered by:** agent:subagent:final-hub-wave (task: AI-visibility scale-out,
governance thesis surface, INP follow-ups)
**Discovered at:** 2026-10-13T23:10:00Z
**Severity:** medium (AI discoverability; four pages did not follow the
research-validated answer-first structure)

## The gaps

1. **Four live pages carried narrative-first copy** (`/hire`, `/treasury`,
   `/accessibility`, `/verify`): statement headings, no answer-first opening,
   card grids where tables belong, generic nouns where named entities belong.
2. **No structure checklist was enforced.** The Meltwater AI-search checklist
   (bullets, question headings, named entities, quantitative data) had no
   sensor for these pages. The widely-circulated "75% named entities" figure
   is UNCONFIRMED and is not used anywhere; the actionable items are the
   confirmed pattern percents: 100% bullets, 92% question headings, 67% data
   with sources (see checklist below).
3. **/enterprise had no governance-thesis surface.** The Stacklok State of MCP
   in Software 2026 numbers (41% production headline, 86% experimenting, 9%
   ungoverned, 5% governed enterprise-wide, 49% security blocker) were
   verified against the primary report and Forkast 2026-07-28, but the page
   never carried them, so the "governance layer is the product" position had
   no landing block.
4. **The INP measurement lane's one unyielded surface** (CommandPalette open +
   search) lacked the `yieldToMain` treatment every other measured surface
   carries (see `docs/fix-plans/p31ca-inp-measurement-2026-10-13.md`).

## The fix

### Per-page changes (all live after one deploy, 2026-10-13)

| Page | Priority (NP Digital ranking) | Shape | Changes |
|---|---|---|---|
| /verify | original research (the Loom chain) — lead with the data | question H2s + answer-first lede + bullets + named entities | lede added after H1; headings rewritten as questions ("Is the chain intact right now?", "Can I check it without trusting P31 Labs?", "Where does the Loom come from?", "Is there another chain?", "What are the raw endpoints?"); new research-anchor card naming P31 Labs, EIN 42-1888158, the Genesis Whitepaper + Tetrahedron Protocol Zenodo DOIs, and the 22-paper Zenodo community. Live-verdict script untouched. |
| /treasury | original financial data — high priority | question H2s + answer-first lede + allocation TABLE + bullets | lede added; "How much has P31 Labs received?" (live total + per-source), "Where does the money go?" (table replacing the 3-card grid), "Can I check the numbers myself?" (endpoints + who-runs-this bullets, EIN 42-1888158). Honesty preserved: headline still withheld, per-source raw figures only. |
| /accessibility | FAQ-shaped (41% citation tier) | question H2s + answer-first lede + bullets | headings rewritten as questions ("Does this site meet WCAG 2.2 AA?", "How was this checked?", "What works for neurodivergent users?", "What still falls short?", "How do I report a problem?"); accommodations card grid converted to a bullet list. Same conformance content and dates. |
| /hire | lower-yield — kept honest and brief | question H2s + hero lede + offer TABLE | hero sub replaced with a 50-word answer-first lede naming P31 Labs and the registry (44/22/124, as of 2026-10-13); Genesis Whitepaper DOI added to the live-proof panel; 3-card offer grid replaced with a "What does it cost, and when?" table; CTA heading question-shaped ("How do I start?"). Nothing padded. |
| /enterprise | new surface | section + stat table + one-liner | new section "The governance layer is the product" between THE GAP and VERIFY IT YOURSELF: 45-word answer-first block, a 5-row table (41% / 86% / 9% / 5% / 49%), source line citing Stacklok State of MCP in Software 2026 + Forkast 2026-07-28, and the one-liner with /runbook + /verify links. Plain language; no marketing slop. |

### Structure checklist (the sensor, applied per page)

- [x] Answer-first opening of 40–60 words under the H1, before the first H2.
- [x] Question-shaped H2/H3 headings (92% pattern).
- [x] Tables for any comparison content (treasury allocation, hire offer, enterprise Stacklok split).
- [x] Bullets for lists (verify anchors, treasury who-runs-this, accessibility accommodations).
- [x] Named entities instead of generic nouns: P31 Labs, EIN 42-1888158, named Zenodo DOIs (10.5281/zenodo.19411363, 10.5281/zenodo.19004485), named ledger + registry URLs.
- [x] Every stat inline-sourced (67% pattern): registry figures marked "our live registry, as of 2026-10-13"; allocation marked "our numbers"; Stacklok figures cited to report + Forkast with date; DOI verification date stated (2026-09-23).
- [x] NOT used: the Meltwater "75% named entities" figure (unconfirmed).

### New utility classes

`sweep-legacy-add.mjs` appended 17 compiled rules to
`src/styles/sweep-legacy.css` (trd0-* and hiee-* table + margin utilities)
so the new tables use the same pre-compiled utility pipeline as every other
page prefix.

## Evidence

- `npm run prebuild` + `npm run build` green (all gates: no-HTML-comments,
  ground-truth, content-sources, content-consistency, compliance-drift,
  neurodivergent, WCAG 2.2 static+runtime).
- One deploy; /hire /treasury /accessibility /verify return HTTP 200 live.
- e2e `five-dollar-stack.spec.ts` 5/5 green against production (includes the
  /verify console-clean pass), CommandPalette 0 console errors on the home.
- Fix-plan scan clean: no unfiled markers introduced.

## Files touched

- `apps/p31ca/src/pages/hire.astro` (edited)
- `apps/p31ca/src/pages/treasury.astro` (rewritten)
- `apps/p31ca/src/pages/accessibility.astro` (rewritten)
- `apps/p31ca/src/pages/verify.astro` (edited)
- `apps/p31ca/src/pages/enterprise.astro` (edited)
- `apps/p31ca/src/components/CommandPalette.tsx` (edited — yieldToMain)
- `apps/p31ca/src/styles/sweep-legacy.css` (edited — 17 utility rules via
  `scripts/sweep-legacy-add.mjs`)
- `docs/fix-plans/p31ca-inp-measurement-2026-10-13.md` (updated — dispositions)
- NEW `docs/fix-plans/p31ca-content-scaleout-2026-10-13.md` (this file)