# RUNBOOK-root-cause-proof

## When to use
You are about to write a root cause into a doc, an issue, or a commit message.

## Prerequisites
- A reproduction that demonstrates the cause, OR an explicit "unproven" label.

## Steps
1. Write the hypothesis.
2. Produce the reproduction (the command + its failing output).
3. If you can't reproduce it, write "root cause: unproven — what we ruled out:
   <list>". Do not assert a cause without proof.
4. Only then write it into the doc.

## How to verify
The doc's cause maps to a pasted reproduction. If it says "unproven," it lists
what was ruled out.

## Common pitfalls
- **Asserting a cause without proof.** `DESIGN-GOVERNANCE.md` stated
  `migrate-oklch.mjs` "emitted `oklch(NaN NaN NaN)` where it couldn't parse."
  Reading the script: its `oklchFromRgb` computes `H = atan2(B, A)` — for
  achromatic black/white, `atan2(0,0) = 0`, so it produces `oklch(0 0 0)`,
  not NaN. The asserted cause was wrong and stayed in the doc for three passes.
  The script also has no `throw`/`exit` on unparseable input — that part was
  a real defect, but "produces NaN" was not the mechanism.

## Owner + last verified
`Owner: design-core` · `Last verified: 2026-09-28`