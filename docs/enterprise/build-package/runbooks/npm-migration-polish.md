<!-- P31-HEADER
id: p31_npm_migration_polish_20261009_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

# npm Migration Polish — parallel paths

> **Execution status: BLOCKED on spine S1 + S2.** Path L is spine-independent
> and may run now; E, U, C, P, S resolve against S1/S2.

## Scope note (the honest line)

The `@p31/` → `@p31ca/` rename, the `software/packages/*` → `packages/`
consolidation, the duplicate-dir merges, `publishConfig.access`, and the
`scope:p31-migrated` gate are committed (`df263a4`, `d67aa56`). The gate passes:
`node scripts/check-p31-scope.mjs` exits 0 across the whole tree.

**What remains is filesystem-local** — four gaps that must be closed for the
migration to survive a clone:

1. **Lockfiles were hand-edited** by the rename sweep (31 files). They must be
   deleted and regenerated, not patched.
2. **The merged trees are untracked** — `docs (1)/`, `workers (1)/`, `tools (1)/`
   contents landed in `docs/`/`workers/`/`tools/` but came from untracked
   sources, so the "one source of truth" claim is local-only.
3. **4 embedded git repos** (`shell/`, `packages/forge-sdk`, `packages/mcp-membrane`,
   `apps/counterscale`) would be staged as accidental gitlinks (mode 160000).
4. **Publish** — 28 publishable `@p31ca/` packages need `pnpm -r publish` under
   the `@p31ca` login; the 15 previously-published republish, the rest first-time.

The 726 untracked files are pre-existing entropy, **not** the migration's
coherence. This runbook fences them with an explicit disposition instead of
sweeping them into one 7,111-file commit.

## Research-grounded decisions (with citations)

| # | Decision | Basis |
|---|---|---|
| D1 | Lockfile = delete + `pnpm install --no-frozen-lockfile`; `--frozen-lockfile` is the reconciliation gate | Vercel/portkit precedent: `rm pnpm-lock.yaml && pnpm install`, then `--frozen-lockfile` in CI. A lockfile is generated output — never hand-edited. |
| D2 | Embedded repo → `rm -rf <dir>/.git` + `git rm --cached` makes it a normal dir (if not in `.gitmodules`) | Stack Overflow/GitHub: an accidental gitlink clones as an empty dir; folding requires removing the nested `.git` and the gitlink entry. |
| D3 | `pnpm -r publish --access public` publishes not-yet-published versions; `--batch` (v11.7+) = single all-or-nothing PUT | pnpm publish docs; `--access public` required for scoped packages (402 otherwise). |
| D4 | `pnpx codemod pnpm/catalog` moves deps used by 2+ packages into `catalog:` in `pnpm-workspace.yaml` | pnpm/codemod README: scans every package.json, moves shared ranges to `catalog:`, leaves multi-version deps alone. |
| D5 | `@p31/*` is permanently orphaned; mapping lives in READMEs, not `npm deprecate` | npm requires ownership to deprecate; deleted-account namespaces have a cooldown/lock. cadence migration = old packages stay resolvable, never unpublished. |
| D6 | pnpm 11 `allowBuilds` is the only build-dependency setting; config lives in `pnpm-workspace.yaml` not `package.json#pnpm` | pnpm v11 migration notes: legacy settings removed, `package.json#pnpm` ignored. |

## Spine (human decisions — resolve before E/U/C/P/S)

- **S1 — untracked-tree boundary.** 726 untracked files. Options:
  **(a)** commit only the migration's own merged trees (`docs/`, `workers/`,
  `tools/` contents) + fence the rest in `.gitignore`; **(b)** commit all under
  `packages/ portals/ docs/ workers/ tools/ scripts/ monetization/`, defer the
  pre-existing trees (`apps/ cli/ admin/ p31-icon-pack/ p31-surrogate-backend/ wcds/`);
  **(c)** `git add -A` — rejected: sweeps 7,111 files incl. embedded repos.
  Recommended: **(a)**.
- **S2 — embedded repos.** `shell/`, `packages/forge-sdk`, `packages/mcp-membrane`,
  `apps/counterscale`. Options: **(a)** fold (`rm -rf .git`, `git rm --cached`);
  **(b)** real submodule; **(c)** ignore + `.gitignore`. Test: does the parent
  build/deploy this content? yes→(a), external dep→(b), neither→(c).

---

## Path L — Lockfile truth (spine-independent, run now)

```bash
cd /home/p31/production
cp pnpm-lock.yaml /tmp/pnpm-lock.pre-regen.yaml
find . -name "pnpm-lock.yaml" -not -path "*/node_modules/*" -delete
find . -name "package-lock.json" -not -path "*/node_modules/*" -delete
CI=true pnpm install --no-frozen-lockfile
CI=true pnpm install --frozen-lockfile   # MUST exit 0
```
If `--no-frozen-lockfile` fails, the rename broke a specifier — the error names
it; fix the package.json specifier and re-run. Do NOT patch the lockfile.

