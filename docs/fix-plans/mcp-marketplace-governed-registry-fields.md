# fix: registry governed metadata fields — RESOLVED (fields now render)

<!-- P31-HEADER
id: p31_fix_plan_mcp_marketplace_governed_registry_fields_20261011_v1.0
type: fix-plan
component: workers/mcp-registry + portals/mcp-marketplace
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

The portal storefronts (B-1) render `price_tier`, `protocol`, `oauth`,
`approval`, `source`, and the governed lens renders private servers +
analytics — but the live registry (`mcp-registry.trimtab-signal.workers.dev`
GET /servers, probed 2026-10-11) did not return any of these fields.
They are Lane A/E work running in parallel with this portal lane.

## Evidence of resolution (probed 2026-10-12, canon v2 port wave)

GET https://mcp-registry.trimtab-signal.workers.dev/servers/p31-crypto now
returns the governed fields:

```
"source":"p31",
"oauth":{"enabled":false,"resource":null,"authorization_servers":[]},
"protocol":"2026-07-28",
"approval":"approved",
"priceTier":null,
"pricedTools":[],
"probed":true
```

and `/servers` includes `source`, `approval`, `oauth`, `protocol` across the
catalog. The portal's `src/types/index.ts` (`ServerDetail.source`,
`protocol`, `oauth`, `priceTier`, `approval`) matches the registry payload
names, so the storefront badges now receive live values:

- `SourceBadge` → "p31" (green, "made by P31")
- `ProtocolBadge` → "2026-07-28"
- `OAuthBadge` → "sign-in off" (enabled:false)
- `ApprovalBadge` → "Approval: approved"
- `PriceTierBadge` → "price: n/a" only where `priceTier` is genuinely null
  (p31-crypto ships no pricing) — the honest dead-data state the plan
  endorsed; no fabrication.

## Portal follow-up status

- The "n/a" fallbacks were ALREADY dead-data-only states (conditional on
  field absence) — no removal needed; with fields present they simply do
  not render.
- Governed-lens live endpoints (private servers list, analytics readout)
  remain tracked by their own Lane A/E plans; the portal still renders the
  honest "not shipped yet" stubs until those endpoints land.

## Negative control

Before the registry shipped the fields (2026-10-11): storefronts rendered
neutral badges and the governed lens showed the stub — verified live at the
deployed URL. No UI claimed a price, approval, or OAuth status the registry
could not prove.