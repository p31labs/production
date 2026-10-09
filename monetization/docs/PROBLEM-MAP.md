# Problem Map — 16 concrete failure modes (good-first-issue seeds)

Every item is a real, reproducible issue in the current codebase with a concrete
fix. Label each `good-first-issue`. Contributors can recognize their exact pain
point and patch it.

## Portal (production/monetization)
1. **Webhook HMAC fails on malformed JSON** — `btcpay-gateway /webhook` returns 400
   before HMAC check when the body isn't JSON. Fix: verify HMAC on the raw body
   first, then parse (reject with 401 on bad signature regardless of parseability).
2. **SLO snapshot misses a cron window** — p31-ci `scheduled` has no catch-up;
   a missed 15-min fire leaves a gap in `slo_snapshots`. Fix: on each fire, backfill
   the last window if absent.
3. **Spoon profile doesn't persist on mobile Safari** — `localStorage` may throw in
   private mode; `useSpoonsStore` swallows it but defaults reset to 3. Fix: add an
   in-memory fallback + a `storage` event sync across tabs.
4. **`verify-sbt?hash=` link 404s** — the Profile SBT row links to a hash route that
   isn't a real surface. Fix: wire a VerifySbt surface (or a real `/api/sbt/verify`
   proxy call) that renders the registry entry.
5. **Opportunities chain filter resets scan** — switching chain in
   `OpportunitiesSurface` refetches but the previous chain's opportunities linger in
   cache. Fix: use a per-chain query key (already keyed) + `refetchOnMount`.
6. **Billing `Check Entitlement` shows 402 as error** — `entitlement/check` returns
   402 for free-tier; the surface treats non-ok as failure. Fix: treat 402 as a
   valid "paywall" outcome and render a clear action.
7. **Usage sparkline shows raw day indices** — `by_day` day keys are epoch-days;
   the Ops/Usage widget plots gaps as zero. Fix: bucket into a continuous 7-day
   series before plotting.

## Workers (production/workers)
8. **`mev-arbitrage /execute` errors on missing opportunity fields** — a fake
   `opportunity_id` yields `D1_TYPE_ERROR` instead of a clean 404. Fix: validate the
   opportunity exists before executing; return `{ error: 'opportunity not found' }`.
9. **p31-ci `/metrics` double-counts same-service deploys** — deploy_start +
   deploy_success for one release count as two deploy events in frequency. Fix:
   count only `deploy_success` for frequency; use start events only for lead-time.
10. **p31-sbt Loom anchor silently off** — `LOOM_ANCHOR_URL` host 404s; `anchored`
    stays 0 with no alert. Fix: surface an `anchor_status` field + a retry/backoff;
    document the loom route.
11. **config-gateway `/api/usage/sli` divides by zero** — `availability` is `null`
    when `total_calls` is 0; the SLO worker then skips the snapshot. Fix: emit a
    `{availability: null, total_calls: 0}` snapshot explicitly.
12. **MCP `/resources/:tool` GET leaks tool existence** — GET returns 200 metadata
    for a paid tool (unpaywalled). Fix: return 402 for unpaid GETs on paid resources.
13. **`revenue/record` accepts duplicate idempotency keys** — the ledger `UNIQUE(hash)`
    guards hash but not `settlement_tx`; a webhook retry with the same tx inserts a
    second entry with a different hash. Fix: idempotency on `settlement_tx`.

## Infra / tooling
14. **`token-audit` misses inline `rgb()` in JSX styles** — the gate scans CSS only;
    a `style={{ color: 'rgb(...)' }}` in a surface bypasses it. Fix: extend the scan
    to `.tsx` string literals for `#hex`/`rgb(`.
15. **`evidence-collect.mjs` hardcodes the portal URL** — the `PORTAL_URL` fallback
    breaks in local dev. Fix: read from env `PORTAL_URL` (already supported) and fail
    loudly if unset and unreachable.
16. **No `refetchOnMount` for SBT list** — navigating back to Profile serves a stale
    SBT gallery. Fix: add `refetchOnMount: true` to `sbtListQuery`.

**How to use:** open one issue per item with the exact repro + the suggested fix.
Tag `good-first-issue` + `problem-map`. Merge the fix, close the issue, award a
`code-contributor` SBT.