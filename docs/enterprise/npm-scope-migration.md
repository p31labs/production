<!-- P31-HEADER
id: p31_npm_scope_migration_20261009_v1.0
type: plan
component: workspace
status: live
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

# npm scope migration — `@p31/` → `@p31ca/`

## Objective

`@p31` was the original npm account (access lost); `@p31ca` is the replacement.
Eliminate every `@p31/` npm reference in `/home/p31/production` — renamed to
`@p31ca/`, deleted, or archived — and consolidate duplicate trees to one source
of truth. **Locked scope:** npm only (not GitHub `p31labs`, not the `p31`
substring, not `p31-*` dir names). Everything under `/home/p31/production`
migrates. All packages (re)publish under `@p31ca/`. `software/` consolidates
into `packages/` (option B).

## Inventory (measured 2026-10-09)

| Metric | Count |
|---|---|
| `@p31/` package occurrences (name fields) | 77 |
| … published (non-`private`) | 15 |
| … private | 62 |
| `@p31ca/` occurrences | 19 |
| `@p31/` dep refs (package.json) | 137 |
| `@p31/` import refs (`.ts/.tsx/.js/.mjs`) | 541 |
| old-scope tarballs `p31-*.tgz` | 7 names |
| new-scope tarballs `p31ca-*.tgz` | 8 names |

By tree: `packages/` 33 · `software/` 18 · `portals/` 9 · `workers (1)/` 9 ·
`apps/` 4 · `monetization/` 2 · `workers/` 2 · `tools/` 1 · plus the `@p31ca/`
names already in `packages/`.

## Duplication layers (diff-before-delete candidates)

1. **Scope collisions** — `@p31/foo` and `@p31ca/foo` both exist:
   - `@p31/game-engine` (`software/`) vs `@p31ca/game-engine` (`packages/`)
   - `@p31/quantum-core` (`software/`) vs `@p31ca/quantum-core` (`packages/`)
   → the `software/` copies are the old ones; `packages/` wins. DELETE software side.

2. **Same `@p31/` name in two trees** (`software/` vs `packages/`):
   - `bonding`, `interface-generator`, `shared`, `sovereign`
   → diff each; `packages/` is the canonical location, `software/` side DELETE.

3. **Same `@p31/` name in `software/workers/` vs `workers (1)/`**:
   - `creation-accountant`, `intent-resolver`, `mcp-x402-bridge`
   → `workers (1)/` is the full fleet (STATE.md); diff, keep the fuller copy.

4. **Vendored package** `@p31/p31ca-ambient` — legitimately duplicated in
   `portals/{design,forge}/vendor/` (vendoring, not drift). Rename scope only:
   `@p31/p31ca-ambient` → `@p31ca/p31ca-ambient`.

5. **Duplicate dirs** (combine to one source of truth):
   - `tools (1)/` (7 tools) → `tools/`
   - `docs (1)/` (153 entries) → `docs/`
   - `workers (1)/` (96, full fleet) → `workers/` (stale 2-worker subset)

## Phases

### Phase 0 — Migration map (this document + a machine map)
Freeze the disposition of all 77 occurrences: RENAME / DELETE / SPECIAL. The
collisions and within-@p31 duplicates above are pre-classified. No edits until
the map is frozen and its count reconciles (77).

### Phase 1 — Consolidate trees (one source of truth)
- Fold `software/packages/*` → `packages/`, resolving layers 1–2 (diff-before-delete).
- Fold `software/workers/*` → `workers (1)/` (→ `workers/`), resolving layer 3.
- Merge `tools (1)/`, `docs (1)/`, `workers (1)/` into their canonical names (layer 5).
- `software/` non-package dirs (`frontend/`, `backend/`, `firmware/`, `extensions/`,
  `docker-compose.yml`, own `pnpm-workspace.yaml`/lockfiles): classify to
  `apps/`, `archive/`, or delete — case by case, diff-before-delete.
- Delete `software/pnpm-workspace.yaml` + `software/package-lock.json` — root
  `pnpm-workspace.yaml` becomes the only workspace file.

Negative control: `git ls-files | grep -c software/` → 0; `ls "tools (1)"` fails.

### Phase 2 — Rename sweep (single pass)
`@p31/` → `@p31ca/` across all `name` fields, dep refs, and import refs, in one
coordinated pass (not package-by-package). Special: `@p31/p31ca-ambient` →
`@p31ca/p31ca-ambient`.

Negative control:
```bash
grep -rn '"@p31/' --include=package.json . | grep -v node_modules | grep -v archive/
# MUST be empty
```

### Phase 3 — Tarballs + vendor
`p31-*.tgz` → `p31ca-*.tgz`; update `file:vendor/...`, `sync-vendor.mjs` pinned
names, lockfiles. Resolves the `p31-ui` / `p31ca-ui` drift.

### Phase 4 — Catalogs (one source of truth for versions)
`pnpx codemod pnpm/catalog` to move shared dep versions into `pnpm-workspace.yaml`.

### Phase 5 — Publish
`pnpm -r publish --access public`. `pnpm publish` rewrites `workspace:*` to
concrete versions; `--access public` required for scoped packages (402 otherwise);
`-r` skips already-published versions. The 15 previously-published packages
republish under `@p31ca/`. Old `@p31/` names stay orphaned on npm (cannot
`deprecate`/`unpublish` — no ownership).

### Phase 6 — Verification gate (definition of complete)
```bash
grep -rn "@p31/" . --include="*.{json,ts,tsx,js,mjs,css}" \
  | grep -v node_modules | grep -v "@p31ca" | grep -v "archive/"
# MUST return empty
```
Wired as a named gate (`scope:p31-migrated`) so any future `@p31/` reintroduction
fails the build.

## Open decisions (need resolution during Phase 1, not before)

1. **The 4 `software/` vs `packages/` overlaps** (`bonding`, `interface-generator`,
   `shared`, `sovereign`): which copy is canonical? `packages/` is the default,
   but each needs a `diff -rq` to confirm no unique work lives only in `software/`.
2. **`software/workers/`** is itself a mini-workspace (own `package.json` +
   ~30 worker dirs). Folding it is more than a copy — its `package.json` deps
   must be re-scoped and its workers triaged individually.
3. **`software/` non-package dirs** (frontend/backend/firmware/extensions) —
   move-to-`apps/` vs archive vs delete, per directory.
4. **The 15 published packages** — confirm all 15 are still live (republish) vs
   any genuinely dead (archive locally, orphan the npm name).

## The number that proves this migration
```bash
grep -rn "@p31/" . --include="*.{json,ts,tsx,js,mjs,css}" | grep -v node_modules | grep -v "@p31ca" | grep -v archive/
```
Empty = complete. Anything else = a missed reference.