<!-- P31-HEADER
id: p31_fix_plan_capital_machine_standalone_repo_hygiene_20261014_v1.0
type: fix-plan
component: production
status: resolved
retention: archive-90d
created: 2026-10-14T00:00:00Z
owner: will
-->

# fix-plan: p31-capital-machine is an untracked nested git repo

## Symptom

`p31-capital-machine/` has its **own `.git`** and is **untracked (`??`) by the
parent** `/home/p31/production` repo (it is not a submodule — no `.gitmodules`).
Consequences:

1. Parent-level visibility is broken: `git log`, `git status`, `git grep`, and
   the parent CI cannot see capital-machine history or changes. The parent is
   also 103 commits ahead of `origin/main`, compounding the drift.
2. The two repos can silently fork the same conceptual codebase with no
   cross-reference.
3. Backups/archives of the parent do not include the capital machine (or vice
   versa), risking loss of the deploy history.

## Evidence

- `cd /home/p31/production && git status --porcelain p31-capital-machine` → `?? p31-capital-machine/`.
- `cat .gitmodules` → empty; `git submodule status` → none.
- `cd p31-capital-machine && git log --oneline -3` → local-only history (`0902a3d`, `f0f8c3b`, `3661d58`).

## Root cause

The capital machine was bootstrapped as its own repo and later nested inside
the production tree without a submodule/gitignore decision.

## Fix

1. Decide the model:
   a. **Make it a submodule** of `/home/p31/production` (preserves its own
      history, gives the parent a pinned reference), or
   b. **Fold it into the parent repo** (`git rm --cached` its `.git` first and
      track it like monetization), or
   c. **Keep it separate but document it** and exclude it from parent scans.
2. Whatever the choice, record the decision in the parent README/STATE.md and
   add the appropriate `.gitignore`/`.gitmodules` entry.
3. Push both repos to their remotes (parent is 103 commits ahead).

## Verification

- `git status` in the parent no longer shows `?? p31-capital-machine/`
  unexplained, and the chosen model is documented.
- `git log` on either side is reachable from the other (submodule) or unified
  (folded).

## Impact

Medium — silent visibility gap; no immediate functional break, but history
loss risk and confusing status for agents and CI.

## Progress (2026-10-14)

Option (c) implemented: the parent `.gitignore` now excludes
`p31-capital-machine/` and this plan documents the standalone-repo model, so
parent `git status`/scans no longer surface the nested repo as `??`.

## Remaining (owner)

- Push both repos to their remotes (parent is 103 commits ahead of
  `origin/main`).
- If a pinned cross-repo reference is desired later, upgrade to a submodule
  (option a) or fold the repo into the parent (option b).

## Automation (2026-10-15)

- `scripts/push.sh` (capital-machine) pushes both repos via the `gh` CLI
  credential helper (auth lives in `~/.config/gh/hosts.yml`; a stale `GH_TOKEN`
  env var was shadowing it — the script reads `gh auth token`).
- **Parent repo pushed**: `bde3459..7834457` then `7834457..2fbd87b` on
  `github.com/p31labs/production` (2026-10-15).
- **Capital-machine repo created + pushed**: `p31labs/p31-capital-machine`
  (public, per owner decision) at `github.com/p31labs/p31-capital-machine`;
  `origin` remote configured, `main -> main` pushed (2026-10-15).
- History rewritten to purge two oversized blobs (6.7 GB sed temp + 589 MB
  index.ts) that exceeded GitHub's 100 MB limit; `.git` shrank 88 MB → 500 KB.
  Incident: the untracked `docs/NBXPLORER_RUNBOOK.md` was lost in that rewrite
  — see `docs/fix-plans/nbxplorer-runbook-lost.md`.