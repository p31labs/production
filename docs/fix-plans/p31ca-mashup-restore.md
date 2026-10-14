<!-- P31-HEADER
id: p31_fix_plan_p31ca_mashup_restore_20261012_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: archive-90d
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix: p31ca.org production mashup — cache bust + hero restore + Journey merge

## Symptom

Production showed a mashup: the dome, LED controller, and ⌘K palette were
missing live; the hero language was rewritten away from the reference build
(`e6ff2571`); a tier-2 product strip had appeared. The dome/LED/⌘K were
still in the shell source — the loss was a stale service-worker cache (v3)
mixing deployments.

## Fix (2026-10-12)

1. `public/sw.js` cache version v3 → v4 (activate deletes old caches —
   stale-shell mashups self-heal on next visit).
2. Hero restored to the reference copy: eyebrow `Act I · 01 · Invitation`,
   title `Ownable Tech Stack for Families That Build`, lede `This is the
   stack — now you own it. Self-owned identity, a care economy, and open
   research.`, primary CTA `Deploy Your Own`; live-stats strip kept.
3. Product row merged into the Journey system: `ProductRow.astro` retired
   (not rendered, kept on disk per no-delete); `JourneyNav` gained a
   `Products` section (7 surfaces) between Hub and `Doors`;
   `--p31-productrow-height` dropped — scroll-padding = header + 0.5rem.

## Verification

Production serves: hero copy restored (all 4 strings), `p31-ambient` (dome
container) + LedController + CommandPalette islands present, `sw.js`
CACHE_VERSION v4, zero `p31-productrow` references, `Products` section in
the Journey island bundle. prebuild + build green; deployed
`74d56e6c.p31ca.pages.dev`.