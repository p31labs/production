# Production Readiness Review — Control Server

Run this before the first production deploy of a new surface, DO class, or
migration. Sign-off requires SRE, the service owner, and (for schema changes)
the D1 owner.

**Standard**: this is the gate that would have caught Blockers 1–3 (the local
E2E preview proxy gap, the learn-test idempotency gap, and the unproven audio
path). Walk it before the next release; document every unchecked box as an
open action with an owner and a date.

## 1. Reliability

- [ ] SLOs defined for every user-visible path (see `slo-error-budget.md`)
- [ ] Error-budget policy documented and agreed
- [ ] Every alert has a runbook (or an issue to write one, tracked)
- [ ] Burn-rate alerts configured (multi-window, multi-burn-rate)
- [ ] On-call rotation staffed
- [ ] Rollback plan documented and **tested** (not just written)
- [ ] Canary or staged-release process defined

## 2. Observability

- [ ] Structured logs with a queryable schema (`app`, `ev`, `seq`)
- [ ] The four golden signals are visible: latency, traffic, errors, saturation
- [ ] "What is slow and why?" is answerable from existing telemetry
- [ ] Log retention defined (hot/cold)
- [ ] The agent's tools (Grafana, logs, GitHub) are wired via MCP
- [ ] The `ws_connected → snapshot_sent` latency SLI is measurable

## 3. Data

- [ ] D1 schema applied to remote **and** local
- [ ] Backup / restore tested (a restore drill, not a plan)
- [ ] Migration path reversible or forward-only with a documented bridge
- [ ] Data classification: what is PII, what is not
- [ ] Retention policy defined

## 4. Security

- [ ] Secrets in the Worker secret store, not in code or `.dev.vars`
- [ ] `AGENT_AUTONOMY_MAX` set and the kill switch **tested**
- [ ] Access controls reviewed (who can deploy, who can read D1)
- [ ] Dependency audit clean (`pnpm audit`)

## 5. Operations

- [ ] Deploy runbook written and tested by someone who did not write it
- [ ] The smoke test runs against the deployed URL
- [ ] The E2E suite runs against the deployed URL (`pnpm test:e2e:deployed`)
- [ ] The E2E suite runs locally with the DO (`pnpm test:e2e`)
- [ ] The agent's standing instructions (`oncall.md`) committed
- [ ] The runbook index has entries for every alert

## 6. Capacity

- [ ] DO destination budget (64) documented; behavior at the cap tested
- [ ] D1 row-count growth estimated; retention or archival defined
- [ ] WebSocket connection limit understood; backpressure tested
- [ ] `wrangler.toml` limits (CPU, memory, subrequests) reviewed

## Sign-off

| Role | Name | Date |
|---|---|---|
| Service owner | | |
| SRE | | |
| Security (if applicable) | | |
| D1 owner (if schema) | | |

Open actions are tracked in the PRR issue. **No PRR, no deploy.**

## Known open actions (from this build)

| # | Gap | Owner | Status |
|---|---|---|---|
| 1 | Audio graph is wired (`setParam`) but no test reads the result — needs a browser-mode AudioContext probe | @p31-platform | open |
| 2 | Burn-rate alerting not yet wired (no Grafana/Cloudflare Analytics backend) | @p31-platform | open |
| 3 | `AGENT_AUTONOMY_MAX` secret not yet created | @p31-platform | open |
| 4 | Smoke's hibernation step not yet in CI | @p31-platform | open |