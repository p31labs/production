<!-- P31-HEADER
id: p31_parallel_paths_runbook_20261013_v1.0
type: runbook
component: docs/enterprise/design-system
status: live
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# Parallel-Paths Enterprise Runbook — design-system unification

Phase 0 deliverable 4a. Governs the estate-wide unification of the P31
design system. Authority order: this file is advice scoped to the
unification program; AGENTS.md and AGENT-RUNBOOK.md remain the harness
authority. All editing rules (Phase 0 read-only, fix-plan filing, no
deletes, byte-caps) apply to every agent executing any phase below.

## 1. Estate map — two rendering worlds, one design system

| World | Surfaces | Rendering | Current token wiring |
|---|---|---|---|
| **Astro sites** | `apps/p31ca` (39 pages, p31ca.org — the hub), `apps/phosphorus31` (0 routed pages, 2 orphaned views) | Astro 6, static (p31ca = SPA ClientRouter + cloudflare adapter) | p31ca: `@p31ca/canon/tokens.css` + own `:root` override (rose accent) + Tailwind v4 `@theme` hex + local canon mirror in `p31-style.css`. phosphorus31: design-core `all.css` + own Tailwind hex palette, unrouted |
| **React/Vite portals** | `portals/` (shell, design, mcp-marketplace, chat, children, parent, teen, meatspace, qpj, workspace, forge, env-portal, ui-forge-studio) + `shell/` (the shared chrome app) | React 19 + Vite | design-core `all.css`/`index.css` (legacy unlayered) + per-portal token forks (`design/src/tokens.css` concrete values; `mcp-marketplace/src/tokens.css` alias adapters — the correct pattern) |
| **Shared packages** | `packages/canon` (tokens + contracts + registry), `packages/design-core` (components + css), `packages/shell-chrome`, `packages/ui*` | npm workspace | canon generates DTCG (661 tokens) + CSS from `theme-store.ts` |

The split that matters: **Astro surfaces compile once, statically; portal
surfaces hydrate React at runtime.** One token core feeds both, but each
world needs its own thin wrapper (next section). Never try to make one
wrapper serve both.

## 2. Three-layer target

```
L1  DTCG TOKEN CORE        packages/canon — tokens.dtc.json (SSOT, generated
                           from theme-store.ts). One palette, one scale, one
                           font, one header-height. Validated by dtokens.
L2  WRAPPERS (one per world)
    canon-astro            @p31ca/canon-astro-style — CSS custom properties
                           + the page/layout contracts (PAGE-CONTRACTS.md)
                           for Astro sites. Static, no JS.
    canon-react            @p31ca/canon-react-style — the same tokens as
                           CSS vars + attribute-scoped component CSS
                           (canon-v2.css) for React portals.
L3  SURFACES               p31ca pages, phosphorus31 pages, portals. Surfaces
                           import ONLY their world's wrapper. Faces ship no
                           CSS (canon-v2 §5 step 6).
```

- L2 wrappers are generated from L1 — never hand-maintained (token-
  architecture.md §Governance).
- A surface that declares its own `--p31-*` value is a violation the
  moment L2 lands (today: p31ca global.css, shell, portal-design).
- A surface that aliases L2 names with `var(--p31-...)` is fine
  (mcp-marketplace pattern).

## 3. Four tracks (parallel work streams)

**Track A — tokens (owns L1).** Merge the 20 token sources
(`token-inventory.md`) into the DTCG core. Decide the 5 owner decisions
(§6). Re-generate, re-vendor, kill per-surface forks. Canon-owner gated
(`runbooks/RUNBOOK-canonical-source.md`). Material: the drift table.

**Track B — Astro surfaces (owns p31ca + phosphorus31).** Apply
PAGE-CONTRACTS.md to every page: container → header → grid → badge
(`page-audit.md` violation list is the work queue). Deliver canon-astro
wrapper, then migrate page-by-page with `templates/page-migration.md`.

