# P31 runbook v1.3: review packet

Everything here is a draft. Nothing was run against your repo. I'm not a lawyer; governance and classification items need counsel.

## Contents
| File | Status |
|---|---|
| `runbook.v1.3.yaml` | Draft; each step tagged READY / BLOCKED(Qn) / PROPOSE |
| `scripts/a0_inventory.sh` | Ready. Read-only; emits `rg --json` and file lists |
| `scripts/a1_redate.sh` | Ready, but refuses to run until inputs are filled |
| `scripts/a2_propose_class.sh` | Proposal only; never edits |
| `scripts/a3_verify.sh` | Ready. Uses `! rg`, blocks on manual items |
| `scripts/check-baseline.mjs` | Tested (record, pass, regression) |
| `templates/CHANGELOG.entry.md` | Placeholders only; counsel supplies the text |
| `tests/reduced-motion.spec.ts` | Skeleton; selectors need filling |
| `inputs/*` | TODO stubs that make the gates block until replaced |

## Blocking inputs (by question)
- **Q1** exact wording of the April 11 instrument (`inputs/instrument_wording.txt`)
- **Q2** verified eCFR 890.3710 text (`inputs/ecfr_890_3710_excerpt.txt`); fetch manually if the sandbox blocks ecfr.gov
- **Q3** does the loom endpoint already assign `seq`, and what is the response shape
- **Q4** is there a generation backend (`inputs/c2_decision`: a | b | defer)
- **Q5** re-date vs re-adopt, per counsel (`inputs/counsel_approach.txt`)
- Path to LOOM's manifest JSON Schema (blocks b2)
- Result of testing the Safari <18 oklab claim (blocks the comment)

## Changes from v1.1 (items from the last review)
Gates now exit non-zero; `! rg` for zero-match checks; file lists driven by inventory (fixes the missing WHISTLEBLOWER date); class edit moved to proposal-only; changelog no longer asserts unsourced facts (the "April 3 incorporation" line and "no substantive changes" are removed pending counsel); cross-worktree dependency handled by cherry-pick; sequential merges; commit scopes include `SandboxChat.tsx`; baselines recorded by a `pre` step; counsel gate moved to merge; human events require authenticated principal; token must bind content; HMAC rather than plain hash.

## Known gaps
- The packet now lives under `scripts/`, `tests/`, `templates/`, `inputs/` inside `governance/`, with runbook output written to `out/`.
- `scripts/align-manifest.mjs` (for b2) is not written (needs the schema path).
- Test-runner JSON field names in the `pre` step are guesses (`numPassedTests`); confirm.
- The `tests/reduced-motion.spec.ts` selectors are placeholders.
- c3 stays a spec until Q3/Q4 are answered.
