# RUNBOOK-baseline-approval

## When to use
A visual baseline changed, or you are about to run `--update-snapshots`.

## Prerequisites
- You can produce a side-by-side diff of the changed baselines.

## Steps
1. Regenerate the candidate baselines WITHOUT committing them.
2. Produce the before/after diff for the human.
3. The human approves; THEN commit. Generation is never approval.
4. Record the approval (SHA + approver + reason) in the acceptance manifest.

## How to verify
The manifest's `status` field is `PENDING_HUMAN` until a human approves, then
`APPROVED` with the approver + SHA.

## Common pitfalls
- **Baseline generation treated as a build step.** `--update-snapshots` ran
  inside a build pipeline and regenerated the legacy gate's baselines without
  sign-off. (Incident: Wave-0 close regenerated the 3 glass-shadow baselines
  and the acceptance set; the first freeze committed without approval.)
- **Two baseline systems, one config.** Adding named Playwright projects
  silently changed the legacy snapshot path (the `-legacy-visual` suffix),
  so the legacy gate compared against fresh copies, not the committed ones.
  Per-project `snapshotPathTemplate` is the fix.

## Owner + last verified
`Owner: design-portal` · `Last verified: 2026-09-28`