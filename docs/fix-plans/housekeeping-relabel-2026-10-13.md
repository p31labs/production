<!-- P31-HEADER
id: p31_fix_plan_housekeeping_relabel_20261013_v1.0
type: fix-plan
component: workers/mcp-registry + packages/ui + cli/tokens + legacy public html
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# fix-plan: housekeeping + catalog relabel wave — 2026-10-13 (lane 2)

**Discovered by:** agent:subagent:housekeeping-catalog-relabel (lane 2 of the
perf + housekeeping wave).
**Discovered at:** 2026-10-13T00:00:00Z
**Severity:** medium — catalog honesty (5 non-MCP entries asserting MCP
conformance) + heading-hierarchy drift across canon chrome and legacy pages.

## 1. Catalog relabel — non-MCP connectors (workers/mcp-registry)

### The locked precedent

`docs/fix-plans/false-mcp-members-relabel.md` (2026-10-11, owner-locked):
federation-bridge + ledger-bridge were relabeled from false MCP members to real
roles — **relabel, not remove** — using exactly two markers on the kept row:

- `role: '<real role> (not MCP)'`
- `protocol: 'n/a — not an MCP server'`

### Applied to the 5 residual entries (OFFICIAL_CATALOG)

Each of the 5 entries keeps its row, endpoint, category, and icon; gains the
two marker fields; descriptions made honest:

| Entry | File:line (role) | File:line (protocol) | Description change |
|---|---|---|---|
| roblox-bridge | src/index.ts:334 | src/index.ts:335 | "(14 tools)" → "15 HTTP tools over /tools/list + /tools/call. No MCP surface" (worker really has 15 REST tools — workers/roblox-bridge/src/index.ts:24-94) |
| vision-reviewer | :501 | :502 | + "AI vision POST endpoint, not an MCP surface" |
| vision-layout | :524 | :525 | same |
| vision-sensory | :547 | :548 | same |
| vision-identity | :570 | :571 | same |

- `P31_ROLES` map updated to match (src/index.ts:606, :617-620).
- Probe-exclusion helper `isNonMcpConnector` (src/index.ts:595) — mirrors the
  existing `source === 'official'` / `kind === 'local'` skip pattern:
  - `probeTools` :1214-1215 → `null`
  - `probeHealth` :1278-1280 → `status: 'unknown'` + detail
    "non-MCP connector — not probed (relabeled)"
  - `probeConformance` :1377-1378 → `null` (badge excludes them)
  - `getToolSchemas` :1459-1460 → `[]`

### Conformance script exclusion (scripts/verify-mcp-conformance.mjs)

`readOfficialCatalog` now also picks `protocol` (:62) and the remote filter
(:69) excludes entries whose protocol starts with `'n/a'` — extending the
existing `kind === 'remote' && endpoint.startsWith('http')` exclusion line
(the only pre-existing exclusion mechanism; federation/ledger were simply
never cataloged).

### Evidence

- Before: `node scripts/verify-mcp-conformance.mjs` → 12/17, exit 1, 5 gaps
  (roblox-bridge + 4 vision-*).
- After: **12/12 fully conformant, exit 0** — the 5 relabeled entries are
  excluded, not failing.
- `npx tsc --noEmit` clean; vitest **110/110** (workers/mcp-registry).
- Deployed: wrangler deploy → version ID
  **f8455a73-b5fa-4336-9108-06ce61a7018e**.
- Live `GET https://mcp-registry.trimtab-signal.workers.dev/servers`: all 5
  entries show `role: '… (not MCP)'`, `protocol: 'n/a — not an MCP server'`,
  `health: 'unknown'`, `conformance: null`, `toolCount: 0`.
