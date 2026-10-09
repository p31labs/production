# P31 Sovereign Shell — MCP Server

## Endpoint

`POST https://p31-shell.trimtab-signal.workers.dev/mcp` — JSON-RPC 2.0, 2026-07-28 spec.

## Health

`GET /mcp/health → { status: "ok" }`

## Tools

~90 tools grouped by category:

**System**
`spoons:set` – Set current spoon level | `spoons:rest` – Log rest activity | `spoons:forecast` – Predict spoon energy | `undo` – Revert last change | `indent` – Adjust indent

**Assistant**
`assistant:open` – Open AI assistant panel | `assistant:mode` – Switch mode (coach/companion/etc.) | `assistant:summarize` – Summarize open tabs

**Cognitive**
`task:breakdown` – Decompose goal into spoon-friendly steps | `task:complete` – Mark step done | `task:rebreakdown` – Re-run LLM breakdown | `time:estimate` – Estimate task duration from complexity + spoons | `crisis:check` – Scan message for crisis keywords | `grounding:54321` – Sensory grounding exercise | `stall:diagnose` – Diagnose why you feel stuck | `meltdown:plan` – De-escalation plan by spoon level | `next:action` – Pick best next action given energy | `habit:stack` – Attach new habit to existing routine

**Comms**
`comms:say-no` – Decline gracefully | `comms:boundary` – Set boundary around topic | `comms:capacity` – Express current capacity | `comms:clarify` – Ask for clarification | `comms:followup` – Gentle follow-up

**MCP**
`mcp:list` – List all servers from p31-shell.mcp.json | `mcp:call` – Call a tool on a remote MCP server | `mcp:explorer` – Open MCP explorer UI

**Mesh**
`mesh:connect` – Connect to P2P mesh | `mesh:disconnect` – Disconnect | `mesh:transport` – Switch transport (peerjs/tailscale/libp2p) | `mesh:status` – Peer mesh status | `node:pair` – Pair with node | `node:status` – Node health | `tailscale:config` – Tailscale config | `tailscale:status` – Tailscale status

**LOVE**
`love:earn` – Earn LOVE tokens | `love:chain` – View LOVE chain | `love:status` – LOVE score status | `love:balance` – Check balance | `love:refresh` – Refresh LOVE data

**Identity**
`identity:open` – Navigate to Identity tab in Profile | `identity:rotate` – Rotate keys (Ed25519 + ML-DSA-65)

**Sensory**
`sensory:muted` – Muted colors | `sensory:warm` – Warm light | `sensory:calm` – Calm mode (no motion) | `sensory:focus` – Focus mode | `sensory:simple` – Simplify cockpit | `sensory:task` – Task hub toggle

**Apps & Navigation**
`vault:open` – Navigate to Wallet tab in Profile | `hub:open` – Open hub | `market:open` – Open marketplace | `justice:open` – Open justice hub | `sbt:open` – Open SBT panel | `duna:status` – DUNA status | `akinator:start` / `akinator:answer` / `akinator:state` – Akinator game | `ollama:status` / `ollama:chat` – Ollama local LLM | `receipt:submit` – Submit receipt | `intent:quote` – Request intent quote | `passport:open` – Navigate to Passport tab in Profile | `effects:reset` / `effects:quantum` – Effects toggles | `notif:markAllRead` / `notif:clear` – Notification management

## Edge vs Browser

Most tools use browser runtime APIs (zustand stores, IndexedDB, WebSocket) and return an error when called via `tools/call` at the edge. Edge-safe tools include:

- **`mcp:list`** — Reads the static `p31-shell.mcp.json` manifest via fetch
- **Crypto verification** — Ed25519 / ML-DSA-65 signature verification (pure WASM/JS, no browser API)

For full access, run the shell in-browser at `https://p31-shell.trimtab-signal.workers.dev`.

## Usage

**List tools:**
```bash
curl -s -X POST https://p31-shell.trimtab-signal.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq .result.tools
```

**Call a tool:**
```bash
curl -s -X POST https://p31-shell.trimtab-signal.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"crisis:check","arguments":{"message":"help"}},"id":2}'
```

**Claude Desktop config (`claude_desktop_config.json`):**
```json
{
  "p31-shell": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-fetch", "https://p31-shell.trimtab-signal.workers.dev/mcp"]
  }
}
```

**Cursor MCP config (`.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "p31-shell": {
      "url": "https://p31-shell.trimtab-signal.workers.dev/mcp"
    }
  }
}
```
