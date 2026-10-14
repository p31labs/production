<!-- P31-HEADER
id: p31ca_canon_v2_adopt_page_shell_20261014_v1.0
type: fix-plan
component: apps/p31ca
status: open
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: Canon v2 page-shell adoption for the 7 narrowed pages

**Discovered by:** agent (content-width/underline/menu wave, 2026-10-14)
**Discovered at:** 2026-10-14
**Severity:** low (temporary per-page-class debt; no visual or gate defect)

## The bug

The 2026-10-14 content-width wave narrowed seven p31ca.org surfaces to the
ACT III reading measure (`max-w-4xl` ≈ 56rem) by editing each page's wrapper
classes directly. The change is correct and live (40 pages build, WCAG
runtime checks green), but it used **page-prefixed utility classes** where the
canonical mechanism is the Canon v2 page shell:

- Canon v2 defines `--p31-page-max` (80rem) and `--p31-page-pad-x` via the
  `data-p31="page"` attribute + `data-mode` flow variants — a single shell
  attribute with **no per-page classes**.
- The seven pages below carry per-prefix swept rules in `sweep-legacy.css`
  (`in0x-*`, `jo7d-*`, `rec9-*`, `dc99-*`, `sod3-*`, `hiee-*`, `ar08-*`) that
  expand the legacy quarantine — the opposite direction of the sweep lane's
  retirement goal.

## Symptom

| Page | Wrapper today (page-prefixed) | Canon v2 target |
|---|---|---|
| `src/pages/index.astro` | `in0x-max-w-4xl in0x-mx-auto in0x-px-6 in0x-md-px-12 in0x-lg-px-16` | `data-p31="page" data-mode="flow"` |
| `src/pages/journey.astro` | `jo7d-max-w-4xl jo7d-mx-auto jo7d-px-6 jo7d-md-px-12 jo7d-lg-px-16 jo7d-pb-16` | `data-p31="page" data-mode="flow"` |
| `src/pages/research.astro` | `rec9-max-w-4xl rec9-mx-auto rec9-px-6 rec9-md-px-12 rec9-lg-px-16` | `data-p31="page" data-mode="flow"` |
| `src/pages/docs.astro` | `dc99-max-w-4xl dc99-mx-auto dc99-px-6 dc99-md-px-12 dc99-lg-px-16` | `data-p31="page" data-mode="flow"` |
| `src/pages/sovereign-vs-saas.astro` | `sod3-max-w-4xl sod3-mx-auto sod3-px-6 sod3-md-px-12 sod3-lg-px-16` | `data-p31="page" data-mode="flow"` |
| `src/pages/hire.astro` | `hiee-max-w-4xl hiee-mx-auto hiee-px-6 hiee-md-px-12 hiee-lg-px-16` | `data-p31="page" data-mode="flow"` |
| `src/pages/arcade.astro` | `ar08-max-w-4xl ar08-mx-auto ar08-px-6 ar08-md-px-12 ar08-lg-px-16` | `data-p31="page" data-mode="flow"` |

## The fix (when Canon v2 lands)

1. When `@p31ca/canon` ships the `data-p31="page"` shell stylesheet, swap each
   wrapper above to `<main data-p31="page" data-mode="flow">` — no width/pad
   classes at all. Width + padding come from the shell tokens
   (`--p31-page-max` / `--p31-page-pad-x`).
2. Delete the swept rules introduced by this wave: `in0x-max-w-4xl`,
   `in0x-mx-auto`, `in0x-px-6`, `in0x-md-px-12`, `in0x-lg-px-16`,
   `jo7d-max-w-4xl`, `jo7d-md-px-12`, `jo7d-lg-px-16` (and the now-unused
   `jo7d-max-w-7xl`) from `src/styles/sweep-legacy.css` — they exist only for
   this wave.
3. Confirm the same sweep deletion for `rec9-*`, `dc99-*`, `sod3-*`,
   `hiee-*`, `ar08-*` width/pad rules if no other page uses them.
4. The `docs.astro` width decision (4xl vs 5xl for tables/code) is parked here
   too — revisit after a visual preview at ≥1280px; it is a one-line change if
   5xl reads better.

## Rollback

Not needed — the current state is the working baseline. This plan is a
migration note for the next Canon v2 wave, not a defect in today's change.