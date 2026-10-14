<!-- P31-HEADER
id: p31_fix_plan_p31ca_rum_collector_20261013_v1.0
type: fix-plan
component: workers/p31-rum (RUM beacon collector) + D1 database p31-rum
status: resolved
retention: keep-forever
created: 2026-10-13T22:00:00Z
owner: will
-->

# fix-plan: p31-rum RUM beacon collector — deployed, live-verified

**Discovered by:** agent:subagent:rum-collector (Lane 2 of the Content-refresh
+ RUM wave; STATE.md "Lane 2 (new infra, NOT the hub)").
**Discovered at:** 2026-10-13T22:00:00Z
**Severity:** medium — field INP/LCP/CLS measurement is blocked until a beacon
endpoint exists (filed by `p31ca-inp-measurement-2026-10-13.md` item 1: "no
beacon ships to production without an endpoint").

## Symptom

The lab INP harness (`apps/p31ca/scripts/measure-inp.mjs`) cannot produce real
field INP. Field web-vitals RUM requires a collector endpoint; none existed.
This lane built and deployed one: `workers/p31-rum`.

## What was built

`workers/p31-rum/` — zero-dependency worker (no package.json, no node_modules,
no lockfile mutation; wrangler bundles `src/index.ts` with esbuild directly):

| Route | Method | Behavior | Location |
|---|---|---|---|
| `/collect` | POST | Validate JSON beacon array, batch-insert into D1, 204 | `src/index.ts:137` `handleCollect` |
| `/collect` | OPTIONS | CORS preflight, 204 | `src/index.ts:235` fetch router |
| `/summary` | GET | count + latest_ts + p75 per metric | `src/index.ts:197` `handleSummary` |
| `/` | GET | plain-language description + privacy contract | `src/index.ts:118` `ROOT_TEXT` |

Validation (`src/index.ts:45-89`): `name` ∈ {INP, LCP, CLS, TTFB, FCP}
(`:45`); `value` finite and ≥ 0 (`:82-84`); `page` starts with
`https://p31ca.org` or `https://p31-portal-mcp-marketplace.pages.dev`
(`:48-52`, `:75`); `ts` within ±1h of server now (`:87`); payload capped at
64 beacons (`:59`, `:166-169`) and 32 KB (`:60`, `:139-146`). Any invalid
beacon → 400, whole payload rejected (no partial writes).

CORS (`src/index.ts:91-103`): only the two allowed origins; preflight returns
`Access-Control-Allow-Methods: POST, OPTIONS`, `-Headers: Content-Type`,
max-age 86400. A POST carrying a disallowed `Origin` → 403 (`:141-143`).

## D1

- Database: `p31-rum`, ID **`988b037b-2c28-49fa-b5e9-1c0895df7842`**, region
  ENAM, created via `wrangler d1 create p31-rum` (stored OAuth session,
  trimtab-signal account, `d1:write` scope verified with `wrangler whoami`).
- Binding in `workers/p31-rum/wrangler.toml:13-16`: `RUM_DB`, database_name
  `p31-rum`, database_id as above.
- Schema (`workers/p31-rum/schema.sql`, applied 2026-10-13 via
  `wrangler d1 execute p31-rum --remote --file schema.sql`, 2 queries OK):

```sql
CREATE TABLE IF NOT EXISTS rum_metrics (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT    NOT NULL,   -- INP | LCP | CLS | TTFB | FCP
  value REAL    NOT NULL,
  page  TEXT    NOT NULL,
  ts    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rum_metrics_name_ts ON rum_metrics (name, ts);
```

## Deploy evidence

- `wrangler deploy` 2026-10-13 → `https://p31-rum.trimtab-signal.workers.dev`
- Version IDs: `7c1d5b51-e0a4-4375-ab8d-a8d641e37c53` (v1), then
  `d5419ccc-91cb-4842-bfe1-1ace73dd3fe1` (v2, the p75 fix below).
- Deploy output confirmed binding: `env.RUM_DB (p31-rum) → D1 Database`.

## Live checks (curl, 2026-10-13, current version)

1. `POST /collect` 2 beacons (LCP 1812.5 on `https://p31ca.org/`, INP 142 on
   the portal) with `Origin: https://p31ca.org` → **204**.
2. `POST /collect` 3 CLS beacons (0.01/0.05/0.03) → **204**.
3. `GET /summary` →

```json
{"ok":true,"count":7,"latest_ts":1791930763172,
 "metrics":[{"name":"CLS","count":3,"p75":0.05},
            {"name":"INP","count":2,"p75":142},
            {"name":"LCP","count":2,"p75":1812.5}]}
```

4. Invalid beacon (page `https://evil.example.com/`) → **400**; invalid name
   (`PII`) → **400**; stale ts (0) → **400**.
5. Preflight `OPTIONS /collect` from `https://p31ca.org` → **204** with
   `access-control-allow-origin: https://p31ca.org`.
6. POST with `Origin: https://evil.example.com` → **403**.
7. `GET /` → the privacy text below, verbatim.

## Privacy contract (non-negotiable — the wording served at GET /)

> P31 RUM collector — real-user-monitoring beacon endpoint for P31 surfaces.
> What it stores: exactly four fields per beacon — metric name, value, page
> path, and unix timestamp — in a D1 table. Nothing else.
> What it NEVER stores: no cookies, no IP addresses, no user agents, no
> referrers, no personal data of any kind. Requests are not logged.
> Privacy contract: read-only performance measurement. Beacons cannot be
> linked to a person or a session; they exist only to keep the site fast.

Enforced mechanically: the worker never reads any request header except
`Origin` (for CORS) and `Content-Length` (for the size cap); no logging;
Cloudflare Workers observability is deliberately OFF in wrangler.toml
(`workers/p31-rum/wrangler.toml:7-9` comment) so per-request metadata is not
captured. Same wording in `workers/p31-rum/README.md`.

## Honesty notes

1. **p75 implementation:** v1 computed p75 with a correlated `OFFSET`
   subquery; D1's SQLite rejects the outer-alias reference inside the OFFSET
   (`no such column: m.name`, SQLITE_ERROR 7500) → `GET /summary` returned
   Workers error 1101. Fixed in v2 (`d5419ccc`): one simple ordered query +
   JS nearest-rank p75 (`src/index.ts:197-231`). Two earlier post-deploy
   curls still hit the old version (colo propagation lag); re-verified green
   after the redeploy.
2. **Debug tail:** a temporary `wrangler tail` session was used once to
   confirm the 1101 cause, then killed (SIGTERM). Cloudflare's tail
   infra captures request metadata transiently during any tail session —
   nothing of it is read by or stored in this worker or D1, and no tail is
   running now. Noted for the record per the no-PII contract.
3. **Seed rows:** the 7 rows in `rum_metrics` are this agent's own curl
   check-beacons (no real user traffic yet — hub wiring is the OPEN
   `p31ca-rum-wiring-2026-10-13.md`). They are honest health-check proof and
   contain no PII; they may be pruned later via D1 SQL if desired.

## mcp:health unaffected

This is **not** an MCP worker: no MCP endpoints, no MCP registry entries, no
service bindings added or consumed. The registry's health probes enumerate
known MCP servers only; `p31-rum` is invisible to `mcp:health` and cannot
perturb it.

## Files touched

- NEW `workers/p31-rum/wrangler.toml`
- NEW `workers/p31-rum/src/index.ts`
- NEW `workers/p31-rum/schema.sql`
- NEW `workers/p31-rum/README.md`
- NEW `docs/fix-plans/p31ca-rum-collector-2026-10-13.md` (this file)
- OPEN follow-up: `docs/fix-plans/p31ca-rum-wiring-2026-10-13.md` (hub-side
  inline web-vitals wiring — rides the next hub deploy)