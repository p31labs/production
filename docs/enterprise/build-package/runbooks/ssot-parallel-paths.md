<!-- P31-HEADER
id: p31_ssot_parallel_paths_20261009_v1.0
type: runbook
component: packages/canon
status: live
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

# SSOT Parallel Paths — Persistence and Governance

> **Execution status: BLOCKED — resolves on spine decisions S1 + S2.**
> Do not execute any path until both are resolved. The header stays `live`
> because the schema (`scripts/frontmatter.mjs`) admits no `blocked` value and
> runbooks here use `live` for the active doc; this line is the real signal.

## Scope note (the honest line)

Path A (the flip) is complete: `packages/design-core/src/css/tokens.css` is
deleted, `index.css:19` rewired to `@import '@p31ca/canon/tokens.css'`, canon
vendored into the design portal, and the ΔE2000 parity gate is green with the
build holding at 33/33 contract-parity tests.

**But the flip's proof is filesystem-local, not repository-local.** The
verdict `test ! -f packages/design-core/src/css/tokens.css` is true on this
machine and nothing on any other, because the SSOT surface was never committed:

| Artifact | `git ls-files` count | Consequence |
|---|---|---|
| `packages/**` (canon, design-core, the parity gate, the baseline) | **0** | the flip, the gate, the frozen baseline are untracked |
| `docs/fix-plans/**` | **0** | the two filed plans (NaN, consumer-migration) don't survive clone |
| `portals/shell/**` | **0** | pre-existing, documented in wave-12 runbook |
| root `pnpm-workspace.yaml` + `pnpm-lock.yaml` | **0** | the workspace itself is untracked |

This runbook resolves persistence and hygiene before the arc resumes, and lays
the parallel paths that follow Path A.

**Not in this runbook:** the dead-token triage and contract over-claim
adjudication themselves — they are the resume arc (Path R below), referenced
here only to fix their ordering, not executed.

**Companion doc:** `runbooks/RUNBOOK-canonical-source.md` is the *edit-then-
regenerate* workflow (edit `theme-store.ts` → `pnpm gen:tokens` → run the parity
gate → re-vendor). This runbook is the *persistence-and-hygiene* half — the two
describe one system from two angles. Its "Common pitfalls" names the exact
failure mode this runbook executes against: declaring a single source without a
parity gate wired to the build.

## The hard constraint (read first)

**The repo's convention is "published, not committed."** Canon distributes via
npm tarball (`p31ca-canon-0.1.0.tgz`); `packages/`, `apps/`, `cli/`,
`docs/fix-plans/`, `portals/shell` have never been tracked. If that convention
is deliberate, the flip's proof is local-only and must be *documented* as such,
not silently assumed. If it is accidental, the smallest shard that makes the
proof real is `packages/canon` + `packages/design-core` + `docs/fix-plans/`.

This is a **human decision (spine S1)**, not a script, and every path below
depends on it.

## Research-grounded decisions (with citations)

| # | Decision | Basis |
|---|---|---|
| D1 | The `--ignore-workspace` workaround is version-fragile; prefer a **nested `pnpm-workspace.yaml` with no `packages` key** to isolate the portal | pnpm #14809: `--ignore-workspace` regresses in pnpm 12 (no effect when CWD is nested under a workspace root); pnpm #17169: v11's `--ignore-workspace` means "skip pnpm-workspace.yaml entirely"; a nested yaml with no `packages` key makes the dir its own workspace root and survives upgrades. Current pnpm is **11.3.0** — inside the working band, one major from breaking. |
| D2 | Dead tokens are deprecated with **DTCG `$deprecated`**, value `true` or a migration string, removed across 1–2 minors | DTCG spec: `$deprecated` is `true` or a string explaining why; established workflow is mark-with-migration-message → emit warnings → remove on a major. |
| D3 | NaN hue is fixed **in source as `0`**, never in a gate workaround | CSS Color 4: a powerless hue (chroma 0) must resolve to a defined value; `0` is the spec choice. Browsers tolerate `NaN`, parsers (culori, postcss) reject it. The gate's `repairNaNColor()` is documented as a divergence path, not a fix. |
| D4 | The parity gate is a **named two-tier SSOT gate** (`design-system:defaults-parity`), whose only job is drift detection | Two-tier SSOT pattern: a machine-enforced form + a human-readable mirror + a named CI gate; the failure is a *distinguishable* build failure, not a generic one. |
| D5 | The gate's baseline must read from a **pinned ref, never HEAD** | onyx#11937: on the migration commit HEAD *is* the migration, so reading HEAD makes the gate skip and exit 0 with a misleading message. |

