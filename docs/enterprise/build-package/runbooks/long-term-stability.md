<!-- P31-HEADER
id: p31_long_term_stability_20261009_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

# Long-Term Stability — parallel paths

> **Execution status: RESOLVED on Decision 0 = (a) pnpm 11.28.x.** The
> spine-independent paths (A, D) may run immediately; B and C depend on the
> version upgrade.

## Scope note (the honest line)

The `@p31/` → `@p31ca/` migration is done: 0 old-scope refs, 0 untracked, 0
gitlinks, 28 packages published, convergence gates green. This runbook closes
the layer the migration did not touch — the governance that keeps the now-clean
153-package workspace (up from 74 after consolidation) from drifting again.

**The version situation is the root problem.** The workspace runs pnpm
**11.3.0** — 25 releases behind the 11.x line (11.28.4), and predating every
feature this runbook needs: `workspace:` ranges in catalogs (11.26), native
release management (11.13), `catalogMode: strict` maturity (10.29). pnpm 11
hits EOL **2027-04-30**, six months out.

## Research-grounded decisions (with citations)

| # | Decision | Basis |
|---|---|---|
| D1 | **Pin pnpm 11.28.x now, 12.x in Q1 2027** | pnpm 12 is a stable drop-in (Rust, same flags/settings/lockfile) and 64–90% faster, but has open catalog+peer edge cases (#14361, #16557, #16638). 11.28.x has every needed feature with the fixes already merged. |
| D2 | **Catalogs with `workspace:` ranges**, not plain semver, for the design-system packages | `workspace:` in a catalog (11.26+/12.2+) declares `@p31ca/{canon,design-core,ui}` mutual versions once; both protocols are replaced on publish. |
| D3 | **`catalogMode: strict`** is the enforcement, not advisory | Without it catalogs are advice; with it `pnpm add` rejects an out-of-catalog version at the point of drift, not code review. |
| D4 | **Native release management over Changesets** | pnpm 11.13+ reads the same `.changeset/*.md` intent files and versions the workspace natively — one less toolchain. |
| D5 | **`versioning.fixed` for canon/design-core/ui** | They ship as one unit; users install matching versions; no compatibility matrix. |
| D6 | The only CI-breaking pnpm 12 change is `--resolution-only` → `pnpm peers check` | InfoQ/pnpm compat guide; audit before any 12 upgrade. |

## Spine — Decision 0 (version)

| Choice | Version | Consequence |
|---|---|---|
| **(a) pnpm 11.28.x** | `pnpm@11.28.4` | All features, no catalog edge cases; EOL 6 months; **recommended** |
| (b) pnpm 12.10.x | `pnpm@12.10.1` | All features + 64–90% speed; 3 open catalog edge cases |
| (c) stay 11.3.0 | — | Rejected: no enforcement, no native release, EOL 6 months |

**Resolved: (a).** Revisit (b) in Q1 2027, before the EOL forces it, once the
catalog+peer issues close.

---

## Path A — Version pin + upgrade (spine-independent)

```bash
cd /home/p31/production
# 1. Pin the version (single source of truth for CI + local)
node -e '
const fs=require("fs");
const j=JSON.parse(fs.readFileSync("package.json","utf8"));
j.packageManager = "pnpm@11.28.4";
fs.writeFileSync("package.json", JSON.stringify(j,null,2)+"\n");
'
# 2. Upgrade pnpm itself
pnpm self-update 11.28.4
# 3. Verify
pnpm --version   # MUST print 11.28.4
```
Negative control: `pnpm --version` == `node -e "console.log(require('./package.json').packageManager)"` == `pnpm@11.28.4`. Disagreement = CI uses a different pnpm than local.

Commit: `chore: pin pnpm 11.28.4; upgrade from 11.3.0`.

## Path B — Catalog adoption (depends on A)

```bash
cd /home/p31/production
cp pnpm-workspace.yaml /tmp/pnpm-workspace.pre-catalog.yaml
git status --porcelain | wc -l   # MUST be 0
pnpx codemod pnpm/catalog
git diff pnpm-workspace.yaml | head -80
grep -c "catalog:" pnpm-workspace.yaml
CI=true pnpm install --no-frozen-lockfile
CI=true pnpm install --frozen-lockfile   # MUST exit 0
```
Then the design-system entries + enforcement:
```yaml
catalog:
  react: ^19.0.0
  typescript: ^5.7.0
  '@p31ca/canon': workspace:^
  '@p31ca/design-core': workspace:^
  '@p31ca/ui': workspace:^
catalogMode: strict
```
Negative control: `pnpm add react@^17.0.0 -w` MUST fail. Watch: under
`catalogMode: strict`, `pnpm up --latest` rewrites inline deps to `catalog:` —
set `catalogMode: manual` during bulk updates (#11831).

## Path C — Native release management (depends on A)

```yaml
# pnpm-workspace.yaml
versioning:
  fixed:
    - - '@p31ca/canon'
      - '@p31ca/design-core'
      - '@p31ca/ui'
```
Workflow: `pnpm change` (record intent) → `pnpm version -r --dry-run` →
`pnpm version -r` → `pnpm publish -r --access public --no-git-checks`.

## Path D — Workspace-protocol gate (spine-independent)

Create `scripts/check-workspace-protocol.mjs`: every `@p31ca/*` dep naming a
local workspace package must use `workspace:`/`catalog:`, never a registry
range (a registry range can silently resolve to npm instead of the local copy).
Wire into the root `gate` beside `check-p31-scope.mjs`.

## Path E — pnpm 12 rehearsal (Q1 2027, prep for Option B)

Read-only until the go decision:
```bash
rg -n 'catalog:' packages/*/package.json | grep -i peer   # #14361 surface
rg -n -F '--resolution-only' .                             # removed in 12
git checkout -b chore/pnpm-12-rehearsal
pnpm self-update latest-12 && CI=true pnpm install --no-frozen-lockfile
CI=true pnpm install --frozen-lockfile && pnpm gate        # MUST both exit 0
```

## Convergence gates

```bash
node scripts/check-p31-scope.mjs           # 0
node scripts/check-workspace-protocol.mjs  # 0
CI=true pnpm install --frozen-lockfile     # 0
grep -c "catalog:" pnpm-workspace.yaml     # >= 1
grep -c "versioning:" pnpm-workspace.yaml  # >= 1
node -e "console.log(require('./package.json').packageManager)"  # pnpm@11.28.4
pnpm gate                                   # 0
```

## Decision log

| Decision | Basis |
|---|---|
| 11.28.x now, 12.x in Q1 2027 | 12 has open catalog edge cases; 11.28 has features + fixes; EOL April 2027 |
| `workspace:` in catalog for design-system | mutual versions declared once; replaced on publish |
| `catalogMode: strict` | drift caught at `pnpm add`, not review |
| Native release over Changesets | same intent-file format, one less toolchain |
| `versioning.fixed` for canon/design-core/ui | ship together, install matching versions |
| workspace-protocol gate as permanent CI | registry range can resolve to npm, not local |

## What to watch for

- `--frozen-lockfile` fails after A → one-time lockfile diff from the peer-graph
  re-resolution; commit it.
- Codemod moves nothing → the workspace globs (`packages/* apps/* workers/*`)
  don't cover the packages sharing a dep; check before concluding.
- `catalogMode: strict` blocks `pnpm up --latest` → expected (#11831); use
  `manual` during the update.
- `pnpm version -r` fails on a plain internal semver range → convert to
  `workspace:` (which Path D enforces).

## Deferred: external-dep catalog (precise diagnosis)

The external-dep catalog (`culori`, `jest`, `@astrojs/cloudflare`, etc.) was
attempted on pnpm 11.28.5 and reverted: `culori@catalog:` inside an **upstream
workspace package** — one that other packages link via `workspace:*` — fails
with `ERR_PNPM_SPEC_NOT_SUPPORTED_BY_ANY_RESOLVER`.

- **Not pnpm #8999** — that issue is **closed** (v10.6.5, PR #9266), but the fix
  covered only the **injected** (`inject-workspace-packages=true`) path. This
  workspace uses **linked** (`workspace:*`) packages, so the failure is an
  **unreported variant** of the same class, not the tracked issue.
- Also distinct from the #14361 peerDependencies bug (fixed in 12.2.0) — a
  different code path. Do not conflate any of the three.
- The `workspace:^` catalog entries (design-system trio) work because
  `workspace:` is resolved by the workspace resolver, never the catalog resolver.

**Retry on pnpm 12** (see Path E): 12.2.0 fixed the peerDependencies variant;
whether it fixed the linked-upstream-package regular-dependency path is the one
unknown the rehearsal tests. (`pnpm deploy` no longer requires
`injectWorkspacePackages` as of 11.26/12, so there is no pressure to flip the
linkage just to deploy.)

## The numbers that prove this runbook

```bash
node scripts/check-p31-scope.mjs \
  && node scripts/check-workspace-protocol.mjs \
  && pnpm change check \
  && CI=true pnpm install --frozen-lockfile \
  && pnpm gate
```
Five gates, all exit 0. The version line that proves the pin:
`node -e "console.log(require('./package.json').packageManager)"` → prints
`pnpm@11.28.5` — which is how the workspace stops being "whatever pnpm happens
to be installed."