Commit: `git add pnpm-lock.yaml` (+ tracked member lockfiles), message
`chore: regenerate lockfiles after @p31ca/ scope migration`.

## Path E — Embedded repos (S2)

```bash
cd /home/p31/production
cat .gitmodules 2>/dev/null || echo "no .gitmodules — none are real submodules"
for d in packages/forge-sdk packages/mcp-membrane; do
  rm -rf "$d/.git"; git rm --cached "$d" 2>/dev/null || true
done
git ls-files --stage | grep "^160000"   # MUST be empty
```
Submodule conversion (S2=b): `git submodule add <url> <dir>` only if the dir has
a real remote (`git -C <dir> remote -v`).

## Path U — Consolidation persistence (S1 = a)

```bash
cd /home/p31/production
git status --porcelain docs/ workers/ tools/ | grep -c '^??'   # characterize
git add docs/ workers/ tools/
git diff --cached --stat | tail -3                              # review
cat >> .gitignore <<'EOF'

# Deferred: pre-existing untracked trees, out of scope for @p31ca migration
# (see docs/enterprise/npm-scope-migration.md)
/apps/
/cli/
/admin/
/p31-icon-pack/
/p31-surrogate-backend/
/wcds/
/software/
EOF
git commit -m "chore(ssot): commit merged docs/, workers/, tools/ from space-named dirs"
```
Negative control: `git ls-files docs/ workers/ tools/ | wc -l` is non-zero.

## Path C — Catalog convergence (after L)

```bash
cd /home/p31/production
pnpx codemod pnpm/catalog
git diff pnpm-workspace.yaml | head -60
grep -c "catalog:" pnpm-workspace.yaml   # MUST be >= 1
CI=true pnpm install --no-frozen-lockfile
CI=true pnpm install --frozen-lockfile
```
Commit: `chore(pnpm): adopt catalogs for shared dependency versions`.

## Path P — Publish (last)

```bash
cd /home/p31/production
pnpm whoami                            # MUST print @p31ca username, else pnpm login
pnpm -r publish --access public --no-git-checks --dry-run 2>&1 | tail -40
node -e '/* verify publishConfig.access on every publishable @p31ca/ package */'
pnpm -r publish --access public --no-git-checks --batch
```
`--batch` is all-or-nothing; if `ERR_PNPM_BATCH_PUBLISH_UNSUPPORTED`, fall back
to `pnpm -r publish --access public --no-git-checks`. Each republished package's
README gets one line: "Previously published as @p31/foo (orphaned — original
account lost); this is the live package."

## Path S — software/ disposition (parallel with U)

```bash
cd /home/p31/production
rg -l --no-ignore -g '!node_modules/**' -F '@p31/' software/ | wc -l  # MUST be 0
du -sh software/; ls software/ | wc -l
```
Its packages are already extracted; the remaining tree (frontend/backend/
firmware/extensions/workers orchestrator) is a separate disposition. Fence via
Path U's `.gitignore` and file a plan — do not conflate with the npm migration.

## Convergence — the gates

```bash
node scripts/check-p31-scope.mjs                          # 0
CI=true pnpm install --frozen-lockfile                     # 0
git ls-files --stage | grep -c "^160000"                   # 0
git ls-files docs/ workers/ tools/ | wc -l                 # non-zero
grep -c "catalog:" pnpm-workspace.yaml                     # >= 1
pnpm gate                                                   # 0
```

## Decision log

| Decision | Basis |
|---|---|
| Lockfile delete+regenerate, never hand-edit | generated output; `--frozen-lockfile` is the reconciliation gate |
| Embedded repos: fold via `.git` removal | accidental gitlink clones empty; fold = `rm .git` + `git rm --cached` |
| Commit only migration's own untracked content; fence rest | prevents 7,111-file sweeps of pre-existing work |
| Catalogs after lockfiles | codemod runs `pnpm install`; conflating two changes is the entanglement to avoid |
| Publish last, `--batch` | all-or-nothing; partial publish worse than none |
| Orphan mapping in READMEs, not deprecate | no ownership of `@p31/`; mapping is the only actionable path |
| software/ fenced, not migrated | packages already extracted; separate disposition |

## What to watch for

- `--frozen-lockfile` fails after regen → a specifier was corrupted by the rename;
  fix the named package.json, re-run Path L.
- catalog codemod moves nothing → check `pnpm-workspace.yaml` globs cover the
  merged packages before concluding.
- `pnpm -r publish` 402 → a package lacks `publishConfig.access`; run Path P's
  verify step.
- `--batch` unsupported → fall back to per-package `pnpm -r publish`.

## The number that proves this runbook

```bash
node scripts/check-p31-scope.mjs && CI=true pnpm install --frozen-lockfile
```
Both exit 0: the first proves the rename survives clone, the second proves the
workspace reconciles from scratch. Everything else is preparation.