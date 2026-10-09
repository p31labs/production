# @p31ca/mcp-membrane

**Post-deploy verification meets gamification.** The only MCP server that combines DORA metrics, deploy checks, and real-time XP/LOVE rewards into your AI agent's toolchain.

AI now writes 41% of all code, but delivery stability has dropped 7.2% and code churn has doubled. Teams need more than raw throughput — they need verification infrastructure that closes the loop. Membrane gives AI agents exactly that: a post-deploy audit layer that scores every deploy, tracks DORA trends, and rewards quality with XP and LOVE.

## Installation

```bash
npm install @p31ca/mcp-membrane
```

## Usage

### As an MCP server (stdio)

Add to your MCP client config (e.g., Cursor, Claude Desktop, VS Code):

```json
{
  "mcpServers": {
    "membrane": {
      "command": "npx",
      "args": ["-y", "@p31ca/mcp-membrane"]
    }
  }
}
```

### As a library

```typescript
import { MembraneClient, calculateDORAScore } from '@p31ca/mcp-membrane';

const client = new MembraneClient();
const state = await client.getState();
const metrics = await client.getDORAMetrics();
```

## Why Membrane?

DORA metrics alone are no longer enough. The 2025 DORA report proved that AI adoption correlates with increased delivery instability — even as individual productivity rises. Membrane is the first MCP server to close that gap by:

- **Verifying every deploy** — multi-category checks (HTTP, browser, asset, security, performance) with pass/fail tracking
- **Tracking DORA trends over time** — deployment frequency, lead time, change failure rate, and MTTR with color-coded scorecards
- **Gamifying operational excellence** — XP levels, LOVE rewards, achievements, and streaks for teams that ship quality

The result: your AI agents don't just write code faster — they verify it, score it, and earn rewards for getting it right.

## Tools

| Tool | Description |
|------|-------------|
| `membrane_status` | Get Membrane system status (XP, LOVE, level, streak, achievements) |
| `membrane_dora` | Get DORA metrics — deployment frequency, lead time, change failure rate, MTTR |
| `membrane_history` | Get deploy history with check results |
| `membrane_achievements` | List all unlocked achievements with tiers and timestamps |
| `membrane_deploy_check` | Record a deploy check result and earn XP/LOVE |
| `membrane_dora_scorecard` | Get a formatted DORA scorecard with color-coded status per metric |
| `membrane_artifact_mint` | Mint a physical artifact from an achievement |

## DORA Metrics

The server provides four key DORA metrics from Google's DevOps Research and Assessment team, with color-coded scoring:

| Metric | Elite | High | Medium | Low |
|--------|-------|------|--------|-----|
| Deployment Frequency | ≥ daily | ≥ weekly | ≥ monthly | < monthly |
| Lead Time for Changes | < 1 hour | < 1 day | < 1 week | ≥ 1 week |
| Change Failure Rate | < 5% | < 10% | < 15% | ≥ 15% |
| MTTR | < 1 hour | < 1 day | < 1 week | ≥ 1 week |

## License

MIT — P31 Labs
