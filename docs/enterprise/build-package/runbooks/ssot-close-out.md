<!-- P31-HEADER
id: p31_ssot_close_out_20261010_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-10T00:00:00Z
owner: will
-->

# Final Parallel Paths — Close-Out Runbook

> **Purpose:** Sequence every remaining thread from the SSOT / npm-migration /
> catalog-governance arc into parallel tracks, so the workspace returns to
> creation. The infrastructure is done; this runbook is what remains.

## Research synthesis — what the specs now say

1. **DTCG v1 is stable; 2025.10 is the target.** As of late 2025 the DTCG format
   has a stable v1 spec. 2025.10 keeps `$value`/`$type` and adds structured
   values — the shape `tokens.dtc.json` already uses. No format migration needed.
2. **Deprecation is a three-phase lifecycle; the workspace is mid-phase-2.**
   Mark → migration window → retire. "Minimum one major version between
   deprecation and removal." The 152 tokens are marked, codemod + gate exist,
   but the migration window has not elapsed.
3. **`$replacement` is the standard auto-migration field.** Present for 19 of 152
   tokens. The 133 without it are dead (no successor) and delete at v1.0.0.
4. **pnpm native versioning (`versioning.fixed` + `pnpm change check`).** The
   fixed group was removed after `pnpm change check` caught canon/design-core/ui
   out of lockstep — correct, the group is aspirational until aligned.
5. **`catalogMode: strict` gotcha is real.** `pnpm up --latest` rewrites
   inline-versioned deps to `catalog:` under strict mode. Set `catalogMode: manual`
   during bulk updates. Doesn't bite today (catalog holds only the design trio).
6. **Token governance is two-fold.** Token governance (propose/review/name/retire)
   exists as gates; ownership governance (who decides, how disagreements resolve,
   cadence) is unstated.

## Where the workspace stands

Closed (larger than open):

| Thread | State |
|---|---|
| SSOT token consolidation (flip) | Closed `0be3bbe` |
| npm scope `@p31/` → `@p31ca/` | Closed `df263a4` |
| 4 orphaned unscoped publishes deprecated | Closed `13f7932` |
| Publish-surface guard | Closed `d132fd6` |
| 152 tokens deprecated (DTCG `$deprecated`) | Closed `190d17d` |
| Token-parity guard | Closed `03e5a02` |
| Codemod for deprecated tokens | Closed `aff2f30` |
| design-mcp worker buildable | Closed `e1a2cdd` |
| Catalog divergence characterized | Closed `df80db9` |
| Token-vocabulary inventory (step 1) | Closed `df6a909` |
| Token-vocabulary runbook (step 2 kickoff) | Closed `2b1c927` |
| Stale `p31labs/P31-local-workspace` URLs | Closed `3022a8a` |

Open, in dependency order:

| Thread | Blocked on |
|---|---|
| Vocabulary decision (migrate CLI → `p31.*`) | User call |
| design-mcp deploy | Wrangler credentials |
| Matcher child-class fix | `registry.json` schema decision |
| 14 unwritten contracts disposition | Per-component judgment |
| Codemod exercised against real consumer | A consumer ready |
| `canon@1.0.0` cut | Deprecation window elapsed |
| `cli/component-registry.js` reconciliation | Third catalog, separate |
| `tools (1)/` duplicate | Filesystem consolidation |
| External-dep catalog | pnpm #8999 linked-path fix |
| pnpm 12 upgrade | Q1 2027, before EOL |

## Critical path to creation

### Track A — Vocabulary decision + migration (the one that matters)

**Blocked on:** the user's decision. Migrate CLI tooling to `p31.*` DTCG
(recommended — canon already uses it) or keep `primitive.*` and re-express
`componentDefs.ts`.

If approved: step 2 (9 category rows + per-token exceptions for the 74-leaf
component group) → step 3 (partial-merge generator, nested output form) →
step 4 (repoint 8 consumers, one commit each) → step 5 (vocabulary gate) →
step 6 (delete hand-maintained yml). Estimated 2–4 sessions.

### Track B — design-mcp deploy (5 minutes)

**Blocked on:** wrangler credentials.

```bash
cd /home/p31/production/workers/design-mcp && npx wrangler deploy
```

### Track C — Catalog completion (independent of A and B)

1. Matcher child-class fix — `childClasses` array per component (SpoonDial →
   `[spoon-btn, spoon-dot, spoon-crisis-btn]`, NotificationStack → `[notif-toast]`,
   PageHeader → `[page-lede, page-actions, hero-eyebrow]`, SectionStrip →
   `[section-tab]`); update `token-consumption.mjs` `belongs()`.
2. 14 unwritten contracts — mark `planned`, re-home CSS, or delete.
3. `cli/component-registry.js` — third catalog, regenerate or deprecate.

### Track D — Release cadence (time-gated)

`canon@1.0.0` removes the 152 deprecated tokens + renames `shapeMorph` →
`shape-morph`, after the deprecation window.

### Track E — Deferred

External-dep catalog (pnpm #8999), pnpm 12 (Q1 2027), `tools (1)/` duplicate.

## What "return to creation" requires

1. The vocabulary decision (only genuine blocker).
2. The design-mcp deploy (stale MCP → current 32-component view).
3. Nothing else — matcher/contracts/third-catalog/release are hygiene.

## Convergence gates

```bash
node scripts/check-p31-scope.mjs
node scripts/check-workspace-protocol.mjs
node scripts/check-publish-surface.mjs
node scripts/check-deprecated-tokens.mjs
node scripts/check-token-parity.mjs
pnpm change check
pnpm gate
git status --porcelain | wc -l   # 0
```

All exit 0 (verified 2026-10-10), clean tree.

## The two numbers

```bash
# Closed:
node scripts/check-p31-scope.mjs && node scripts/check-workspace-protocol.mjs \
  && node scripts/check-publish-surface.mjs && node scripts/check-deprecated-tokens.mjs \
  && node scripts/check-token-parity.mjs && pnpm change check && pnpm gate

# Creation begins (verified 2026-10-10):
npm view @p31ca/canon@0.2.0 dist.tarball | xargs curl -sL \
  | tar -xzO package/tokens/tokens.dtc.json | grep -c '"\$deprecated"'
# → 121
```

## EL FIN

Six arcs, one through-line: SSOT token consolidation (one source) → npm scope
migration (one scope) → catalog reconciliation (one definition) → deprecation
lifecycle (one future) → governance gates (one check) → this runbook (one plan).

The infrastructure is done. Every gate proven fail-able, every fix filed, every
accident documented. What remains: the vocabulary decision (yours), the deploy
(credentials), and maintenance tracks (background). The creation can begin.