<!-- P31-HEADER
id: p31_run_sheet_md
type: spec
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T13:28:04Z
owner: will
-->

# Concierge Run-Sheet — the first human session on the Loom

**Goal**: one family member, ~90 minutes, producing the first real agent events + the answer to "who uses this?"

## Setup (5 min)
- [ ] Confirm `loom.p31ca.org` is up and `GET /api/loom/verify` returns `valid:true`.
- [ ] Set env: `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, `LOOM_API_BASE=https://loom.p31ca.org`.
- [ ] Charge the phone to film (3-min clip).

## The session (60–90 min)
The operator (you) plays the role of Lumi — you manually propose, then wait for a real human decision.

1. **Introduce the idea** (2 min): "There's a helper in our family called Lumi. Lumi never does anything on its own — Lumi suggests, and a human decides. Let's try it with a real thing."
2. **First proposal** (5 min): pick ONE concrete, low-stakes proposal on the shared street — a color for the feature card, a name for a path, a small change. Script:
   `node scripts/concierge/log-session.mjs --member "<name>" --node ".street" --label "<the thing>" --reason "<why>"`
   This logs the agent propose as a real event.
3. **The decision** (5 min): ask plainly — "Yes or no?" Log it:
   - `--decision approve` or `--decision reject --reason "<their words>"`
4. **Second proposal** (optional, 5 min): only if the first felt natural.
5. **Debrief** (10 min): ask the micro-survey:
   - "On a scale of 1–5, how did that feel?" (CSAT)
   - "From 0–10, how likely would you be to use a helper like this?" (NPS)
   - "What would you change?"
   - **Write down their exact words. Do not paraphrase.**

## What you're watching for
- **Where they pause** — that's the co-presence test (does "it only suggests" read as safe, or as broken?)
- **Whether they ask for more** ("can it do X?") — that's product signal
- **Their face at the "yes or no" moment** — that's the validation

## After the session (15 min)
- [ ] `node scripts/lumi-eval.mjs --sample=good` (sanity)
- [ ] `curl "$LOOM_API_BASE/api/loom/verify"` with service-token headers → confirm the chain grew.
- [ ] Save the verbatim quotes to `docs/concierge-session-1.md`.
- [ ] Cut the 3-min video (the proposal → the pause → the decision).

## Outputs
- Real agent events in the observation window (baseline: 2026-09-22T18:49:47Z).
- A trace corpus for trace-native evals.
- A 3-min video for the Sentient + NLnet + Humanity AI applications.
- The answer to "who uses this?" — not "nobody."