## Spine (human decisions — resolve before any path runs)

- **S1 — version-control boundary.** Options: **(a)** track `packages/canon` +
  `packages/design-core` + `docs/fix-plans/` (smallest shard that makes the
  flip real); **(b)** track nothing new, document the local-only convention;
  **(c)** track all of `packages/` (matches the workspace glob). Blocks P1–P4.
- **S2 — portal isolation mechanism.** Options: **(a)** nested
  `portals/design/pnpm-workspace.yaml` with no `packages` key (durable);
  **(b)** keep `--ignore-workspace` and pin pnpm 11 (fragile, upgrade blocker);
  **(c)** add `portals/*` to root globs. Blocks W1, W3.

**Decision tree — what each choice replaces:**

| Choice | S1 consequence | S2 consequence |
|---|---|---|
| **(a)** | Path P runs as written (track canon + design-core + fix-plans). | W1 fixes canon-mcp in place; portal isolated by nested workspace yaml. |
| **(b)** | Path P is **replaced by a single doc edit**: the "hard constraint" section is rewritten to state the flip is local-only *by convention*. P1–P4 do not run. | Pin pnpm 11 in `packageManager`; file an upgrade blocker; keep `--ignore-workspace`. |
| **(c)** | Path P scope expands to `git add packages/`; re-run `git status` to review the larger diff before committing. | Add `portals/*` to root globs; re-run `pnpm install` at root to confirm the workspace resolves. |

Recommended: **S1 = a** (the parity gate, frozen baseline, and fix-plans are
repository infrastructure, not distributables — exactly what must be committed;
and without `packages/design-core` tracked there is no diff showing `tokens.css`
ever existed) and **S2 = a** (one file, upgrade-safe, removes pnpm-12 fragility).

---

## Path P — persistence (the flip's proof must survive clone)

### P1 — commit the SSOT shard (S1 = a)

```bash
cd /home/p31/production
git add packages/canon packages/design-core docs/fix-plans
git diff --cached --stat | grep -c "tokens.css"
# MUST be >= 1 — the delete is now a tracked deletion, not a local rm.
git status --short packages/ docs/fix-plans/
```

Do **not** commit yet — surface the diff for review. The ~15 pre-existing
staged portal changes are a separate decision.

### P2 — prove the flip survives a clean checkout

```bash
git stash --include-untracked --keep-index && git stash pop
git show HEAD:packages/design-core/src/css/index.css | grep '@p31ca/canon/tokens.css' || exit 1
# MUST show the rewire. If empty, the flip is local-only.
```

### P3 — baseline provenance (S1 = a)

```bash
git ls-files packages/canon/baseline/ | wc -l
# MUST be > 0. The parity gate reads a frozen baseline file from disk; if it
# is untracked, a fresh clone cannot run the gate.
```

If S1 = b, document instead that the gate requires a local bootstrap step
(regenerate the baseline from the pinned design-core tarball).

### P4 — fix-plan durability

```bash
git ls-files docs/fix-plans/ | wc -l
# MUST be > 0 after S1 = a. Otherwise the 12 filed plans are prose in a temp dir.
```

---

## Path W — workspace hygiene (remove the pre-existing shadows)

### W1 — fix the canon-mcp poison (S2)

`packages/canon-mcp/package.json` declares a machine-specific absolute tarball
path that does not exist:

```jsonc
"@p31ca/design-core": "file:/home/p31/production/packages/design-core/p31ca-design-core-3.0.0.tgz"
```

