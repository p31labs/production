<!-- P31-HEADER
id: p31_page_contracts_20261013_v1.0
type: runbook
component: docs/enterprise/design-system
status: live
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# PAGE-CONTRACTS — the four layout contracts every surface obeys

Phase 0 deliverable 3. These are the written rules for the §2 surface track.
Every rule is (a) grounded in what the aligned pages actually do —
`/about`, `/team`, `/faq` plus the `e6ff2571.p31ca.pages.dev` reference
(see `page-audit.md` §5 for the reference alignment set) — and (b) written so
an agent can check it with grep, no judgment calls. If you can't grep it, it
isn't a rule.

**Reading level: 5th grade.** Short sentences. One idea per rule. A page
either passes a rule or fails it. There is no "maybe".

---

## (a) CONTAINER — the page fits in one box, centered, one padding

Grounding: MarketingShell gives every page `#main-content` =
`width:100%; max-width:80rem; margin-inline:auto` (canon-v2 §11: the page
wrapper centers itself). The aligned pages add nothing wider than that box.

**C1 — 80rem is the widest box.** A page may never set a width wider than
`80rem` (the `--p31-page-max` token). Check: grep the page for
`max-w-[0-9a-z]+`. `max-w-7xl` is the only 80rem name. `max-w-4xl`
(56rem) and `max-w-3xl` (48rem) are NARROWER, so they pass C1 for width —
but see C3.

**C2 — one centering, owned by the shell.** The shell centers the page.
The page must NOT center itself again. Check: a page `<main>` inside
`#main-content` may not carry `mx-auto` on its own wrapper. One `mx-auto`
per page path, and it belongs to the shell. (The doubled-margin bug —
canon-v2 §11.)

**C3 — one padding, and it comes from the page, not per-section.** A page
has ONE horizontal padding rhythm for its whole body. It may be
`px-6 md:px-12 lg:px-16` (the aligned-page rhythm) or the prose rhythm —
not both mixed by section. Check: count distinct `px-*`-with-breakpoint
patterns in the page's direct content wrapper. More than one = fail.
**The prose sub-box rule:** prose sections may sit in a narrower measure
(`prose-max`, 65ch) INSIDE the page box — the aligned pages do this —
but every section must be inside the one page box. Nothing escapes the box.

**C4 — `#main-content` is the only page root.** Every route renders its
content inside `<main id="main-content">` (or the same `data-p31="page"`
wrapper). Check: grep the page for `id="main-content"` (or
`data-p31="page"`). Missing = fail. (index.astro's `<main class="home">`
fails C4 today.)

---

## (b) HEADER — one header chain, start-aligned unless the reference centers

Grounding: the aligned pages each open with one SectionHeader
(`level="1"`, title + description, accent bar) rendered `data-align="start"`
(start = left). The reference centers exactly three page headers:
the home hero, `/research`, and `/arcade`. Nothing else.

**H1 — one header per page.** A page has exactly one top-of-page header
component: the SectionHeader chain (or the canon
`[data-p31="page-header"]` equivalent) — one `h1`, one title, one
description. Check: grep for `<h1`. Exactly one `<h1` in the page file
(not counting the component the page imports). A raw `<h1>` outside the
header chain = fail (signin, signup, 404, hire fail today).

**H2 — the title/description rhythm.** Title first, description second,
accent bar optional, nothing between them. Title size from the
`page-title-size` token; description color `--p31-text-secondary`.
Check: the header chain's direct children in order are title, description.
A hero with CTAs and meta pills above the h1 is a hero, not a header —
allowed ONLY on the three reference-centered pages and the FlagshipPage
product template (see H4).

**H3 — start is the default. Center is a list, not a choice.** Header
alignment is `data-align="start"` unless the page is ON this list:
`/` (home hero), `/research`, `/arcade`. Check: grep `data-align`.
`data-align="center"` on any other page = fail. (The reference renders
`/enterprise` start — it drifted and was fixed back.)

**H4 — center only centers the header block, never the body.** If a page
is on the center list, its header centers (title + description). Body
paragraphs below it stay left. Check: no `text-center` on body prose
containers. ("Never center body prose" — canon-v2 §14.)

---

## (c) GRID — canon grid attributes, even rows, no page CSS

Grounding: the aligned pages use `data-p31="grid" data-cols="N" data-even`
(the canon-v2 §15 recipes: 2×2 / 3×3 / 4×4, `grid-auto-rows:1fr`, footer
pin). The canon ships the CSS. Pages that copy it are the bug.

**G1 — every card layout is `data-p31="grid"`.** Any element that lays out
cards (2 or more per row) must carry `data-p31="grid"`. Check: grep
`data-p31="grid"`. A page with a card grid lacking the attribute = fail.

