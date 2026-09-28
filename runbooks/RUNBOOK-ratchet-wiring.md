# RUNBOOK-ratchet-wiring

## When to use
You added a ratchet (a shrink-only debt baseline) and you want it to actually
enforce, or you found a ratchet that nothing calls.

## Prerequisites
- The ratchet script exists and is mutation-verified (proves it can fail).

## Steps
1. Find the caller: what produces the "current count" the ratchet gates on?
2. Wire the count producer to the ratchet (e.g. `audit-orphans` computes the
   orphan count, feeds `ratchet.mjs`).
3. Add the wired command to `package.json` and CI.
4. Run the ratchet's negative control: a count above baseline must fail.

## How to verify
`pnpm acceptance:ratchet` fails when the count exceeds the baseline; the
negative control (`negative-controls/acceptance-ratchet.mjs`) proves it.

## Common pitfalls
- **A ratchet with no caller is furniture.** `ratchet.mjs` was correct,
  mutation-verified, and nothing called it. The "prevent growth" property only
  matters if something computes the current count and runs it.
- **Lock-the-gain.** If the count drops below baseline, the headroom silently
  permits reintroduction. The ratchet must force the floor down in the same
  commit when the gap exceeds a threshold.

## Owner + last verified
`Owner: design-portal` · `Last verified: 2026-09-28`