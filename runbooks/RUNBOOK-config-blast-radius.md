# RUNBOOK-config-blast-radius

## When to use
You are adding a named project, a config key, or a `snapshotPathTemplate` to a
config file (Playwright, Vite, tsconfig), or changing any default.

## Prerequisites
- Know what each config key defaults to when unset.

## Steps
1. Before the change: list every default that a sibling setting could inherit.
2. Make the change.
3. Check the blast radius: does any OTHER consumer of the config now resolve a
   different default? (Playwright: adding named projects changes the default
   `snapshotPathTemplate` to append `{-projectName}`.)
4. Pin explicit values for any path/behavior you depend on.

## How to verify
Run the check: `pnpm check:blast-radius` (registers a `bob` topology rule) and
confirm the affected consumers (e.g. legacy-visual snapshots) still resolve the
same files.

## Common pitfalls
- **A config change that alters behavior elsewhere in the same file.** Adding
  named Playwright projects silently changed the legacy snapshot path from
  `desktop-index-linux.png` to `desktop-index-legacy-visual-linux.png`,
  bypassing the 39 committed baselines. The gate "passed" against fresh copies.
  Per-project `snapshotPathTemplate` pinned the legacy path.

## Owner + last verified
`Owner: design-portal` · `Last verified: 2026-09-28`