# MCP Registry + Claude Connectors Directory — Submission Kit

Status: DRAFT. Submit after the first Bazaar settlement triggers indexing (both
directories are credibility-gated on a live settlement).

## 1. Official MCP Registry — server.json

- Name (reverse-DNS, exactly one slash): `org.p31ca/capital-machine` (domain-based
  auth — requires DNS/HTTP verification of p31ca.org).
- `$schema`: `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`
- packages block: registryType `npm` (or `remote` with `transport` url +
  `request` headers for the remote MCP endpoint), version (semver).
- environmentVariables: names only, never secrets (`PAY_TO`? no — only non-secret
  config names if needed).
- `_meta` under `io.modelcontextprotocol.registry/publisher-provided`, ≤4KB.

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "org.p31ca/capital-machine",
  "description": "x402-gated, hash-chained capital management for AI agents (revenue, positions, opportunities, operator capital tools).",
  "version": "0.1.0",
  "packages": [
    {
      "name": "@p31ca/capital-machine-mcp",
      "registryType": "npm",
      "version": "0.1.0",
      "environmentVariables": ["NETWORK"]
    }
  ]
}
```

(Remote alternative: packages[].transport = { url: "https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp", request: { headers: {} } }.)

## 2. Claude Connectors Directory — annotations (required on every tool)

Rules: every tool needs `title` + `readOnlyHint` or `destructiveHint`; read and
write tools must be separate; tool names ≤64 chars; descriptions match behavior.

| Tool | title | hint |
|---|---|---|
| revenue.getSummary | Get revenue summary | readOnlyHint |
| positions.list | List positions | readOnlyHint |
| opportunities.scan | Scan opportunities | readOnlyHint |
| entitlement.check | Check entitlement | readOnlyHint |
| billing.listTiers | List billing tiers | readOnlyHint |
| allocator.status | Allocator status | readOnlyHint |
| compounder.status | Compounder status | readOnlyHint |
| health | Health | readOnlyHint |
| allocator.rebalance | Trigger rebalance | destructiveHint |
| compounder.trigger | Compound positions | destructiveHint |
| opportunities.execute | Execute opportunity | destructiveHint |

Required additions:
- Three working examples: health, revenue.getSummary (paid), billing.listTiers (free).
- Privacy policy: reuse the Trust Center (portal `/trust`) statement.

## 3. Submit order
1. First Bazaar settle (docs/BAZAAR-UNLOCK.md) → endpoint indexed.
2. Publish npm package with `mcpName` = `org.p31ca/capital-machine` + server.json.
3. Submit server.json to registry.modelcontextprotocol.io.
4. Submit Claude Connectors Directory form (annotations above, OAuth 2.1 already live).