# FORGE — Execution Guidance

**Document ID:** FORGE-EXECUTION-GUIDANCE · **Version:** 1.0.0
**Classification:** Internal · **Owner:** @phos-ai-proxy
**Audience:** the DeepSeek V4 Flash execution agent (and any future session)
**Last reviewed:** 2026-10-03

---

## The Harness Principle

DeepSeek V4 Flash is a 284B-total / 13B-active Mixture-of-Experts model with real
agentic capability — but independent testing found it completed **53.8% of complex
agent tasks across eight harnesses**, and the same model produced **substantially
different results depending on the harness, tool configuration, caching behavior,
retries, and provider stack** it ran on.

The conclusion is not "the model is weak." The conclusion is:

> **Orchestration, not raw model capability, decides whether the model succeeds
> in enterprise settings.**

You are the harness. The runbook is your tool configuration. The diagnostic
sequence is your retry logic. The fix scenarios are your provider stack. The
difference between a 53.8% agent and a reliable executor is whether you **follow
the harness** or freelance.

**Follow the harness.**

---

## Step 0 — Read the three deliverables before touching anything

1. `portals/ui-forge-studio/BRIEF.md` — the Forge's purpose, design gates, the
   one architectural decision.
2. `portals/ui-forge-studio/UI_CONTEXT.md` — the four chapters, exact copy,
   tokens, motion + a11y contract.
3. `docs/enterprise/runbooks/RUNBOOK-forge-connection.md` — the connection map,
   diagnostics, fix scenarios.

If you cannot reach the correct next action from these three files alone, stop
and report — you are missing a settled decision, not the code.

## Step 1 — Run the diagnostic sequence in order

Run every command. Do not skip. The first failure names the scenario.

```bash
# 4.1 — Studio live
curl -s -o /dev/null -w "%{http_code}\n" https://p31-ui-forge-studio.pages.dev/
# Expected: 200

# 4.2 — Theme is family (not cyan)
curl -s https://p31-ui-forge-studio.pages.dev/ | rg -o 'data-theme="[a-z]+"'
# Expected: data-theme="family"

# 4.3 — Schema host up (34 components)
curl -s -m 10 https://phos-ai-proxy.trimtab-signal.workers.dev/ui-schema | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('components:',j.catalog.components.length)})"
# Expected: components: 34

# 4.4 — Brief endpoint
curl -s -m 40 -X POST https://p31-ui-forge-studio.pages.dev/api/brief \
  -H "Content-Type: application/json" \
  -d '{"text":"a calm dashboard for spoons with a meter and log"}' | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('brief:',j.ok?'OK':'FAIL','| title:',j.brief?.title)})"
# Expected: brief: OK | title: <something warm>

# 4.5 — Refine endpoint
curl -s -m 40 -X POST https://p31-ui-forge-studio.pages.dev/api/refine \
  -H "Content-Type: application/json" \
  -d '{"brief":{"title":"Calm Dashboard","goal":"track spoons","structure":["meter"],"constraints":["calm"],"entities":[{"name":"spoon","fields":[{"name":"level","type":"number"}]}],"actions":[{"name":"log"}]},"instruction":"add a task entity"}' | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('refine:',j.ok?'OK':'FAIL','| entities:',JSON.stringify(j.brief?.entities?.map(e=>e.name)))})"
# Expected: refine: OK | entities: ["spoon","task"]

# 4.6 — Schema endpoint (response shape)
curl -s -m 80 -X POST https://p31-ui-forge-studio.pages.dev/api/schema \
  -H "Content-Type: application/json" \
  -d '{"brief":{"title":"Calm Dashboard","entities":[{"name":"spoon","fields":[{"name":"level","type":"number"}]}],"actions":[{"name":"log"}]}}' | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('ok:',j.ok,'| keys:',Object.keys(j).join(',')||'(none)','| survivors:',JSON.stringify(j.survivors||[]))})"
# Expected: ok: true | keys: ok,schema,gate,survivors,kills
```

## Step 2 — Match every output to the expected

| Diagnostic | Expected | If it matches | If it fails |
|---|---|---|---|
| 4.1 | `200` | proceed | **Scenario A** — redeploy the studio |
| 4.2 | `family` | proceed | **Scenario B** — fix `data-theme` |
| 4.3 | `34` | proceed | **Scenario C** — proxy down / bundle stale |
| 4.4 | `OK` | proceed | **Scenario D** — Dreamer provider down |
| 4.5 | `OK` | proceed | **Scenario D** — same provider path |
| 4.6 | `ok: true` | diagnosis complete | **Scenario E** — engine or connection |

## Step 3 — Handle `survivors: []` correctly

This is **Scenario F** — the Dreamer's known run-dependence. It is **not an
incident**. Do not escalate. Do not modify the engine. The Surface chapter
already handles it (the "make the brief clearer" recovery button). If it recurs
for the same brief, refine the brief with clearer entities/actions and re-run —
that is the product working as designed.

## Step 4 — If a fix scenario is entered, follow it exactly

Each scenario in the runbook's §5 has copy-pasteable commands with expected
outputs, verified against the live system. Do not improvise, do not "improve" the
commands, do not add steps. The scenario is the provider stack. Follow it.

## Step 5 — Report

Report: which diagnostics passed, which failed (if any), which scenario was
entered, the exact commands run, and the outputs observed. If everything passed,
report `all diagnostics green, no incidents`. If a scenario was entered and the
verification after the fix still fails, escalate per the runbook's §6 — do not
keep guessing.

---

## What you must NOT do

| Prohibited | Why |
|---|---|
| Redesign the UI | The design is settled in `BRIEF.md` + `UI_CONTEXT.md`. Your job is verification. |
| Add new dependencies | The Forge is self-contained by design; `BRIEF.md` forbids new deps. |
| Modify `theme-store.ts` or `packages/ui-forge/**` | Those are upstream canon + engine. The Forge is a consumer. |
| Escalate `survivors: []` | It is a known, expected condition — Scenario F, explicitly non-incident. |
| Skip the diagnostic sequence | Run in order; the first failure names the scenario. |
| Guess at a fix | Every failure mode has a documented scenario. Follow it. |

---

## The Acceptance Test

A handoff is complete only when a fresh agent, holding the three deliverables,
re-runs §4 and confirms every output matches the expected — then reports green.
The one-sentence guidance:

> **Run the runbook in order; match every output to the expected; enter the
> named scenario on failure; never freelance.**

You are the harness. Execute.

---

*End of guidance. Companion document: `FORGE-FINAL-REVIEW.md`. Source of truth
for failure modes: `docs/enterprise/runbooks/RUNBOOK-forge-connection.md`.*