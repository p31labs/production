<!-- P31-HEADER
id: p31_state_20261004_v1.0
type: state
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
-->

# STATE.md — The Persistent Brain

The cognitive prosthetic. A fresh agent reads this and knows exactly where the
work is, what's blocking, and what's next — without any chat history.

## Current Focus

**Tetrahedron v2 (the non-destructive system) is live.** W11–W20 built:
the veto gate (tool.execute.before hook), CAS store, soft-delete, hash-chained
ledger, Ed25519+ML-DSA approval token, housekeeping v2, and all gates wired
into `pnpm gate`. All 6 negative controls pass — every gate is proven fail-able.

## Blockers

- **Disk at 97%** (5.6G free). Remaining big recoverable items need human
  decisions: the two stale reference blobs (p31-cortex 6.9G, andromeda-archive
  6.8G) want archiving to Google Drive via rclone — which isn't installed and
  needs the user to set up OAuth.
- `workers (1)` is the FULL 173-worker fleet, NOT a duplicate — `workers/` is a
  stale 2-worker subset. The diff-before-delete rule caught this. Do NOT delete
  `workers (1)`.

## Open Loops

- [x] W1–W10: runbook v1 (harness, sensors, tetrahedron faces, ownership)
- [x] W11: veto gate + taxonomy (11/11 destructive caught)
- [x] W12: CAS store (lib/cas.mjs)
- [x] W13: soft-delete (lib/softdelete.mjs + check)
- [x] W14: hash-chained ledger (lib/ledger.mjs + verify-chain)
- [x] W15: Ed25519+ML-DSA approval token (lib/token.mjs)
- [x] W16: housekeeping v2 (soft-delete + CAS + token + verify-chain)
- [x] W17: wired into pnpm gate (11 gates green)
- [x] W18: pnpm approve CLI
- [x] W20: negative controls (6/6 pass)
- [ ] W19: agent passport (Ed25519 session identity) — partial (ledger has actor field)
- [ ] M1–M10: fleet layer (worktrees, task ledger, leases, merge, dashboard)
- [ ] W9 tail: disk below 90% needs Will (rclone + stale blobs)

## SSOT token consolidation (parallel paths — separate arc)

- [x] Path A: flip — `tokens.css` deleted, design-core rewired to `@p31ca/canon/tokens.css`, parity gate green (33/33)
- [x] Path P: staged SSOT shard (805 files: packages/canon + design-core + docs/fix-plans) — NOT committed
- [x] Path W1: fixed 2 install poisons (canon-mcp, ui-react) → `file:../design-core`
- [x] Path W3: `.sha512` vendor manifest refreshed (matches tarballs)
- [x] Path N (shipped): 14 NaN sites in `src/css/*` fixed
- [x] Path M1: pre-sync migration guard in `sync-vendor.mjs`
- [x] Dead trees deleted: `src/styles/`, `src/recipes/`, `src/themes/` (unexported)
- [x] S2 = a: `portals/design/pnpm-workspace.yaml` (standalone workspace root)
- [x] `allowBuilds` (esbuild/sharp/workerd) in root `pnpm-workspace.yaml`
- [x] **W2**: `portals/design` 3-way merge resolved (package.json, vendor tarball, 3 PNG snapshots)
- [x] **S1**: committed SSOT shard `0be3bbe` (683 files: canon + design-core + docs)
- [x] **W2 commit**: `a4fd3d8` (package.json + vendor tarball + 29 snapshots)
- [ ] **Pre-existing portal changes**: 82 files still staged (test-results, components, vendor) — not SSOT, needs review
- [ ] **Vendor naming migration**: `p31-ui-1.3.1.tgz` → `p31ca-ui-1.3.1.tgz` (pre-existing tarball name drift)
- [ ] **Repo-wide machine paths**: 34 files still reference `/home/p31/production` — filed `repo-wide-machine-paths.md`
- [ ] NaN tail: `recipes-data.ts` (7), generator adapters (4), `generated-wc` (1), `semantic-token-manifest.json` (4)
- [ ] Theme-ID drift: `packages/shared/src/theme/ids.ts` (9 IDs) vs `theme-store.ts` (5)
- [ ] Path B (dead tokens, DTCG `$deprecated`) + Path C (26 contract over-claims)
- See `docs/enterprise/design-system/design-core-inventory.md` + `docs/enterprise/build-package/runbooks/ssot-parallel-paths.md`

## Last Handoff

W11–W20 complete, `pnpm gate` green (11 gates + 6 negative controls). Next:
M1–M6 (the fleet layer — worktrees, task ledger, leases, merge, dashboard) or
W19 (agent passport hardening). The disk recovery (W9 tail) waits on Will's
rclone + Google Drive decision.

SSOT arc: Path A flip + P/W1/W3/N/M1 done, dead trees deleted, workspace
isolated. **Blocked on two Will decisions** — S1 (commit the 805-file staged
shard) and W2 (resolve the real 3-way merge in `portals/design`: 5 UU files).
Then: NaN tail (recipes-data.ts/generator/manifest), theme-ID reconciliation,
Path B (dead tokens) + Path C (contract over-claims).

## Handoff Format (write this at session end)

```
## Handoff
Focus: <one sentence>
Blockers: <list>
Next action: <one concrete step>
```