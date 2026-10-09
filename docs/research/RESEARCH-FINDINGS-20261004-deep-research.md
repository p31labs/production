<!-- P31-HEADER
id: p31_research_findings_deep_research_20261004_v1.0
type: research
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
-->

# Research Findings — Deep Research Depth Layers (2026-10-04)

Grounded in: RO (IEEE 2026), Demoting the Master Control Program (Zenodo 2026),
DEER (ICML 2026), CLAIMPROBE (Salesforce arXiv), DeepTRACE (ICLR 2026),
parallel-research skill, Yunque DeepResearch (Tencent), cf-proxy.

## 1. The architecture is validated

RO (Reliable Orchestration, IEEE June 2026): across seven frameworks and 1,600+
execution traces, **orchestration failure dominates** — plan abandonment, state
corruption, tool-management errors. Root cause: the LLM is asked to do
deterministic bookkeeping (loops, state, control flow) AND reasoning at once.
Fix: a typed program exists before execution; the LLM does bounded generative
work, deterministic nodes do control. Result: 12,518-line controller → 444-line
program (28× reduction), 2–3× wallclock speedup.

Demoting the Master Control Program (Zenodo 2026): "the model builds, but a
deterministic gate decides done." 88% clean delivery, 0 operator intervention,
6/6 false-done fixtures rejected.

→ **The agent's A1–A4 deterministic core is the correct architecture.** The LLM
wrapper is the generative node; the gates decide done.

## 2. Report quality: claim-level, not rubric-level

DEER (ICML 2026): 7 dimensions, 25 subdimensions, 101 rubric items; verifies
cited AND uncited claims.

CLAIMPROBE (Salesforce): "facts can lose structure and provenance during
writing." Fix — CLAIMWRITER: a hierarchical claim-based writer that extracts
source facts, maps them to a query-derived outline, drafts from a source-linked
claim representation. Replacing only the writer reduces hallucination
2.6×–4.5× and improves necessary-fact recall 1.2×–1.7×.

→ **The P31 writer must draft from the Research Ledger's claims (A3), not from
raw findings.** That's the highest-leverage writer choice.

DeepTRACE (ICLR 2026): citation accuracy 40–80% across systems; deep-research
configs are "highly one-sided on debate queries."

→ **A2's MECE decomposition must include a critics/skeptics domain as a standard
vertical slice** — the one-sided failure is a coverage failure.

## 3. Decomposition: MECE domains, vertical slices, user approval

parallel-research skill: "Divide by research domain, NOT by source type. Each
agent owns a vertical slice." Present the decomposition table and wait for user
approval. Model column maps to the router (opus for critics, haiku for scraping).

Yunque DeepResearch: Dynamic Context Management (structure completed sub-goals
into semantic summaries) + a proactive Supervisor Module (anomaly detection +
context pruning).

→ **The LLM wrapper needs a supervisor loop:** as N researchers return, structure
findings into summaries, prune context, run the next round. Without it, context
grows unbounded and later rounds degrade.

## 4. The neuron budget: estimate from token usage

cf-proxy: "The proxy estimates neuron usage from token usage: neurons ≈
prompt_tokens × rate_in + completion_tokens × rate_out. Counters reset per
account at 00:00 UTC. Auto-skips accounts on 429 and proactively skips accounts
that have used up their 10,000 free neurons for the UTC day."

→ **The router needs a neuron-estimation layer.** It already returns
promptTokens/completionTokens (routeToWorkersAI); add the estimate + a
cumulative budget tracker. Cheap models (glm-4.7-flash) for high-volume work;
expensive (nemotron-3-120b) for low-volume (planner, reviewer).

## Directives (the next build steps)

1. **Writer-from-ledger** — the writer reads `research-ledger.json`, not
   `research_notes/*.md`. (CLAIMWRITER pattern; 2.6–4.5× hallucination reduction.)
2. **Supervisor loop** — structure completed findings into summaries, prune
   context between rounds. (Yunque pattern.)
3. **Neuron estimation** — deterministic token×rate tracking + a UTC-midnight
   budget guard in the router. (cf-proxy pattern; the one piece that is pure
   logic, testable offline.)

*The one that is deterministic and testable now: #3 (neuron estimation). #1 and
#2 are LLM-orchestration changes that need the live router to verify.*