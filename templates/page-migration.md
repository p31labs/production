<!-- P31-HEADER
id: p31_template_page_migration_20261013_v1.0
type: template
component: templates/page-migration
status: live
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# page-migration — the per-page canon-migration checklist

One copy of this checklist per page, filled in as the migration executes
(Track B). Order is fixed: audit → grid → header → badge → parity → gate →
deploy. Skipping an order step is a violation (grids sit on containers;
headers on containers; badges last so prose edits don't churn).

## 0. Page record

```
Page:            /example
File:            apps/p31ca/src/pages/example.astro
Source audit:    docs/enterprise/design-system/page-audit.md row: <copy>
Baseline:        <screenshot or e6ff2571 reference URL>
Fix-plan:        docs/fix-plans/<issue-id>.md   (filed BEFORE editing — Ownership Contract)
```

## 1. AUDIT — record what exists (read-only)

- [ ] Header component + alignment + container classes (grep
      `SectionHeader|data-align|max-w-`)
- [ ] Grids: `data-p31="grid"` present? `data-cols`/`data-even` complete?
      legacy `-grid-cols-*` classes? page-local `display:grid`?
- [ ] Badges: `LiveProofPanel`, "Live in production", `● Live` pills
- [ ] Token forks: `--p31-*` declarations in page or page-prefixed CSS
- [ ] Fill the page-audit table row with today's values

## 2. GRID — fix grids first (they carry the content)

- [ ] Every card layout → `data-p31="grid"` (G1)
- [ ] Every grid → `data-cols="2|3|4"` AND `data-even` (G2); count cards,
      match the count (G3)
- [ ] Remove legacy `-grid-cols-*` / `home-grid` classes from the element (G4)
- [ ] Remove page-local grid CSS (`display:grid`, `grid-template-*`)
- [ ] Verify visually: even rows, footer pin, 4/3→2 at ≤900px, all→1 at ≤560px

## 3. HEADER — one chain, start-aligned

- [ ] Exactly one `<h1>` (H1)
- [ ] One header chain (SectionHeader L1 or `[data-p31="page-header"]`) —
      title → description → accent bar, nothing between (H2)
- [ ] `data-align="start"` unless the page is on the center list
      `/`, `/research`, `/arcade` (H3)
- [ ] Centered-header pages: header centers, body prose stays left (H4)
- [ ] Replace raw `<h1>` pages (404/signin/signup/hire pattern) with the chain

## 4. BADGE — remove the floating proof

- [ ] Delete LiveProofPanel import + usage (B1)
- [ ] Delete `● Live` / status pills from header/hero (B2)
- [ ] No positioned badge markup (B3)
- [ ] Prose that says "in production" stays prose — inside `<p>`/`<td>`, never a chip (B4)

## 5. PARITY — match the reference before anything else

- [ ] Alignment parity vs `e6ff2571` reference (or its approved snapshot):
      h1 x/w at 1440px (reference set: about/team/faq/enterprise start)
- [ ] Container parity: page box 80rem, one padding rhythm, no wider box
- [ ] Hero text pixel parity if the hero was untouched (visual-nav fix §Verification)
- [ ] Rollback trigger: any regression → revert THIS page and re-file

## 6. GATE — the mechanical checks (run on every changed file)

```bash
grep -oE 'max-w-[0-9a-z]+' PAGE         # only 7xl (or narrower, once)
grep -c '<h1' PAGE                      # exactly 1
grep -oE 'data-align="[a-z]+"' PAGE     # start (or center on the 3-page list)
grep -oE 'data-p31="grid"[^>]*' PAGE    # every grid: data-cols AND data-even
grep -nE 'display: grid|grid-template' PAGE  # 0 hits
grep -niE 'live in production|LiveProofPanel' PAGE  # 0 hits
node scripts/token-conformance.mjs      # no token forks
```

- [ ] All greps clean; `pnpm gate` green; render-gate A1–A8 evaluated

## 7. DEPLOY — owner sign-off, one wave

- [ ] Prebuild + build + postbuild gates green
- [ ] `verify:perf`: TBT ≤ 200ms, score ≥ 0.9 (WebGL dome is the known suspect)
- [ ] ONE deploy; live checklist vs p31ca.org (the visual-nav fix ran 19/19)
- [ ] Fix-plan closed with evidence, audit_chain recorded

## Rules of the checklist

- File the fix-plan BEFORE the first edit (fix-plan-scan fails otherwise).
- One page per wave unless the pages share one layout (then: layout first,
  pages after, one deploy).
- Never edit generated CSS in place — re-run the generator.
- If a page needs a decision the checklist can't make, it escalates to
  Track D as an owner decision, not a local choice.