It poisons every root `pnpm install`. Fix by mirroring the sibling canon dep's
shape:

```bash
cd /home/p31/production
node -e "
  const fs=require('fs');
  const p='packages/canon-mcp/package.json';
  const j=JSON.parse(fs.readFileSync(p,'utf8'));
  j.dependencies['@p31ca/design-core']='file:../design-core';
  fs.writeFileSync(p,JSON.stringify(j,null,2));
"
CI=true pnpm install 2>&1 | tail -5
# MUST exit 0. If it still fails, the poison has a second source.
```

### W2 — resolve the abandoned 3-way merge in portals/design (BLOCKED — human decision)

**Correction (2026-10-09): this is a real three-way conflict, not the degenerate
case this runbook originally assumed.** For all 5 files `ours(2) ≠ theirs(3) ≠
base(1)`; there is no MERGE_HEAD, so `git merge --abort` cannot recover it. The
unmerged set is:

- `portals/design/package.json` — ours has a clean `gate`; theirs adds ~12
  scripts referencing stale `production` paths; the worktree is a
  hand-merge (26 scripts, 2 stale refs: `test:core` now fixed, `gate`'s
  `canon-audit` ref still stale).
- `portals/design/vendor/p31-design-core-3.0.0.tgz` — binary, 3 different sizes
  (ours 7.7 MB / theirs 2.5 MB / worktree 5.99 MB fresh repack).
- 3× `tests/visual.spec.ts-snapshots/*.png` — binary, ours ≠ theirs.

**Resolution (per-file, binary = pick one):**

```bash
# package.json: keep the worktree (most complete); fix remaining stale refs.
git add portals/design/package.json

# tarball: regenerate from current source (already the fresh repack), then add.
git add portals/design/vendor/p31-design-core-3.0.0.tgz \
        portals/design/vendor/p31ca-canon-0.1.0.tgz \
        portals/design/vendor/.sha512

# 3 PNG snapshots: regenerate from a clean build, OR pick --ours/--theirs.
git checkout --ours -- portals/design/tests/visual.spec.ts-snapshots/  # or --theirs
git add portals/design/tests/visual.spec.ts-snapshots/
```

The remaining `gate`-script stale ref (`canon-audit`) depends on the `tools (1)/`
rename (see `docs/fix-plans/token-validation-script-paths-broken.md`). Do NOT
commit without a human decision on the 3 PNG snapshots.

### W3 — refresh the vendor manifest

`sync-vendor.mjs` crashed before writing `.sha512`; refresh it and assert the
hash matches the repacked tarball:

```bash
cd /home/p31/production
node tools/portal-vendor-sync/sync-vendor.mjs \
  --target /home/p31/production/portals/design 2>&1 | tail -6
node -e "
  const {createHash}=require('crypto'),{readFileSync}=require('fs');
  const h=createHash('sha512')
    .update(readFileSync('portals/design/vendor/p31-design-core-3.0.0.tgz'))
    .digest('hex');
  const m=JSON.parse(readFileSync('portals/design/vendor/.sha512','utf8'));
  console.log('manifest matches tarball:', m['design-core']===h);
"
# MUST print true.
```

---

## Path N — NaN (the flip did not remove it from the bundle)

The flip removed the *generator's* NaN output. 14 hand-written sites still ship
`oklch(L 0 NaN / a)` in the published bundle:

- `packages/design-core/src/css/base.css:25`
- `packages/design-core/src/css/recipes.css` (12 occurrences)
- `packages/design-core/src/css/a2ui-datacard.css` (1 occurrence)

`packages/canon/dist/tokens.css` has 0 NaN — the remaining sites are
hand-authored, not token output. Fix in source (D3):

```bash
cd /home/p31/production/packages/design-core
# Replace the literal NaN hue with 0 at each site (verify each line first).
grep -rn "NaN" src/css/base.css src/css/recipes.css src/css/a2ui-datacard.css
# For each achromatic site: oklch(L 0 NaN / a) -> oklch(L 0 0 / a)
```

