# @p31ca/forge-mcp

MCP server for the **P31 Forge** — generate themed, evidence-blocked `.docx`
documents from any MCP client (Claude Desktop, Cursor, Windsurf, VS Code).

The Forge is the transducer between agent reasoning and human-readable output:
typed content pack in, styled document out. Two modes:

- **hub** — warm cream + terracotta (public front door)
- **scene** — deep void + cyan (technical)

Every factual claim should carry an **evidence item** (`claim` + `value` +
`source` + `verified`) — the P31 credibility primitive.

## Install

```bash
npm i -g @p31ca/forge-mcp
# or run from source:
pnpm --filter @p31ca/forge-mcp dev
```

## Configure

Add to your MCP client's config:

```json
{
  "mcpServers": {
    "p31-forge": {
      "command": "npx",
      "args": ["-y", "@p31ca/forge-mcp"],
      "env": {
        "FORGE_OUT_DIR": "/absolute/path/to/forge-out"
      }
    }
  }
}
```

## Tools

| Tool | What it does |
|---|---|
| `forge_health` | Liveness + version |
| `forge_brand` | Two-mode palette, typography, entity constants |
| `forge_stylize` | Render a content pack → themed .docx |
| `forge_compile` | Render a content pack (base route) |

## Example call (from an agent)

> "Draft a one-page memo about our hash-chain audit layer, in the hub theme,
> with an evidence block for the live chain."

The agent calls `forge_stylize` with:

```json
{
  "kind": "memo",
  "theme": "hub",
  "title": "Hash-Chain Audit Layer",
  "body": [
    {
      "type": "para",
      "text": "Our agent governance layer records every action in a tamper-evident hash chain."
    },
    {
      "type": "evidence",
      "claim": "Live chain valid",
      "value": "checked 16 events",
      "source": "loom.p31ca.org/api/loom-public/verify",
      "verified": "2026-09-23"
    }
  ]
}
```

Result: a themed `.docx` at `$FORGE_OUT_DIR/hash-chain-audit-layer.docx`.

## Env

| Var | Default | Purpose |
|---|---|---|
| `FORGE_BASE_URL` | `https://p31-forge.trimtab-signal.workers.dev` | Forge worker URL |
| `FORGE_API_KEY` | — | Sent as `X-Forge-Key` when present |
| `FORGE_OUT_DIR` | `./forge-out` | Where `.docx` files land |

## Build + verify

```bash
cd packages/forge-mcp
pnpm install
pnpm typecheck   # 0 errors
pnpm test        # 8/8 pass
pnpm build       # dist/ emits
```