<!-- P31-HEADER
id: p31_agent_runbook_part2_20261004_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-04T00:00:00Z
owner: will
-->

# AGENT-RUNBOOK-PART2.md — Operational Continuity

**Authority:** This is the runbook for the MCP reliability + theming layer. It
extends `AGENT-RUNBOOK.md` (the safety runbook). If this file conflicts with
chat instructions, this file wins.

## THE PROBLEM (root cause, verified on disk)

All 8 local stdio MCP servers in `opencode.jsonc` pointed at
`/home/p31/production/...` — a root that does not exist. The real
servers live at `production/cli/*` and `production/tools (1)/phos-forge/`. The
`-32000 Connection closed` errors were **spawn failures (ENOENT)**, not
transport drops.

## THE LAYERS

| Layer | File | What it does |
|---|---|---|
| Path gate | `scripts/verify-mcp-paths.mjs` | Asserts every server entrypoint exists |
| Health hook | `~/.config/opencode/plugin/mcp-health.mjs` | Probes on first use / on-failure, auto-restart w/ backoff, `mcp__status` + `mcp__reconnect` self-heal tools |
| Lifecycle manager | `~/.config/opencode/mcp-manager.mjs` | 30s ping · 5s timeout · 3-fail threshold · auto-restart · 1s→30s backoff (run as supervisor: `pnpm mcp:manage`) |
| Self-heal tools | via health hook `tool` hook | `mcp__status` + `mcp__reconnect` — the agent fixes drops itself |
| Theme | `~/.config/opencode/themes/p31-quantum.json` + `production/.opencode/themes/p31-quantum.json` | The P31 Quantum skin (project-scoped wins over global) |

## THE PLUGIN LOAD RULE (empirical, verified 2026-10-04)

opencode 1.18.34 plugin loader:
- Requires ESM `export default` for `.js`/`.mjs` plugins in the config dir.
- A CJS `module.exports = fn` plugin silently fails to load (`Plugin export is
  not a function`) — the veto gate and health hook were NEVER loaded until
  converted to ESM. The `pnpm gate` did not catch this because its gates test
  static scanners, not live plugin loading.
- Top-level `import` works; **do NOT export live bindings (`let`) by name** —
  it breaks the loader ("Plugin export is not a function").
- The config/dispose hook errors logged on every run are benign (they appear
  even with `plugin: []` — they come from opencode's default plugins).

## THE VETO GATE FIX (A')

`input.permission` does NOT exist on `PluginInput`. The old `permission.ask`
path was dead code; the throw is the only real block mechanism. Also fixed the
whitelist bypass: `echo ... | sh`, `cat x | sh`, and `node -e 'rmSync()'` used
to pass because SAFE_PREFIXES short-circuited the destructive scan. Now the
destructive + by-construction patterns are checked BEFORE the safe prefixes.

## THE THEME TOKENS (from canon, cited on disk)

| Token | Value | Source |
|---|---|---|
| `--p31-bg` | `oklch(17% 0.03 55)` | `portals/shell/src/index.css:14` |
| `--p31-surface` | `#241c14` | `index.css:15` |
| `--p31-surface2` | `#3a2f1e` | `index.css:16` |
| `--p31-accent` | `#e2b74b` | `index.css:17` |
| `--p31-accent-green` | `#7ed99b` | `index.css:18` |
| `--p31-accent-red` | `#e48a80` | `index.css:19` |
| `--p31-text` | `#faf6ee` | `index.css:20` |
| `--p31-text-secondary` | `#cbbfae` | `index.css:21` |

Theme rule: any color claim must cite disk evidence (`index.css:NN`). The
`#171010` background is the hex family match for `oklch(17% 0.03 55)`.

## THE GATES

| Gate | Command | What it proves | Negative control |
|---|---|---|---|
| MCP paths | `pnpm mcp:paths` | Every server entrypoint exists | Wrong path → fails |
| MCP health | `pnpm mcp:health` | All servers probe healthy (JSON-RPC POST initialize) | `kill -9` a server → fails |
| MCP restart | `pnpm mcp:restart <server>` | A stopped server restarts | Bogus name → fails |
| MCP manage | `pnpm mcp:manage` | The lifecycle supervisor runs (auto-restart proven: `kill -9 bob` → `server:restart-succeeded`) | — |
| Theme valid | `pnpm theme-check` | Theme JSON validates | Malformed JSON → fails |

**Known outage (filed):** `x402-gateway` returns 502 on initialize — see
`docs/fix-plans/x402-gateway-502-outage.md`. The corrected JSON-RPC POST probe
honestly flags it; the old GET probe (`r.status < 500`) masked it as healthy.

## THE MCP HEALTH STATE FILE

`~/.config/opencode/mcp-health-cache.json`:

```json
{
  "bob": { "status": "unhealthy", "lastCheck": 1759500000000, "failures": 3, "reason": "spawn ENOENT (path missing)" }
}
```

## THE COMMANDS

```bash
pnpm gate                                        # all sensors + negative controls + mcp:paths + theme-check
pnpm mcp:paths                                   # server entrypoints exist
pnpm mcp:health                                  # all servers probe healthy (JSON-RPC POST)
pnpm mcp:restart <server>                        # restart a stopped server
pnpm mcp:manage                                  # run the lifecycle supervisor daemon
pnpm theme-check                                 # theme JSON valid
node ~/.config/opencode/mcp-manager.mjs status   # lifecycle manager state
```

## THE RULES

1. A disconnected MCP server is a **spawn problem first** — check the path before the transport.
2. The health hook is the first responder; the manager is the second; the agent (`mcp__reconnect`) is the third.
3. The project-scoped theme wins over the global theme (same filename, closer to CWD).
4. Every gate has a negative control that must fail.
5. The skin derives from canon tokens — never invent a color.
6. Plugins MUST be ESM (`export default`) and must not export live bindings by name.
7. A red `mcp:health` is a finding, not a bug in the gate — file a fix-plan (see x402-gateway).

<!-- P31-FOOTER
checksum: pending
related: p31_agent_runbook_20261004_v1.0
audit_chain: https://p31-portal-shell.pages.dev/api/bus/verify-chain
-->