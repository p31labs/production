<!-- P31-HEADER
id: p31_post_migration_creation_20261010_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-10T00:00:00Z
owner: will
-->

# Post-Migration Enterprise Runbook — From Infrastructure to Creation

> **Purpose:** The workspace has one source, one scope, one definition, one
> vocabulary, and ten proven gates. This runbook is the bridge from
> infrastructure to product. The next phase is creation — components, surfaces,
> agents, documentation — on top of foundations that no longer need rebuilding.

## Research synthesis — six findings that shape the runbook

1. **Treat the design system as a product whose customers can route around it.**
   The hard problems are organizational — sustained investment, a governance
   model that survives 10× adoption, making the system the path of least
   resistance — not token/component engineering.

2. **Governance model must match organizational scale.** Start centralized,
   evolve toward hybrid, federate only deliberately. Pick the model that
   survives the next 10× change, not the current headcount.

3. **Version the library as the public contract it is.** Major = removed/renamed
   prop or token, changed default, altered rendered output. Breaking changes must
   be mechanical for consumers: deprecation in a minor, codemod, migration note,
   removal in the next major. "A migration guide alone is homework; the codemod
   is the courtesy."

4. **The design system is a graph, not one package.** Tokens → themes →
   foundations → framework adapters → composed components → app patterns, kept
   acyclic. Lockstep versioning forces major bumps for unrelated changes;
   uncoordinated independent versioning strands consumers.

5. **Enterprise-grade means surviving use by people who will never meet you.**
   Tokens as data, multi-brand architecture, access control, versioned releases,
   adoption signal, machine-resolvable context, governance loop at forty teams.

6. **Contribution brings the outside in; it does not speed the system up.**
   The framework: who/how, should/could, contribution category (ground work →
   bug fix → content clarity → visual asset → content pattern → component →
   pattern).

## Where the workspace stands (verified 2026-10-10)

| Thread | State |
|---|---|
| SSOT token consolidation | Closed `0be3bbe` |
| npm scope migration | Closed `df263a4` |
| Catalog reconciliation | Closed `df80db9` |
| Deprecation lifecycle (152 tokens, codemod, gate) | Closed `190d17d` / `aff2f30` |
| Token-vocabulary migration (p31.* everywhere) | Closed `818f9c3` |
| Publish-surface guard | Closed `d132fd6` |
| design-mcp worker + local server | Closed `e1a2cdd` / `6f5cd5a` |
| Ten gates, each proven fail-able | Closed |
| pnpm 11.28.5 pinned, catalog `workspace:^` trio | Closed |

**Gaps** (verified absent): release cadence (no `versioning` policy wired),
contribution model, component lifecycle tiers (`registry.json` has `status`, not
`tier`), documentation site, adoption metrics, product surfaces.

## The four parallel tracks

### Track A — Release discipline (smallest, unblocks everything)

Without a release cadence, every design-system commit risks version drift.

**A1 — Independent versioning, not lockstep (decided 2026-10-10).** Do NOT add
a `versioning.fixed` group. The trio's divergence (`canon@0.2.0` pre-1.0,
`design-core@3.0.1` mature, `ui@1.2.1` between) reflects real maturity
differences — forcing alignment is a fiction, and lockstep forces major bumps
for unrelated changes (the research warns against exactly this). The coupling is
already expressed via `peerDependencies: { @p31ca/canon: workspace:* }`, which
pnpm rewrites to a concrete range on publish.

Replace the fixed group with:
1. **A compatibility gate** — on publish, verify each package's
   `peerDependencies` on sibling packages resolve to real published versions
   (no dangling `workspace:*`). The existing `check-workspace-protocol.mjs`
   covers the local side; add a publish-time peer resolution check.
2. **A per-package changelog** — each releases on its own cadence.
3. **A "supported combinations" note** — `canon@0.2.x` + `design-core@3.0.x` +
   `ui@1.2.x` is the current supported set, recorded in the changelog.

**A2 — `release:check` script** (done): full gate + `pnpm change check` +
`pnpm -r run --if-present prepack` + `pnpm publish --dry-run`.

**A3 — Wire the codemod into the release path:** a publish cannot run unless a
changelog entry names the migration.

### Track B — Contribution model (governance, not code)

**B1 — `CONTRIBUTING.md`** at repo root: proposal template, triage, review bar
(reused across 2+ surfaces or a named primitive; a11y baseline; contract;
changeset; docs page), lifecycle tiers.

**B2 — Add `tier: core | experimental | deprecated`** to `registry.json` items
(alongside the existing `status`).

**B3 — Proposal issue template** at `.github/ISSUE_TEMPLATE/component-proposal.md`.

### Track C — Documentation site (the readable catalog)

C1 foundations (color/typography/spacing/motion from `tokens.dtc.json`), C2
components (live demo, props, tokens, variants, a11y), C3 patterns (recipes),
C4 design-vocabulary search. The docs site is a consumer of the system — "if the
docs site can't be built with the design system, that's a signal."

### Track D — Creation (the destination)

D1 design portal as canonical demo, D2 MCP composition tools for agents, D3 a
product surface (bonding / phosphorus31 / marketplace). Test: a surface builds
and deploys without touching `packages/canon` or `packages/design-core`.

## Sequencing

```
A (release)  ──→ unblocks publishes
B (contribution) ──→ unblocks adding components
C (docs) ──→ unblocks adoption
D (creation) ──→ the destination
```

A and B run in parallel (~1 session each). C depends on B (tier must exist
before docs badge it). D depends on A and C. Critical path A → B → C → D; A and
B start immediately.

## Convergence gates

Existing (all stay green) + new:

- **Track A:** `pnpm change check && pnpm -r publish --dry-run --access public --no-git-checks`
- **Track B:** every `registry.json` item has a `tier`
- **Track C:** `count(registry.items) === count(docs/components/*.md)`

## Decision log

| Decision | Basis |
|---|---|
| Release first, contribution second | Version drift compounds silently; contribution is additive |
| Independent versioning over `versioning.fixed` | Trio versions reflect real maturity differences; peerDeps already express the coupling; lockstep forces unrelated major bumps |
| Tier in `registry.json`, not a separate file | Registry is the single source |
| Docs site is a consumer, not a special case | "if it can't build with the system, that's a signal" |
| Creation is Track D, not the whole runbook | Infrastructure is done; this is the bridge |

## What to watch for

- **A published package's `peerDependencies` dangle `workspace:*`** — the
  publish-time compatibility check (A1.1) should fail; the range must resolve to
  a real published version.
- **A component has no `tier`** — gate fails; that's the point.
- **Docs site can't build with only the system packages** — a component/token is
  missing; that's a finding, not a docs problem.
- **A product surface reaches into `packages/canon`** — abstraction leak; file a
  contribution proposal (Track B), not a workaround.

## The numbers

```bash
pnpm change check && pnpm -r publish --dry-run --access public --no-git-checks  # Track A
node -e 'const r=require("./packages/design-core/registry.json"); console.log("tiered:", r.items.filter(i=>i.tier).length, "/", r.items.length)'  # Track B → 32/32
find docs/components -name "*.md" | wc -l  # Track C → 32
cd portals/design && pnpm build  # Track D — builds on the system without modifying it
```

## EL FIN — the bridge

The infrastructure arc closed with ten gates and one vocabulary. This runbook is
the bridge to what they were for. Track A makes releases mechanical, B makes
contributions safe, C makes the system readable, D is the creation. Everything
before this was preparation; this is the threshold.