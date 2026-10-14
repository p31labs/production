# p31-rum — RUM beacon collector

Zero-dependency Cloudflare Worker (no package.json, no lockfile, no
node_modules). Wrangler bundles `src/index.ts` directly.

## Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/collect` | POST | Accept a JSON array of web-vitals beacons, validate, write to D1. Returns 204. |
| `/summary` | GET | Health-check aggregate: total count, latest ts, p75 per metric. |
| `/` | GET | Plain-language description + privacy contract. |

## Beacon shape (web-vitals v6 style)

```json
[
  { "name": "INP", "value": 123.4, "page": "https://p31ca.org/", "ts": 1770000000000 }
]
```

Validation at ingest: `name` ∈ {INP, LCP, CLS, TTFB, FCP}; `value` finite
and ≥ 0; `page` starts with `https://p31ca.org` or
`https://p31-portal-mcp-marketplace.pages.dev`; `ts` within ±1h of server
now. Payloads are capped at 64 beacons / 32 KB. Invalid input → 4xx, the
whole payload is rejected (no partial writes).

## Privacy contract (non-negotiable)

This worker stores **only** `name`, `value`, `page`, `ts` per beacon — in
the D1 table `rum_metrics`. It **never** reads or stores:

- cookies
- IP addresses
- user agents
- referrers
- any personal data

There is no request logging of any kind; Cloudflare Workers observability is
deliberately disabled in `wrangler.toml` so request metadata is not captured.
Beacons cannot be linked to a person or a session — they exist only to keep
the site fast. The same wording is served at `GET /`.

## CORS

`POST /collect` allows browser origins `https://p31ca.org` and
`https://p31-portal-mcp-marketplace.pages.dev`; `OPTIONS` preflight is
handled. Requests from any other `Origin` are rejected with 403.

## D1

Binding `RUM_DB`, database `p31-rum`. Schema in `schema.sql`
(applied via `wrangler d1 execute --remote --file schema.sql`).

## Deploy

```bash
wrangler deploy          # → https://p31-rum.trimtab-signal.workers.dev
```

## Not an MCP worker

This worker serves no MCP endpoints and is not registered in the MCP
registry; `mcp:health` probes are unaffected by it.