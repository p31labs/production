# Canon Full Migration — Parallel Path Manifest

**Objective:** One canon. `@p31ca/design-core@3.0.0` is THE design system. No
parallel "canon" systems, no forks, no ambiguity. Every portal, app, MCP server,
and gate resolves to it — by lookup (ground-truth invariant), not inference.

**Layered architecture (corrected 2026-09-30):**
- `@p31ca/design-core@3.0.0` = the **visual canon** (Quantum Material; tokens,
  compositions/chrome, genui catalog). Consumed by `design.p31ca.org`. This is
  THE design system.
- `@p31ca/canon@0.1.0` = the **contract / governance layer** — component
  contracts (Badge, Button, …) validated by the Loom agent + the WIMSE DSSE audit
  log. It is NOT a competing design system; it audits design-core's components.
  **Keep it** (contracts are not chrome).
- `@p31ca/ui@1.3.1` = parallel vendored package; chrome promoted into design-core.
  **Retire** (its chrome exports are superseded by `@p31ca/design-core/compositions`).

**The confusion fix is naming clarity, not deletion:** the visual canon is
design-core; the contract layer is canon; they are different layers, not rivals.

**Invariant (registered):** `design-system-canonical-source` in
`~/p31-agents/ground-truth.json` — owner `@p31ca/design-core@3.0.0`,
explicitly-not `@p31ca/ui@1.3.1`; `@p31ca/canon` is the contracts layer, not chrome.

**Baseline (2026-09-30):** `canon-source-audit` reports **37 forks fleet-wide** —
every portal re-defines `--p31-*` tokens and/or hand-rolls chrome the canon ships.
This manifest is the migration to zero.

**PROGRESS (P6 + P7 chrome done):** both flagship portals (design, forge) are
**chrome-clean** — every canon composition is consumed, not forked. `renderItem`
added to SidebarNav/MobileBottomNav so consumers keep real `<a href>` semantics.
Remaining forks fleet-wide: each portal's `tokens.css` (token adapters — the gate's
R1 now distinguishes an adapter `--p31-x: var(--p31-canon)` from a fork; see below)
+ the forge's grandfathered Topbar (P7b). The canon-audit R1 rule now allows
adapter-style token defs that reference a canon token (and blocks raw literals +
self-cycles), so portal token adapters no longer need the `--allow` list.

**PROGRESS (P2 done):** 4 chrome components promoted into design-core
(SidebarNav, MobileBottomNav, CalmOverlay, NotificationStack — props-driven, store-agnostic,
token-clean). Fork-gate now exposes **17 component-duplicates** across design/forge/
mcp-marketplace/qpj/workspace as migration targets. **Known baseline issue:** token-audit
fails on 7 pre-existing `generated-wc/*.js` files (raw rgba, regenerated earlier —
unrelated to P2; needs a separate generated-wc cleanup).

## Parallel paths (disjoint writes — no two paths touch the same file)

| Path | Purpose | Depends on | Writes | Blocking for |
|---|---|---|---|---|
| **P1** | State the invariant | — | `p31-agents/ground-truth.json`, `VERIFIED_FACTS.md`, `packages/design-core/DESIGN.md`, `AGENTS.md` | all |
| **P2** | Promote 4 chrome components into canon | — | `packages/design-core/src/compositions/`, `src/css/chrome.css` | P5, P6, P7 |
| **P3** | Install the fork gate | — | `tools/canon-audit/`, gate registries, boundary rules | P6, P7, P8 |
| **P4** | Retarget canon-mcp (chrome→design-core, contracts stay) | — | `packages/canon-mcp/`, `opencode.jsonc` | — |
| **P5** | Registry + marketplace UI | P2 | `packages/design-core/registry.json`, `design/src/routes/Catalog/` | P9 |
| **P6** | Migrate design portal chrome | P2, P3 | `production/portals/design/src/components/` | P8, P9 |
| **P7** | Migrate forge chrome | P2, P3 | `production/portals/forge/src/components/`, `src/tokens.css` | P8, P9 |
| **P7b** | Forge Topbar (grandfathered, composed) | P7 | `production/portals/forge/src/components/Topbar.tsx`, `gates.json --allow` | P9 |
| **P8** | Retire @p31ca/ui (keep canon contract layer) | P3 | `apps/*/`, docs, `packages/ui/` | P9 |
| **P9** | Convergence + synthesis | P5, P6, P7, P8 | synthesis doc | — |

## Waves

```
Wave 1 (parallel):   P1  P2  P3  P4
Wave 2 (parallel):   P5  P6  P7  P8     (P5/6/7 wait on P2; P6/7 wait on P3)
Wave 3 (converge):   P9
```

## Disjoint-write proof

- P6 writes `production/portals/design/src/components/`; P5 writes
  `production/portals/design/src/routes/Catalog/` — different subtrees.
- P7 writes `production/portals/forge/` — a different repo dir.
- P8 writes `apps/` + `packages/{canon,ui,...}` — disjoint from all portals.
- P1 writes ground-truth + docs; P3 writes `tools/canon-audit/` + gate registries.

## Runbooks

Each path has a runbook in `runbooks/`:
`RUNBOOK-canon-P1.md` … `RUNBOOK-canon-P9.md`.

## Gate (drives to zero)

```
node /home/p31/production/tools/canon-audit/canon-source-audit.mjs
```
BLOCKING. Current: 37 forks (fail). Target: 0 forks (pass). Every path that
touches a portal/app runs this gate after its edits and must not add new forks.

## Anti-drift guards

- Single writer per fact (the manifest table).
- The ground-truth invariant is the authoritative "what is canon" answer.
- Every gate has a negative control (`nc/canon-source-audit-nc.mjs`).
- `--allow` in the gate command marks a file as "migration in progress" —
  paths MUST remove their `--allow` entries before P9 declares convergence.

**PROGRESS (Move 3 done):** canon-source-audit wired fleet-wide — design+forge gates.json
(BLOCKING + NC), mcp-marketplace/qpj/workspace deploy pre-build, canon-mcp find_usages
registry-informed (canonical_file field). 12 chrome component baselines captured
(tools/design-parity/chrome-baselines/). parity_chrome tool added (per-component visual
verification, threshold 10%, seeds baseline on first capture). **Latent bug fixed:** the
catalog generator emitted CatalogSchema.parse(COMPONENT_CATALOG) — parsing an array
against an object schema — which crashed the design portal on mount; wrapped the array
in { v, generatedAt, components }.