**G2 — explicit columns + even rows.** Every `data-p31="grid"` must also
carry `data-cols` with a count (2, 3, or 4) AND `data-even`. Check: for
each `data-p31="grid"` line, the same element must include both
`data-cols="[0-9]+"` and `data-even`. Missing either = fail.
(get-involved's second grid lacks `data-even` today.)

**G3 — counts are 2, 3, or 4, and the card count fits the grid.** No
`data-cols="5"+`; a `data-cols="4"` with 3 cards leaves an empty track —
the count must match the number of cards (or the smaller of the two).
Check: count cards inside the grid, compare to `data-cols`. Mismatch = fail.

**G4 — no page-local grid CSS.** A page may not define grid layout in its
own `<style>` or rely on page-prefixed grid classes (`home-grid`,
`fi65-grid-cols-*`, `hiee-grid-cols-*`, `journey-section`). Check: grep the
page file for `display: grid`, `grid-template`, or a class matching
`[a-z0-9]+-grid(-cols-[0-9]+)?`. Found = fail. The canonical mirror in
`p31-style.css` exists only until the canon import lands; new pages never
add to it.

**G5 — subgrid internals stay inside the grid child.** If a grid card
contains an inner layout, it is a subgrid or flex column of that card —
never a second top-level grid beside the first. Check: no two sibling
`data-p31="grid"` elements with no non-grid content between them
(unless each is a distinct, titled section — the aligned pages allow one
grid per section, not nested page-level grids).

---

## (d) BADGE — no floating badges or status cards in the page flow

Grounding: the estate's "it's real" proof used to be a floating card with
a green dot and "Live in production" (LiveProofPanel) plus `● Live` pills
in heroes (FlagshipPage). The Phase 0 decision removes them estate-wide:
nothing may sit in the page flow as a floating badge/card that pushes or
duplicates content.

**B1 — no floating badge cards.** A page may not render a standalone
badge card (a small box whose only job is to display a status dot + status
line, like "Live in production") anywhere in the layout flow. Check: grep
the page for `Live in production` or a `LiveProofPanel` import. Found =
fail. (All 8 FlagshipPage surfaces fail today.)

**B2 — no status pills in headers/heroes.** The `● Live` / "In
development" pill in the FlagshipPage hero is a badge in the header block.
It must be removed (or, if the status matters, expressed as plain text in
the body, not as a pill). Check: grep for `● Live` / `rounded-full`
inside the header region.

**B3 — badges never control layout.** No badge, dot, or status chip may
be positioned (absolute/fixed/float) or may push content. A badge must
either not exist (B1/B2) or be plain inline text inside the normal flow.
Check: grep for `position: absolute|fixed` near badge markup.

**B4 — badge copy in content is content, not a badge.** Body prose that
SAYS "in production" (enterprise's survey table, sovereign-vs-saas's
statistics, manual-posts.json's blog post) is allowed — it is writing,
not a UI badge. It may not be styled as a chip. Check: the words appear
inside `<p>`/`<td>`/`<li>`, not inside a bordered/rounded/pill element.

---

## Mechanical check summary (what an agent runs per page)

```bash
# C1/C2/C3/C4  container
grep -oE 'max-w-[0-9a-z]+' PAGE            # only 7xl (or narrower, once) allowed
grep -c 'mx-auto' PAGE                     # >1 on wrappers = fail
grep -c 'id="main-content"' PAGE           # must be 1
# H1–H4  header
grep -c '<h1' PAGE                         # exactly 1
grep -oE 'data-align="[a-z]+"' PAGE        # start, or center only on the 3-page list
grep -c 'SectionHeader' PAGE               # header chain present (unless FlagshipPage)
# G1–G5  grid
grep -oE 'data-p31="grid"[^>]*' PAGE       # each must contain data-cols AND data-even
grep -nE 'display: grid|grid-template' PAGE # 0 hits
# B1–B4  badge
grep -niE 'live in production|LiveProofPanel' PAGE   # 0 hits on UI surfaces
```

One command: `grep` first, argue never. A rule that can't be grepped is not
in this file — it belongs in prose, and prose is advice (Law 7).

## Where the contracts come from (evidence, one line each)

- C1/C2: MarketingShell `#main-content { max-width:80rem; margin-inline:auto }`
  (`apps/p31ca/src/layouts/MarketingShell.astro:330-336`); canon-v2 §11
  "the page wrapper centers itself; children never set their own centering."
- H3: `docs/fix-plans/p31ca-visual-nav-fix-2026-10-13.md:21-26` — reference
  set about/team/faq=start, research/arcade/home=center, enterprise=start.
- G1/G2: canon-v2 §15 explicit grid recipes (`data-cols`, `data-even`,
  4→2 @≤900px, all→1 @≤560px); the aligned pages about:149, enterprise:155.
- B1: FlagshipPage:79 LiveProofPanel card + LiveProofPanel.astro default
  `statusLine='Live in production'` — the pattern being removed.
- H2 rhythm: SectionHeader.astro renders title → description → accent bar
  (`apps/p31ca/src/components/marketing/SectionHeader.astro`).