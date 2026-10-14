<!-- P31-HEADER
id: p31_strategy_p31ca_positioning_20261012_v1.0
type: plan
component: apps/p31ca
status: live
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# p31ca.org — Locked Positioning & Void-Fill Plan

## Positioning (locked)

**P31 Labs is the sovereign AI infrastructure layer for families** —
post-quantum, open-source, self-hosted, designed for neurodivergent
households. The stack governments buy in bulk, rebuilt for the kitchen table.

Nobody occupies this intersection: the ~$80B 2026 sovereign-cloud market
(ISG: Oracle/Databricks/IBM leaders; Palantir→Nebius pact) targets
governments and enterprises exclusively.

Proof block (live, after the hero): 44 servers · 22 live · 135 tools · 7
live flagships · 22 DOI-verified papers · 100% open source · EIN 42-1888158.

## Design frame (locked)

Linear/Vercel restraint + ONE memorable beat (the dome). Static hero, faint
grid, hairline borders, one accent; centered hero composition; specific CTAs
(never "Get started"); hero ≤41 chars one-line / 82 two-line; subhead
108–186 chars; never center body prose.

## Voids → actions

| # | Void | Action | Status |
|---|---|---|---|
| 1 | HTML comments leak into DOM | strip all `<!-- -->` from .astro templates; prebuild gate | TODO |
| 2 | Hydration crash | transition:persist dropped, astro:end strip | ✅ done (0 errors) |
| 3 | Title alignment | `data-align="center|start"` PageHeader contract | TODO |
| 4 | Uneven card grids | `data-cols="4|2|1"` + `data-even` (grid-auto-rows:1fr) | TODO |
| 5 | Underline-on-hover | card-hover contract (lift+glow+shift+slide); Underline Draw for standalone links; no bold/scale on text | TODO |
| 6 | AI discoverability | JSON-LD: Organization, SoftwareApplication, FAQPage, BreadcrumbList (llms.txt deprioritized — ~10% adoption, no citation uplift) | TODO |
| 7 | Performance | island directive audit (idle/visible for non-critical); Lighthouse budgets LCP≤2.5s INP≤200ms CLS≤0.1 | ✅ budgets shipped (lighthouserc.json + `verify:perf`, fix-plan `p31ca-inp-lighthouse-budgets.md`); island audit → next wave |
| 8 | MCP discoverability | `server/discover` mandatory RPC | ✅ done (fleet wave) |
| 9 | Agent posture | robots.txt Content-Signal: search=yes, ai-input=yes, ai-train=no | TODO |

## a11y gates (added to prebuild)

Zero console errors · axe-core on /, /apps/mcp, /journey at 1280+390 ·
WCAG 2.2 AA five new criteria (2.4.11 focus not obscured, 2.5.8 target
size, 3.2.6 consistent help, 3.3.7 redundant entry, 3.3.8 accessible
authentication) · inline prose links underlined always (1.4.1).