- `node scripts/mcp-health-check.mjs` before AND after: **16/16 healthy**
  (those entries were never in the opencode config's healthy set — verified).

## 2. @p31ca/ui Footer h4s → h2 (packages/ui/src/chrome/Footer.tsx)

Footer column titles "Products" / "Organization" are real nav-group headings —
the right level for a footer landmark section is h2 (h1→h2, never a jump):

- :38 `<h4 …>Products</h4>` → `<h2 …>Products</h2>`
- :47 `<h4 …>Organization</h4>` → `<h2 …>Organization</h2>`

Matches rule (f) of the neurodivergent gate
(apps/p31ca/scripts/check-neurodivergent.mjs — H1→H2→H3, no skips, ≤3 levels,
h4+ banned), whose dist leg still strips footer chrome pending this canon fix.
The package declares no tsc/test scripts (package.json has no `scripts`) — no
test leg to run; classes carry size/weight/color so appearance is unchanged
under Tailwind preflight.

## 3. cli/tokens/components.yml regeneration

The file was a stale 32-component subset of canon (Split + 19 others missing —
filed at docs/fix-plans/canon-split-keyboard-fallback.md:110). Regenerated with
the existing generator (no hand-edit — the file header forbids it):

```
node packages/design-core/scripts/generate-components-yml.mjs          # 32 → 52 components
node packages/design-core/scripts/generate-components-yml.mjs --check  # OK (52, deterministic)
```

`Split:` now present at cli/tokens/components.yml:1746 with the full canon
definition (draggable handle, WCAG 2.5.7 keyboard fallback, 47.99rem stacking).

## 4. Legacy public/*.html heading hierarchy

Scanner: /tmp/opencode/scan-headings-full.mjs (144 files, portals + shell +
campaign + archive + prototypes + monetization + packages + apps, excluding
apps/p31ca, portals/mcp-marketplace, node_modules/dist/build/generated).

| File:line | Change |
|---|---|
| packages/bonding/public/heartbeat.html:233, :268 | start-prompt overlay title was the first heading (h2) → presentational `div.start-title` (+ CSS selector `.start-prompt h2` → `.start-prompt .start-title`); page h1 at :273 now first |
| archive/software/bonding/public/heartbeat.html:233, :268 | identical copy — same fix |
| packages/jitterbug-pwa/public/visual-translator.html:146, :174, :203, :236, :271 | 5 presentational "Key Phrase to Use:"/"How to Use:" h4 labels → `p` (same classes) |
| portals/design/catalog.html:28 | DATA string "Semantic <header> + <h1>" → `\u003C`-escaped (data, not markup; rendered value unchanged) |
| prototypes/p31-shell.html:227 | added sr-only `<h1>P31 Shell</h1>` as first heading |
| prototypes/p31-shell.html:131, :314 | hero block title h1→h2 (single-h1 page: sr-only h1 + hero h2; CSS selector `.hero h1`→`.hero h2`) |
| apps/phos/public/qa-dashboard.html:242, :256 | presentational "Printer Baseline"/"Fleet Status" h3 labels → `p` (h1→h3 skip removed) |
| apps/phos/public/qa-dashboard.html:306 | QRScannerForm component definition moved below App — dialog h2 no longer precedes the page h1 in source (render order unchanged) |
| apps/phos/public/qa-dashboard.html:186 | crisis branch (spoons=0) had zero headings → sr-only h1 |
| apps/phos/public/diy-workspace.html:138 | PartCard part name h3 inside a `<button>` → `span` (no headings inside interactive content) |
| apps/phos/public/diy-workspace.html:357 | presentational "Assembly Steps" h3 label → `p` (h1→h3 skip removed) |
| apps/phos/public/diy-workspace.html:235 | crisis branch sr-only h1 |
| apps/bonding/public/arrow/molecule-widget.html:119, :132 | page title h2→h1; "Water Molecule" h3→h2 (first=h2 fixed) |
| apps/a2ui-renderer/index.html:494-520 | `case 'GlassCard'` (h3 builder) and `case 'CTABlock'` (h2 builder) source-order swap — rendered order was already h1→h2→h3 |
| apps/a2ui-renderer/deploy/index.html:395-421 | same swap in the deploy copy |
| apps/archive/p31-homepage-perfect.html:706 | onboarding overlay title h2→presentational `p` (fixed-position overlay kept first in reading order) |

After: 0 heading-order problems in scope (remaining scanner hits: two
conditional-render dual-h1s in the phos demos — one h1 per render state,
never simultaneous; and packages/design-core/src/zephyr/Crown/Crown.zephyr.html
h1→h3 — a canon fixture, out of scope, noted below).

## Filed notes (for the owner — out of scope this pass)

1. **apps/p31ca CanonFooter API mismatch (pre-existing)** —
   apps/p31ca/src/components/islands/CanonFooter.tsx:9 imports
   `Footer, FooterColumn, FooterLink` from `@p31ca/ui/chrome`, but
   packages/ui/src/chrome/Footer.tsx takes no props (hardcoded columns).
   The data-driven API lives in packages/design-core/compositions/Footer
   (h3 column titles, hierarchy-fine). The hub-side import will not
   typecheck against the current @p31ca/ui — lane 1 (hub) should reconcile.
2. **packages/design-core/src/zephyr/Crown/Crown.zephyr.html** — h1→h3 skip in
   a canon component fixture. Canon edits are a contribution proposal, not an
   in-place fix (packages/design-core/AGENTS.md).
3. **shell/src/data/pocketCardData.tsx** — ~40 `<h4>`s in the shell's pocket
   cards. shell/ is outside this lane's edit scope; the hub's own "H4 collapse"
   wave is the queued owner item.
4. **qa-dashboard.html restoration** — the lane accidentally truncated
   apps/phos/public/qa-dashboard.html while reordering a component
   (dropped lines 1-172). Restored byte-identical from
   apps/phos/dist/qa-dashboard.html (md5 c763072f… matches) before applying
   the fixes. Both files now share the fixed content.

## Files changed

- workers/mcp-registry/src/index.ts (catalog rows + P31_ROLES + probe skips)
- scripts/verify-mcp-conformance.mjs (protocol pick + n/a exclusion)
- packages/ui/src/chrome/Footer.tsx (h4→h2 ×2)
- cli/tokens/components.yml (regenerated: 32 → 52 components)
- 12 legacy html files (table above)
- docs/fix-plans/housekeeping-relabel-2026-10-13.md (this plan)
- docs/fix-plans/conformance-remediation-wave-2026-10-13.md (① ② resolved)

## Evidence

- `node scripts/verify-mcp-conformance.mjs` — before: exit 1, 12/17; after:
  exit 0, 12/12.
- `node scripts/mcp-health-check.mjs` — before: 16/16; after: 16/16.
- mcp-registry tsc clean; vitest 110/110; deployed version f8455a73.
- `generate-components-yml --check` OK (52 components, deterministic).
- Full heading scan: 144 files, 0 in-scope violations.