Then rebuild and assert the bundle is clean (negative control N2):

```bash
cd /home/p31/production/portals/design
rm -rf node_modules/.vite && CI=true npx vite build 2>&1 | tail -2
grep -rc "NaN" dist/assets/*.css && exit 1 || echo "clean: no NaN in bundle"
# MUST print "clean". A residual NaN means a site was missed.
```

---

## Path M — migration teeth (turn honor-system into a gate)

Five live consumers still import the removed export (verified 2026-10-09):

- `portals/chat/src/main.tsx:6`
- `portals/children/src/index.css:6`
- `portals/parent/src/index.css:6`
- `portals/teen/src/index.css:6`
- `portals/qpj/src/__tests__/token-audit.test.ts:19`

They work only on frozen tarballs; the next `sync-vendor` in each portal breaks
them loudly. "Loudly at the next sync" is honor-system, not a gate.

### M1 — pre-sync guard

Add a guard to `tools/portal-vendor-sync/sync-vendor.mjs` that runs **before**
repacking and refuses if the target portal's `src/` still imports the removed
subpath:

```
const removed = /@p31ca\/design-core\/css\/tokens\.css/;
// scan portalRoot/src/**/*.{ts,tsx,css}
// if any match: exit 1 with the file:line and the migration message.
```

Migration message: "Import `@p31ca/canon/tokens.css` instead; add
`'@p31ca/canon': 'file:vendor/p31ca-canon-0.1.0.tgz'` to dependencies."

Negative control: run against `portals/children` (still imports it) — **MUST
exit 1**.

### M2 — migrate the consumers (after M1)

```bash
cd /home/p31/production
for p in children parent teen; do
  sed -i "s|@p31ca/design-core/css/tokens.css|@p31ca/canon/tokens.css|" portals/$p/src/index.css
done
sed -i "s|@p31ca/design-core/css/tokens.css|@p31ca/canon/tokens.css|" portals/chat/src/main.tsx
sed -i "s|@p31ca/design-core/css/tokens.css|@p31ca/canon/tokens.css|" portals/qpj/src/__tests__/token-audit.test.ts
# Each portal also needs the canon tarball vendored + a dependencies entry,
# mirroring portals/design and portals/shell.
```

---

## Path R — resume the arc (ordering only; not executed here)

**Carried forward from the prior arc's adjudication — NOT re-verified in this
runbook.** The `147 dead tokens` and `26 contract over-claims` counts are
inherited; re-derive them (a `comm`/set-diff over the DTCG token set, and a
`token-consumption.mjs --json` run) before executing Path R.

- **Dead-token triage (147).** Classify DELETE/DEPRECATE/KEEP; DEPRECATE via
  DTCG `$deprecated` with a migration string (D2); stage removal across 1–2
  minors. Re-run `runbooks/RUNBOOK-canonical-source.md`'s regenerate step after
  each DEPRECATE so the mirror and the gate stay in sync.
- **Contract over-claims (26).** Note: `packages/canon/scripts/validate-contracts.mjs`
  (the "contract ghost gate") and `token-consumption.mjs` **already exist** and
  already hard-fail on ghost sources and unconsumed tokens. The resume work is
  adjudication against the existing gates, not greenfield gate construction.
- **Converge.** Wire `verify:parity` and `token-consumption` as named guards
  into the canon build as `design-system:defaults-parity` and
  `design-system:consumption` (D4), with baseline provenance pinned to a ref,
  never HEAD (D5).

---

## Negative controls (prove each fix is real, not cosmetic)

```bash
# P — the flip is repository-local (the rewire, not a filename grep)
git stash --include-untracked --keep-index && git stash pop
git show HEAD:packages/design-core/src/css/index.css | grep '@p31ca/canon/tokens.css'

# W1 — the poison is gone
cd /home/p31/production && CI=true pnpm install   # MUST exit 0
node -e "const p=require('./packages/canon-mcp/package.json');
  console.log(p.dependencies['@p31ca/design-core'])"  # MUST be file:../design-core

# W3 — the manifest matches the tarball
# (see W3)                                          # MUST print true

# N — the bundle is NaN-free
grep -rc "NaN" portals/design/dist/assets/*.css    # MUST be 0

# M1 — the pre-sync guard bites
node tools/portal-vendor-sync/sync-vendor.mjs --target portals/children
# MUST exit 1 with the migration message (children still imports the subpath)
```