**Track C — portals (owns React/Vite world).** Wrap legacy design-core CSS
in `@layer legacy`, port face-by-face to `[data-p31=...]` components
(canon-v2 §5), adopt the alias-adapter pattern for portal-only names,
re-vendor the frozen tgz bundles (`portals/mcp-marketplace/vendor/`).
Per-portal runbooks already exist for mcp-marketplace; replicate the
pattern.

**Track D — steering (owns the program).** This runbook + the contracts +
the gates. Publishes the track status, files fix-plans for every finding
(the Ownership Contract: every discovered violation is filed work),
updates STATE.md focus lines only via the session owner. Track D never
touches code.

**Dependency edges:** B and C both block on A's five decisions. B and C
never edit each other's files. D reviews both at phase gates.

## 4. Phases

**Phase 0 — audit (this phase, DONE by the audit set).**
Deliverables: `token-inventory.md`, `page-audit.md`, `PAGE-CONTRACTS.md`,
this runbook, `templates/*`. Read-only. Exit: the five owner decisions
(§6) are made and recorded here.

**Phase 1 — token decisions land (Track A).**
Owner signs the five decisions; canon-owner edits theme-store.ts;
`gen:tokens` regenerates DTCG + CSS; `validate-registry.mjs` +
`dtokens check` + token-parity gates green. Exit: L1 has one value per
name; the drift table has a "resolved" column.

**Phase 2 — wrappers ship (A feeds B and C).**
`canon-astro` wrapper (CSS vars + page contract utilities) and
`canon-react` wrapper (canon-v2.css + layers) are generated and published
to the workspace. Exit: a surface in each world can import its wrapper and
render a smoke page with zero local CSS.

**Phase 3 — surface migration (B and C in parallel).**
B: migrate p31ca pages in `page-audit.md` order (containers first, then
headers, grids, badges) using `templates/page-migration.md`; phosphorus31
decided per §6 decision 5 (wire the views or archive). C: portal legacy
quarantine + face-by-face port. Every migrated page runs the mechanical
grep checks from PAGE-CONTRACTS.md. Exit: violation counts reach zero on
the migrated set; render-gate A1–A8 green.

**Phase 4 — deletion leg.**
Only after every consumer of a legacy source has ported: delete the fork
files (tokens.css forks, local mirrors) — through the OWNER's approval,
per the no-delete rule. Track D verifies no import remains
(`grep -rn` first, delete second).

**Phase 5 — lock-in.**
Promote the mechanical checks into `pnpm gate` (Law 7: sensors, not
prose): the PAGE-CONTRACTS greps become `scripts/page-contracts.mjs`;
token-parity and canon-purity gates run on every build; the
`token-propagation.md` template becomes the mandatory procedure for any
future token edit. Exit: a surface that violates a contract fails the
build, not a review.

## 5. Rollback conditions

Roll back a phase — never forward-fix around it — when any of these fire:

1. **Gate red on generated artifacts.** If `gen:tokens` output fails
   `dtokens check` or `validate-registry.mjs` after a Track A edit,
   revert the edit, not the validator.
2. **Visual regression beyond the reference set.** If a migrated surface
   differs from the `e6ff2571` reference (or its approved replacement
   snapshot) in alignment, width, or header rhythm, revert that page's
   migration and re-file. The reference is the contract for B.
3. **Cascade flip in portals.** If wrapping legacy CSS in `@layer legacy`
   changes a live portal's rendering (the canon-v2 §"Interim state"
   warning), revert the quarantine immediately and quarantine per-face
   during the port instead.
4. **Perf gate breach on p31ca.** If a migration wave pushes TBT over
   200ms or Lighthouse below 0.9 (the `verify:perf` contract from the
   visual-nav fix), revert the wave; the WebGL dome is the known suspect.
5. **Build never deploys without owner sign-off.** No phase deploys
   while any fix-plan it depends on is unfiled (fix-plan-scan red).

