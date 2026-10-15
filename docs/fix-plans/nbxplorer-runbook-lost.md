<!-- P31-HEADER
id: p31_fix_plan_nbxplorer_runbook_lost_20261015_v1.0
type: fix-plan
component: p31-capital-machine/docs
status: open
retention: keep-forever
created: 2026-10-15T00:00:00Z
owner: will
-->

# fix-plan: docs/NBXPLORER_RUNBOOK.md was lost during git-history cleanup

## Symptom

The untracked file `p31-capital-machine/docs/NBXPLORER_RUNBOOK.md` (pre-existing
work-in-progress, never committed) is **gone**. Filesystem search, `git fsck
--lost-found` (0 dangling objects after gc), the parent repo, and archive
checkouts contain no copy.

## Root cause (agent process failure — 2026-10-15)

While removing two oversized committed blobs (`workers/auto-compounder/
sedQd0a3d` 6.7 GB + a 589 MB index.ts) to satisfy GitHub's 100 MB push limit:

1. `git stash push -u` swept the untracked runbook into the stash.
2. `git filter-branch --prune-empty -- --all` rewrote `refs/stash` and its
   untracked-file parent was dropped.
3. `git stash pop` restored the tracked file (`index.astro`) but not the
   untracked runbook.
4. The leftover `refs/stash` was deleted and `git gc --prune=now` removed the
   only remaining objects holding the runbook content.

**Lesson:** before a history rewrite, untracked files must be committed to a
scratch branch (or copied out) — never left relying on a stash that the rewrite
can alter.

## Fix

1. Recreate `docs/NBXPLORER_RUNBOOK.md` from context. Known relevant material:
   the btcpay-gateway worker (BTCPay Server at `127.0.0.1:8082`,
   `docs/fix-plans/`-tracked BTCPay wiring) and the archived NBXplorer data
   dirs (`andromeda-archive/software/crypto-processors/data/nbxplorer`,
   `andromeda/software/crypto-processors/data/nbxplorer`).
2. Whoever authored the original should rewrite it; otherwise a minimal
   NBXplorer ops runbook (setup, data dir, BTCPay integration) suffices.

## Verification

- `docs/NBXPLORER_RUNBOOK.md` exists again with real content (not a placeholder).
- No other untracked files were lost (verify `git status --short` shows only
  `apps/monetization-dashboard/src/pages/index.astro`).

## Impact

Loss of a single work-in-progress doc; no committed history or code was lost.
The capital-machine history is intact after the cleanup (17 commits, verified
tests + deploy before the rewrite).