# Post-Launch Monitoring Plan (Path E)

_Last updated: 2026-09-14_

This is the operational monitoring plan for P31 after launch. It applies to the
seven portals (chat, children, teen, parent, meatspace, design, qpj), the
substrate workers when reactivated (`p31-dispatch`, `p31-passport`), and the
WebMCP tool-registration path.

## Metrics and alert thresholds

| Metric | Source | Alert threshold | Action |
| --- | --- | --- | --- |
| 5xx error rate | Cloudflare Workers analytics (portal workers) | > 1% of requests over 15 min | Check worker logs and deploy errors; page on-call if confirmed |
| LCP (largest contentful paint) | Cloudflare Web Analytics / PageSpeed | p75 LCP > 2.5 s over a day | Audit bundle size, vendor tarball weight, image and font loading |
| WebMCP tool-call failure | Client-side tool-registration logs (`registerTools`, `webmcp` in portal `src/lib/`) | Tool-call failure rate > 5% over an hour | Verify origin-trial token validity, vendor support, registration fallback |
| Dispatch 401/403 storm | Worker logs on `p31-dispatch` (verification failures return 403; `p31-passport` returns 401) | Sustained spike in 401/403 responses exceeding the site-wide request rate | Page on-call immediately — this indicates a broken verification path or an identity-isolation regression |
| Accessibility regression | axe-core runs in CI + quarterly manual pass | Any new violation introduced | Block release; fix before deploy |

## Data sources

- **Cloudflare Workers analytics** — request throughput, 5xx rates, per-portal
  breakdown. Portals: `p31-portal-{children,parent,teen,meatspace,design,qpj,chat}`.
- **Cloudflare Web Analytics / PageSpeed** — field Core Web Vitals (LCP, CLS,
  INP), per portal and per theme where surfacing allows.
- **Worker logs** — console logs from `p31-dispatch` (routing, verification,
  custom-limits enforcement) and `p31-passport` (`PassportDO` wake/hibernate
  cycles, SQLite transactions). Substrate logging only has signal once the
  reactivation RFC lands; until then the alert thresholds above that reference
  the substrate are dormant.

## Alert thresholds

- All alerts route to the on-call contact below.
- **P1 (page now)**: dispatch 401/403 storms; 5xx error rate > 1% persisting
  past 15 minutes; any indication of cross-passport data leakage.
- **P2 (same day)**: LCP regression; WebMCP tool-call failure > 5%; single
  portal 5xx spike below the P1 bar.
- **P3 (next working day)**: new accessibility violations; monitoring gaps;
  threshold tuning.

## Weekly review ritual

Every week, on a fixed day, the on-call completes this checklist:

- [ ] 5xx error rate stayed under 1% on all seven portals for the week (workers
  analytics)
- [ ] p75 LCP under 2.5 s on all portals that saw real traffic; any regression
  has a logged follow-up
- [ ] WebMCP tool-call failure rate under 5%; origin-trial token validity
  re-checked (Google tokens expire 2026-11-16)
- [ ] No unacked alert from the week; alert history reviewed and thresholds
  tuned if too noisy or too quiet
- [ ] One manual accessibility spot-check on a changed surface (or CI axe-core
  output reviewed) — zero new violations

If any item fails, open a tracking issue the same day with the owner named and
a target date.

## On-call

On-call contact (placeholder): **oncall@p31ca.org**

Rotation and escalation policy are set by the core team; the placeholder above
should be replaced with the active on-call address or paging channel before
launch.

## Dormant substrate note

Many thresholds in this plan are defined now so signal exists before the
substrate reactivates. Until `p31-dispatch` and `p31-passport` are live,
ignore the substrate-specific thresholds and treat WebMCP status as read-only
monitoring of the client-side trial path.