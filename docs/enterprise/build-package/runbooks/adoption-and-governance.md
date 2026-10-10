<!-- P31-HEADER
id: p31_adoption_governance_20261010_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-10T00:00:00Z
owner: will
-->

# Adoption & Governance — the next strategic phase

> The portal is no longer a launcher; it is a system of record. Foundations
> render from the token tree, components from the catalog, search speaks the
> design vocabulary, and all five agent-readiness signals are present. What is
> missing is not infrastructure — it is adoption.

## The maturity picture (six axes)

| Axis | Stage | Evidence |
|---|---|---|
| Foundations | 4 (Healthy) | DTCG tokens, 32 components, 11 gates, each proven fail-able |
| AI Readiness | 4 | all five Supernova checks pass |
| Documentation | 3 (Teenage) | schema-driven docs; the "why" still lives in runbooks |
| Governance | 2–3 | contribution model on paper; no enforcement of tier promotion |
| **Adoption** | **1 (V1)** | **no product surface consumes the system yet** |
| **Measurement** | **1** | **no adoption metrics, no ROI story** |

**The shape:** strong substrate, thin adoption. The "Invisible Asset" — a
genuinely good system that cannot tell its own story. The gap between
Foundations/AI-Readiness (Stage 4) and Adoption/Measurement (Stage 1) is where
the next move lives.

## Verified this session (2026-10-10)

- Preview server killed by PID (no `pkill` — the `pgrep -f` pattern matched the
  shell itself; use `ss -tlnp` to find the port holder and `kill <pid>`).
- Click-depth check is now real: the catalog links to `/components/:name` (the
  "2 clicks" claim was false — tiles rendered live examples but did not link),
  and the check verifies the link rather than hardcoding depth.
- Component page spine completed: Anatomy (④) + Status (⑧) added.

## Remaining paths

### Path B — Adoption signal (the weakest axis)

The system does not know it is being used. Build the signal:

1. **Usage instrumentation** — on component-page render, record the component
   name + route. Expose via `/resources/adoption` and the MCP server.
2. **`component_usage` MCP tool** — returns which components are used where.
   This is the "adoption data" the enterprise-grade criteria name.
3. **Adoption dashboard** — component count, rendered set, tier distribution,
   token coverage, gate status. The system telling its own story.

### Path C — Governance enforcement

1. **Tier promotion gate** — `experimental → core` requires 2+ surfaces + a11y
   review + docs page; `core → deprecated` requires `$deprecated` + replacement
   + codemod. A gate that fails on promotion without evidence.
2. **Proposal workflow** — the issue template exists; add the triage → review
   bar → lifecycle flow.

### Path D (residual) — Supernova scorecard

Replace the file-existence agent-readiness check with a Supernova-style
scorecard (0/1/2 per criterion, not presence). The workspace should score
10/10; the check should prove it, not assert it.

## Sequencing

```
B (adoption signal) ──→ the system is seen
C (governance) ──────→ the contribution model is enforced
D (scorecard) ────────→ the readiness claim is measured, not asserted
```

B and C are independent; D is a small verification upgrade. B is the priority —
it is the gap the maturity model names.

## The number that matters

```bash
# Adoption — the first real signal the system is used, not just built
curl -s https://p31-design-mcp.trimtab-signal.workers.dev/mcp \
  -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"component_usage","arguments":{}},"id":1}'
# → a non-empty usage map = the Invisible Asset is becoming visible
```