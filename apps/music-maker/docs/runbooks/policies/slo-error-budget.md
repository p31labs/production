# SLO & Error Budget Policy — Control Server

**Last updated**: 2026-09-24
**Owner**: @p31-platform
**Review cadence**: quarterly

## Service Level Objectives

The SLIs below are grounded in what the build can actually measure today —
structured DO logs (`wrangler tail --format json`, filtered on `app:
"control-room"`). Instrumentation that does not exist yet is marked
**not yet wired**; it must not be claimed.

| SLI | SLO | Window | Measurement |
|---|---|---|---|
| Control-plane availability | 99.5% of WS connects receive a snapshot within 5s | 30 days rolling | DO logs: `ws_connected` → `snapshot_sent` (wire the snapshot log) |
| Committed-write success | 99.9% of `control.mapping.set` acks within 3s | 30 days rolling | DO logs: `ws_committed` / `ws_commit_rejected` ratio |
| Ephemeral fan-out | 99% of control moves delivered within 100ms | 30 days rolling | Client-side ack round-trip (sampled 1%) **not yet wired** |
| Hibernation wake | 99% of post-idle wakes fan out within 2s | 30 days rolling | Smoke step 5 in CI **not yet wired** (smoke is manual today) |

**Why not 99.99%**: the control plane is a family-scale utility. A 4-hour
outage per month is acceptable; each additional nine costs exponentially more
in engineering and adds nothing a family notices. See Google SRE, *Embracing
Risk*.

## Error budget

- Availability budget: `1 − 0.995 = 0.5%` = **3h 39m per 30 days**
- Committed-write budget: `1 − 0.999 = 0.1%` = **43m 12s per 30 days**

## Burn-rate alerting

**not yet wired.** The multi-window, multi-burn-rate rules below are the
intended shape (Google SRE Workbook § Alerting on SLOs) — they require an
alerting backend (Grafana/Cloudflare Analytics) that is not configured. Until
then, the on-call checks the SLO dashboard manually on a weekly cadence.

| Severity | Burn rate | Long window | Short window | Action |
|---|---|---|---|---|
| Critical | 14.4× | 1h | 5m | Page on-call |
| Critical | 6× | 6h | 30m | Page on-call |
| Warning | 1× | 3d | 6h | Ticket |
| Warning | 3× | 1d | 2h | Ticket |

A 14.4× burn exhausts the 30-day budget in ~50 hours. The short window is
required — it confirms the burn is *still* happening, not a stale alert.

## Error-budget policy (the part that makes SLOs decisions, not decoration)

**When budget remains** (burn rate < 1×): ship. Normal release cadence.

**When budget is at risk** (1×–3×): the DRI reviews the burn at the next
standup. No release freeze; add a postmortem if the burn crosses 3×.

**When budget is exhausted** (< 0%):
1. **Release freeze** on the control plane — only reliability fixes ship.
2. **Mandatory postmortem** within 72h, owner @p31-platform.
3. **On-call review**: the DRI writes a one-page "what we learned" and the
   action items enter the next sprint.
4. **Budget restore**: the freeze lifts when the trailing 7-day burn is
   < 0.5×. The DRI announces it in the incident channel.

**When budget is blown by a planned change**: the change is rolled back, not
the policy. Planned risk is still risk.

## Anti-patterns (named so we don't do them)

- **Calendar windows** reset favorably at month boundaries and mask incidents
  that fall just before. We use rolling windows only.
- **Alerting on symptoms, not risk**: a `ws_connected` count is not an SLO.
  Alert on the burn rate of the *user-visible* SLI.
- **SLOs with no policy**: an SLO that doesn't gate a release is a dashboard.