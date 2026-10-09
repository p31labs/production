# @p31ca/forge-sdk

**Embed P31 Forge — the multi-agent IDE workspace — into any React application.** Forge gives your app a dockview-based IDE workspace with an xterm.js terminal, a 137-tool MCP browser, and a gamified status bar — all as drop-in React components.

Inspired by Cursor 3.2's Agents Window and the industry shift toward multi-agent orchestration, Forge provides the control surface every AI-augmented developer workflow needs.

## Installation

```bash
npm install @p31ca/forge-sdk
```

## Usage

```typescript
import { ForgeWorkspace, TerminalPanel, MCPToolPanel, ForgeStatusBar } from '@p31ca/forge-sdk';
```

### ForgeWorkspace

Dockview-based IDE workspace with 8 panels (Vibe Studio, Documents, Membrane, Devices, Artifacts, Terminal, Admin, MCP Tools).

### TerminalPanel

xterm.js terminal connected to a Cloudflare Sandbox via WebSocket.

### MCPToolPanel

Browser for 137 tools across 8 MCP servers with search, category filters, and one-click execution.

### ForgeStatusBar

Gamification HUD with XP/LOVE/level/streak from the Membrane coordinator. Pairs with `@p31ca/mcp-membrane` for real-time DORA-driven progress tracking.

## License

MIT — P31 Labs, Inc.
