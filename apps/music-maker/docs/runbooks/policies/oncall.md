# On-Call & AI-First-Responder — Control Server

**Last updated**: 2026-09-24
**Owner**: @p31-platform

## The routing rules (the ONCALL.md contract)

This file is the deterministic half. An on-call agent (Claude, or a dedicated
SRE bot) reads it and applies the rules. The agentic half — escalation — is
governed by § Autonomy Levels below.

### Deterministic routing
IF alert = ControlRoomDown AND duration > 2m → PAGE on-call
IF alert = HibernationWakeFail AND duration > 5m → PAGE on-call
IF alert = BackpressureStorm AND duration > 10m → TICKET (next business day)
IF alert = LearnArmStuck AND duration > 30m → TICKET
IF alert = WledOffline AND duration > 5m → TICKET
IF alert = D1SchemaDrift AND any → PAGE on-call
IF error_rate > 2% for > 5m AND NOT in deploy window → PAGE on-call
OTHERWISE → append to lessons.md

The `NOT in deploy window` clause is the Anthropic pattern: a known deploy
window suppresses the page, but the alert is still logged.

**Tooling status**: the routing rules are the contract. The agent tooling that
would consume them (MCP wiring to logs/dashboard, PagerDuty, Grafana) is
**not yet wired** — the rules are read by a human on-call today.

## Escalation ladder

| Level | Trigger | Notify | Response SLA |
|---|---|---|---|
| L1 | alert fires | on-call (Slack + push) | acknowledge 5m |
| L2 | L1 unacked 5m, or DRI requests | secondary + team lead | acknowledge 5m |
| L3 | L2 unacked 10m, or SEV-1 declared | incident commander + stakeholder channel | immediate |
| L4 | SEV-1 > 1h, or data-integrity | executive sponsor + customer comms | immediate |

## Autonomy Levels (the kilo.ai governance frame)

The on-call agent operates at one of four levels. The level is set per-alert
in the routing table; the default is **L2**.

| Level | Name | What the agent may do without approval | What it must ask |
|---|---|---|---|
| **L0** | Observe | read logs, dashboards, D1 | everything |
| **L1** | Diagnose | run read-only runbook steps, post a SITREP | any mutating command |
| **L2** | Mitigate | roll back the last deploy, toggle a feature flag, restart a DO | D1 writes, schema changes, `wrangler rollback` past 1 revision |
| **L3** | Repair | apply a fix PR, re-run the smoke, scale a binding | production deploy, secret rotation, budget-policy override |

**Default is L2.** L3 requires an explicit opt-in per incident by the DRI.
L4 is never granted to an agent — L4 actions are human-only.

### The kill switch

Every agent action is gated by a single env var: `AGENT_AUTONOMY_MAX`.
Set to `L1` → the agent can diagnose but not mitigate. Set to `L0` → the
agent is read-only. The var is in the Worker's secret store, rotatable
without a deploy.

**Status**: the var is **not yet created** — add it with
`wrangler secret put AGENT_AUTONOMY_MAX` (value `L2` for the default) before
any agent is granted autonomy. Until it exists, no agent runs above L0.

**The kill switch is tested monthly.** If `AGENT_AUTONOMY_MAX=L0` does not
actually stop a mitigation, that is a P1.

## The SITREP format (what the agent posts)

The agent's first SITREP follows this shape, in this order. It is evidence-
grounded, not speculative — every claim links to a log line, a metric, or a
commit SHA.

```markdown
**SITREP #1** — <timestamp> — <incident-id>
**Status**: investigating | mitigating | monitoring | resolved
**Impact**: <one sentence, user-visible>
**Evidence**:
  - <log query> → <result>
  - <metric> = <value> (baseline <value>)
**Hypothesis**: <one sentence, confidence: high/med/low>
**Next action**: <the next command, or "awaiting DRI">
**Blast radius**: <what could get worse if we act>
```

If the agent cannot ground a claim in evidence, it says so. "I don't know
yet" is a valid SITREP.

## Standing instructions repository

The agent's skills live in `apps/music-maker/docs/runbooks/agent-skills/`,
committed to git. Changes go through PR review like code. The directory
contains:

- `triage/` — one markdown per bug class (the Anthropic pattern)
- `routing.md` — the deterministic rules above
- `lessons.md` — append-only log of what we learned
- `guardrails.md` — the autonomy levels and the kill switch

## Human override

At any point, a human types `/agent halt` in the incident channel. The agent
stops all mutating actions, posts a final SITREP, and hands off. The override
is logged and reviewed in the postmortem.