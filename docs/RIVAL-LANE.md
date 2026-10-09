# RIVAL-LANE — where P31 actually stands vs Google / Anthropic / Kilo

**The scorecard (2026):** on model, scale, and runtime P31 does not — and will
not — rival Google, Anthropic, or Kilo. That is not the race. On the four
things the demo→production gap is made of (guardrails, evals, observability,
human-in-the-loop), and on the agent-identity/audit layer NIST is actively
standardizing, P31 is already ahead on one of them.

**Where P31 leads (working code, not architecture):** the Loom's tamper-evident
audit trail — gate (writer-per-kind) → hash-chained append-only log → `/verify`
(recomputes and names any break) → `/provenance/:seq` (returns the chain) — and
the AAF manifest (every action carries kind/danger/confirm). These are the
"standardized audit trail requirement for agent-initiated actions" that NIST's
AI Agent Standards Initiative (Feb 2026) says does not exist yet. P31 ships it.

**The three real gaps:** (1) an eval harness — the Astryx vibe-test discipline,
measuring whether an agent using the canon produces good code; it now exists at
`scripts/canon-eval.mjs` (`pnpm canon-eval`) and must run in CI on every PR to
`apps/loom` and `packages/canon`. (2) The agent-identity layer made explicit
(delegated, scoped, revocable authority; agent-legible identity across
boundaries) — the log is the substrate, the contract needs to ship. (3)
OS-level agent sandboxing — the iframe is crash isolation, not security
isolation; Kilo and Anthropic enforce at the OS layer.

**The sentence:** rival them on the disciplines they're weakest at —
auditability (built), eval (now real, must be CI-enforced), agent-contract
design (next). That is the race worth running.