Rollback unit: one track step, one surface, or one token group — never a
manual re-edit of generated files (re-run the generator instead).

## 6. Five owner decisions — evidence + recommendations

**D1 — Which color is `--p31-accent` on p31ca.org?**
Evidence: canon SSOT exports cyan (`theme cipher`, `p31.color.accent` hue
200; portal-design hue 195); the live site overrides to rose
(`oklch(65% 0.14 45)`, `global.css:7`), mirrored by legacy dc-canon and
the shell; Tailwind `hubRose #e8636f` matches the rose fork; enterprise
and flagship pages visibly render rose today.
**Recommendation:** cyan is the estate identity (canon, portal-design,
rebel persona all agree); move the rose to a theme VARIANT (`data-theme`
swap at the semantic tier — Law 3), never a fork. Acknowledge the live
site has been rose for months: this is the highest-visibility decision.

**D2 — Which radius scale?**
Evidence: three live scales — 8/12/24 (canon + portal-design), 2/4/8
(p31ca override + shell + dc-canon legacy), 6/4/8 (caretaker) — plus the
DTCG export's own 8/16/24, which matches nothing shipped.
**Recommendation:** adopt the DTCG export (8/16/24) as the one scale and
make the CSS export match it (today canon CSS says 12/24 while DTCG says
16/24 — the package disagrees with itself). 2/4/8 dies with the legacy
quarantine.

**D3 — Which header height and name?**
Evidence: `--p31-header-height: 4rem` is the canon-v2 contract and
MarketingShell already emits it; shell legacy still declares 61px
unlayered (filed drift); `--p31-topbar-height: 56px` exists in p31ca,
dc-canon, and the shell as a second name.
**Recommendation:** ONE name — `--p31-header-height`, value 4rem.
Delete `--p31-topbar-height` consumers at port time; the 61px rule dies
with the legacy quarantine. No third option has evidence.

**D4 — Which font stack?**
Evidence: Inter (canon CSS export, portal-design), Plus Jakarta Sans
(p31ca, shell, dc-canon), Space Grotesk (DTCG export), JetBrains Mono as
body (phosphorus31 Tailwind theme). The DTCG and CSS exports of the same
package disagree.
**Recommendation:** make the DTCG source authoritative and regenerate CSS
from it — whatever S1/S5 says wins, and the mismatch between the package's
two exports is fixed as a bug, not a choice. If the owner prefers Jakarta
(used by the hub today), change it ONCE in the token store, then
regenerate.

**D5 — What happens to phosphorus31?**
Evidence: zero routed pages (`src/pages/` has only `api/health.ts`);
HomeView/TransparencyView are orphaned components; both layouts unrouted;
its token wiring (S18/S19) is unconsumed; manual-posts.json holds content
(a blog post, including "live in production" copy).
**Recommendation:** two options, owner picks: **(i) fold** — move the
views' content into p31ca (or archive the app), treating manual-posts.json
as content to migrate; or **(ii) wire** — build the two views as real
Astro pages under BaseLayout consuming the canon-astro wrapper, and port
the Tailwind hex palette to token aliases. Either way, nothing blocks the
other tracks on this decision — it is independent and can land any phase
before Phase 4.

## 7. Reference files (read these before executing any phase)

- `docs/enterprise/design-system/token-inventory.md` — the 20 sources + drift table (Track A input)
- `docs/enterprise/design-system/page-audit.md` — the violation ledger (Track B input)
- `docs/enterprise/design-system/PAGE-CONTRACTS.md` — the four mechanical contracts
- `docs/enterprise/design-system/token-architecture.md` + `contract.md` + `canon-v2.md` — the standing canon law
- `templates/page-migration.md`, `templates/token-propagation.md`, `templates/astro-surface/`, `templates/portal-surface/` — the how-to kits
- `docs/fix-plans/p31ca-visual-nav-fix-2026-10-13.md` — the reference alignment set + perf contract