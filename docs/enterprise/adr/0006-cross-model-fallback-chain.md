# ADR 0006: Cross-Model Fallback Chain

**Status:** Accepted
**Date:** 2026-10-02
**Deciders:** William R. Johnson, P31 Labs
**Supersedes:** None
**Superseded by:** None

## Context

The measurement tetrahedron's reliability determines whether the SIC-POVM gate
(ADR 0001) fails open or closed. The primary critique model
(`llama-3.2-11b-vision-instruct`) has a documented history of platform
incidents — including a 37-day degraded-availability window. A single-model
retry loop collapses the whole measurement (and therefore the deploy gate)
whenever the primary degrades. We need the measurement to be resilient to a
specific model being unavailable.

## Decision

Use an **in-code cross-model fallback chain** in `/vision`:

- Requested model first, then the rest of the critique catalog in order:
  `llama-3.2-11b` → `gemma-4-26b` → `qwen-3-27b`, then the `DEFAULT_RUBRIC`
  fallback.
- On total failure, return a **neutral response** instead of a hard 502:
  `{ mean: 5, verdict: 'unmeasured', degraded: true }` (HTTP 200) with the
  `X-P31-Degraded: true` header.
- A result is only **cached** when it validates (mean numeric in `[0,10]` and a
  present verdict) — model output is external data, not a trust boundary.

This changes the measurement layer's contract: a platform outage degrades to
`needs-review` (ADR 0001), never a hard 502, and never a fabricated pass.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| **Single model with retry** | Collapses on any platform incident (measured 502s on the primary); retry alone cannot recover a degraded model. |
| **Cloudflare AI Gateway fallback** | Config-based, platform-native — but adds a deployment dependency and couples the fallback to Cloudflare routing; the in-code chain works on any deployment target and is testable in CI. |
| **Fail-closed, no fallback** | The "gate is broken, deploy is blocked" posture — maximizes correctness at the cost of availability; rejected because the SIC-POVM semantics already absorb platform failure via `needs-review`. |
| **Retry everything** | Burns Neurons on deterministic errors (Workers AI codes 7502/7504/7506); the shared `retryFetch` classifies and fails fast instead. |

## Consequences

**Positive:**
- A single model's platform incident no longer collapses the measurement.
- The neutral `mean:5/unmeasured` + `degraded:true` contract lets the gate
  distinguish "platform down" from "measured and collapsed" (ADR 0001).
- Validation-before-cache prevents a flaky `mean:0` from being served forever.
- Error classification (retry only 429/5xx/network) avoids burning Neurons on
  deterministic failures.

**Negative:**
- The primary's incident degrades the score to a fallback model's judgment
  (different model → different calibration), surfaced via `X-P31-Degraded`.
- The neutral `mean:5` sits above the gate floor, so a platform outage yields
  `needs-review` (correct) only because the gate checks `degraded` — if the
  degraded flag were ever dropped, `mean:5` would silently pass. The flag is
  non-optional.

## Compliance

- Cloudflare AI Gateway fallback pattern (primary → secondary → tertiary).
- LabEx "Handle Cloudflare Workers AI Failures": classify, bounded retry,
  validate model responses, separate model-response and application
  boundaries.
- ADR 0001 (`needs-review` on degraded measurement).

## Follow-ups

- **Exit-code differentiation** in the gate CLIs (`0`/`1`/`2`/`3`) so a
  scripted loop can distinguish "regenerate with fixes" from "re-run the
  measurement" — tracked with ADR 0001.