## Decision log

| Decision | Basis |
|---|---|
| Track `packages/canon` + `packages/design-core` + `docs/fix-plans/`, not all of `packages/` | Smallest shard that makes the flip's proof survive clone; respects "published, not committed" for the rest. |
| Durable portal isolation = nested `pnpm-workspace.yaml`, no `packages` key | pnpm #14809 (regression in v12); #17169 (v11 semantics). |
| canon-mcp dep → `file:../design-core` | Mirrors its sibling `@p31ca/canon: file:../canon`; removes the machine-specific absolute path. |
| NaN fixed in source (`0`), not in a gate workaround | CSS Color 4 requires a defined hue for achromatic colors; `0` is the spec choice. |
| Pre-sync guard, not a filed plan, for the 5-portal migration | "Land before next sync" is honor-system; a guard that exits 1 is a gate. |
| Baseline reads from a pinned ref, not HEAD | onyx#11937: on the migration commit, HEAD is the migration. |
| DTCG `$deprecated` for the DEPRECATE class | Spec-conformant; migration string is a defined field; removal staged across 1–2 minors. |

## What to watch for

- **If S1 resolves to (b)** — track nothing new. Then P1–P4 don't run and the
  flip's proof is documented as filesystem-local. Legitimate, but it must be
  written down, because the next agent to read "✅ PARITY OK" will otherwise
  assume it survives a clone.
- **If pnpm is upgraded past 12.3** — the `--ignore-workspace` workaround breaks
  (pnpm #14809). If S2 = (b), pin pnpm in `packageManager` and file an upgrade
  blocker. If S2 = (a), the nested workspace yaml is upgrade-safe.
- **If W1's clean root install still fails** after the canon-mcp fix — there is
  a second poison source; find the machine-specific path and replace it with a
  relative one.
- **If M1's guard does not exit 1 against portals/children** — the guard is a
  rotten-green test; its scan scope is wrong. Make it assert it found the files
  it expected to scan.
- **If the baseline-missing control passes instead of failing** — the gate does
  not assert the reference exists. It must `existsSync(BASELINE)` before
  reading and exit 1 if absent.

## Post-actions — update STATE.md

This runbook breaks the repo's own convention if it demands durability and
then leaves the persistent brain stale. After S1/S2 resolve and P + W land,
update `STATE.md`:

- **Open Loops:** mark the SSOT persistence + hygiene paths resolved (or the
  S1 = b local-only convention documented), and add the Path N/M/R items as
  the next open loops.
- **Last Handoff / Handoff block:** one sentence of focus, the blockers (Path R
  carried-forward counts), and the next concrete step (Path N's 14-site NaN fix
  or Path M's pre-sync guard).

`STATE.md` is the thing a fresh agent reads first; if it still points at
Tetrahedron v2 with no mention of the SSOT arc, this runbook has not finished.

## The number that proves this runbook

```text
git show HEAD:packages/design-core/src/css/index.css | grep '@p31ca/canon/tokens.css'
```

If that line returns the rewire (`@import '@p31ca/canon/tokens.css'`), the flip
is repository-local: a fresh clone builds design-core against canon, not its own
token layer. If it returns nothing, the flip is filesystem-local.

**Why the old proof line is wrong:** `git show --stat HEAD | grep "tokens.css"`
returns *additions* (the frozen baseline copy, the generated `p31-tokens.css`,
the fix-plan) — not a deletion, because `src/css/tokens.css` was never tracked
(`packages/` entered git only in the SSOT commit). The flip is a rewire of a
tracked file (`index.css`), not a deletion of one. Assert the rewire, not the
filename.

Everything else in this runbook is hygiene; that line is the persistence.