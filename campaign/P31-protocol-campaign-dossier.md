# P31 Protocol Hardening Campaign — Standalone Dossier

## Purpose

A self-contained paste-in dossier of the full P31 MCP ecosystem (source code,
infrastructure, campaign plan) for analysis by **DeepSeek, Gemini, and Claude**
to produce convergent protocol-hardening recommendations.

## How to Use

1. **Paste this entire document** into each AI.
2. Prompt: *"Analyze P31's MCP protocol hardening campaign. Identify gaps,
   risks, and sequencing errors. Recommend specific code changes and a
   dependency-safe execution order. Then produce a unified diff for Phase 1."*
3. After convergence analysis, execute the **campaign plan** in sequence
   starting with Phase 0 (audit).

---

## 1. Situation Map

### Layer 1: CLI MCP Servers (8) — Need Upgrade
All use **old handshake** (`protocolVersion: '2024-11-05'`) with explicit
`initialize`/`notifications/initialized` state machine. They are **stdio
transport** — stdin JSON-RPC, stdout responses, stderr logging.

| # | File | Tools | Lines | initialize @ |
|---|------|-------|-------|-------------|
| 1 | `cli/mcp-server.js` | 11 | 364 | 304 |
| 2 | `cli/component-registry.js` | 5 | 833 | 781 |
| 3 | `cli/love-registry.js` | 4 | 164 | 129 |
| 4 | `cli/cognitive-prosthetic.js` | 47 | 872 | 828 |
| 5 | `cli/cognitive-comms.js` | 20 | 299 | 255 |
| 6 | `cli/marge-server.js` | 14 | 1083 | 1039 |
| 7 | `cli/bob-server.js` | 14 | 1180 | 1136 |
| 8 | `tools/phos-forge/mcp-server.mjs` | 24 | 798 | 738 |

**Pattern in every CLI server:**

```js
case 'initialize':
  respond(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name, version } });
  break;
case 'notifications/initialized':
  break;  // silently ignore
```

### Layer 2: Gateway MCP Proxy — Already Stateless
`apps/gateway/src/mcp/proxy.ts` uses `protocolVersion: '2026-07-28'` and does
NOT handle `notifications/initialized` — it falls through to `-32601` Method
not found. **Needs**: add silent `notifications/initialized` handler.

### Layer 3: x402 Bridge — Uses Old Protocol
`workers/mcp-x402-gateway/bridge/src/router.mjs` answers `initialize` with
`protocolVersion: '2024-11-05'` and NO `notifications/initialized` handler
(it catches `notifications/*` generically).

### Layer 4: Edge Workers (4) — Already Stateless Streamable HTTP
All skip `initialize` entirely (no handshake). They implement `tools/list`,
`tools/call`, and `ping` directly.

| Worker | File | Statelessness |
|--------|------|--------------|
| BROS | `workers/bros/src/index.ts` | ✅ No initialize handler |
| DADS | `workers/dads/src/index.ts` | ✅ No initialize handler |
| p31-crypto-mcp | `workers/p31-crypto-mcp/src/index.ts` | ✅ No initialize (minor session ID gap) |
| p31-justice-hub | `workers/p31-justice-hub/src/index.ts` | ✅ No initialize handler |

### Layer 5: 7 Portal HTML Pages — A2UI-Annotated
All portals use `data-a2ui-component` annotations and WebMCP tool registry
pattern. CSP worker (`_worker.js.bak`) does nonce injection.

### Layer 6: Catalog Scanner — A2UI v1.0
`scripts/scan-a2ui-catalog.mjs` scans production portals for `data-a2ui-component`
annotations and builds a catalog. Needs A2UI v1.0 RC upgrade.

---

## 2. Campaign Plan — 4 Phases, 13 Actions

### Dependency Graph
```
Phase 0        → Phase 1        → Phase 2        → Phase 3
[AUDIT]          [PROTOCOL]       [SECURITY]       [A2UI/WEBMCP]
                ↓
            bridge router
                ↓
        8 CLI MCP servers  →  Gateway CORS  →  CSP Workers
                ↓
            x402 bridge     →  Audit logger   →  Portal annotations
```

### Phase 0 — Audit & Baseline (Day 1-2)
| # | Action | Risk | Files |
|---|--------|------|-------|
| A0.1 | Audit all `initialize`/`notifications/initialized` handlers | None | 8 CLI servers |
| A0.2 | Verify gateway reject vs. silent-accept for `notifications/initialized` | None | `proxy.ts` |
| A0.3 | Map all protocolVersion strings across every MCP endpoint | None | All |

### Phase 1 — Protocol Alignment (Day 3-6)
| # | Action | Risk | Files |
|---|--------|------|-------|
| A1.1 | **Add `notifications/initialized` silent accept** to gateway | Low | `proxy.ts:302` |
| A1.2 | **Replace `2024-11-05` → `2026-07-28`** in bridge router | Med | `router.mjs:45` |
| A1.3 | **Replace `2024-11-05` → `2026-07-28`** in all 8 CLI servers | Med | All 8 |
| A1.4 | **Remove `notifications/initialized` handler** from all 8 CLI servers (stateless) | Med | All 8 |

### Phase 2 — Security Hardening (Day 7-10)
| # | Action | Risk | Files |
|---|--------|------|-------|
| A2.1 | Validate gateway CORS against all 7 custom domains | Low | `proxy.ts` |
| A2.2 | Audit DO alarm patterns in edge workers | Med | BROS, DADS |
| A2.3 | Migrate CSP worker from `_worker.js.bak` to proper Pages `_worker.js` | Low | `_worker.js.bak` |
| A2.4 | Verify zero-state hibernation in SignalingRoom DO | Low | BROS |

### Phase 3 — A2UI / WebMCP Alignment (Day 11-14)
| # | Action | Risk | Files |
|---|--------|------|-------|
| A3.1 | Upgrade A2UI catalog schema to v1.0 RC | Low | `scan-a2ui-catalog.mjs` |
| A3.2 | Verify WebMCP tool annotations in all 7 portal HTML files | Low | All portals |
| A3.3 | Port `_worker.js` CSP+COEP security directives to each portal's Pages config | Med | wrangler.toml per portal |
| A3.4 | Run full deployment end-to-end after all changes | Med | `deploy-portals.js` |

---

## 3. Source Code

Below is the complete source of every relevant file in the P31 MCP ecosystem.

---

### 3.1 `cli/mcp-server.js` — Oasis CLI MCP Server (364 lines)

```js
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_THEME = 'cyberpunk';
const DEFAULT_MODE = 'BUILD';

// ─── Session State ──────────────────────────────────────────────────────────
const SESSION_PATH = path.join(__dirname, '.oasis-session.json');

function defaultSession() {
  return { mode: DEFAULT_MODE, theme: DEFAULT_THEME, todos: [], sandboxCwd: process.cwd() };
}

function loadSession() {
  try { return JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8')); }
  catch { return defaultSession(); }
}

function saveSession(session) {
  fs.writeFileSync(SESSION_PATH, JSON.stringify(session, null, 2));
}

// ─── Design Tokens (inlined minimal set) ────────────────────────────────────
function loadDesign() {
  try {
    const pkg = require('./package.json');
    if (pkg.design) return pkg.design;
  } catch { /* fallback */ }
  return {};
}

// ─── Log ────────────────────────────────────────────────────────────────────
function appendLogEntry(entry) {
  const logPath = path.join(__dirname, '.oasis-log.json');
  let log = [];
  try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch { /* empty */ }
  log.push({ ...entry, ts: new Date().toISOString() });
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
}

// ─── Notifications ──────────────────────────────────────────────────────────
function notify(msg, type) {
  process.stderr.write(JSON.stringify({ type: 'notification', subtype: type || 'info', message: msg }) + '\n');
}

// ─── Sandbox ────────────────────────────────────────────────────────────────
function sandboxClear() {
  const session = loadSession();
  session.sandboxCwd = process.cwd();
  saveSession(session);
  return { status: 'ok', sandboxCwd: session.sandboxCwd };
}

function executeSafe(command, timeout) {
  const { execSync } = require('child_process');
  const session = loadSession();
  try {
    const out = execSync(command, { cwd: session.sandboxCwd, timeout: timeout || 30000, encoding: 'utf8' });
    return { stdout: out.trim(), stderr: '', exitCode: 0 };
  } catch (e) {
    return { stdout: e.stdout?.trim() || '', stderr: e.stderr?.trim() || e.message, exitCode: e.status || 1 };
  }
}

// ─── Tools ──────────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'oasis_status',
    description: 'Get session status: mode, theme, todos, sandbox, design tokens, and capabilities.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'oasis_save',
    description: 'Save current session state (mode, theme, todos).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'oasis_theme',
    description: 'Change session theme. Available: cyberpunk, nord, dracula, catppuccin, warm.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Theme name' } },
      required: ['name'],
    },
  },
  {
    name: 'oasis_mode',
    description: 'Change session mode. Available: BUILD, PLAN, REVIEW, DEBUG.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', enum: ['BUILD', 'PLAN', 'REVIEW', 'DEBUG'] } },
      required: ['name'],
    },
  },
  {
    name: 'oasis_clear',
    description: 'Reset sandbox working directory to repo root.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'oasis_export_log',
    description: 'Export full activity log.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'oasis_sandbox_clear',
    description: 'Alias for oasis_clear.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'oasis_notify',
    description: 'Queue a test notification message.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Notification text' },
        type: { type: 'string', enum: ['info', 'ok', 'warn', 'err'], description: 'Notification severity' },
      },
    },
  },
  {
    name: 'oasis_add_todo',
    description: 'Add a todo item to the session.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'Todo description' } },
      required: ['text'],
    },
  },
  {
    name: 'oasis_toggle_todo',
    description: 'Toggle a todo item\'s done state by index (0-based).',
    inputSchema: {
      type: 'object',
      properties: { index: { type: 'number', description: '0-based index of the todo to toggle' } },
      required: ['index'],
    },
  },
  {
    name: 'oasis_execute',
    description: 'Execute a shell command in the session sandbox directory.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command' },
        timeout: { type: 'number', description: 'Timeout in ms (default 30000)' },
      },
      required: ['command'],
    },
  },
];

function executeTool(name, args) {
  const session = loadSession();
  switch (name) {
    case 'oasis_status': {
      const design = loadDesign();
      return {
        version: require('./package.json').version,
        mode: session.mode, theme: session.theme,
        todos: session.todos.map(t => ({ text: t.text || t, done: t.done || false })),
        sandboxCwd: session.sandboxCwd,
        design: {
          colors: design.colors || {}, typography: design.typography || {},
          rounded: design.rounded || {}, spacing: design.spacing || {},
          components: design.components || {},
        },
        capabilities: {
          slashCommands: ['/exit','/clear','/sandbox clear','/export log','/save','/notify test','/help','/theme <name>','/mode <name>'],
          themes: ['cyberpunk','nord','dracula','catppuccin','warm'],
          modes: ['BUILD','PLAN','REVIEW','DEBUG'],
        },
        status: 'ok',
      };
    }
    case 'oasis_save': {
      saveSession(session);
      return { status: 'ok', saved: true };
    }
    case 'oasis_theme': {
      const available = ['cyberpunk','nord','dracula','catppuccin','warm'];
      if (!available.includes(args.name)) return { error: `Unknown theme: ${args.name}. Available: ${available.join(', ')}`, status: 'error' };
      session.theme = args.name; saveSession(session);
      return { status: 'ok', theme: args.name };
    }
    case 'oasis_mode': {
      const available = ['BUILD','PLAN','REVIEW','DEBUG'];
      if (!available.includes(args.name)) return { error: `Unknown mode: ${args.name}`, status: 'error' };
      session.mode = args.name; saveSession(session);
      return { status: 'ok', mode: args.name };
    }
    case 'oasis_clear': case 'oasis_sandbox_clear': return sandboxClear();
    case 'oasis_export_log': {
      const logPath = path.join(__dirname, '.oasis-log.json');
      try { return { log: JSON.parse(fs.readFileSync(logPath, 'utf8')), status: 'ok' }; }
      catch { return { log: [], status: 'ok' }; }
    }
    case 'oasis_notify': {
      notify(args.message, args.type);
      appendLogEntry({ action: 'notify', message: args.message, type: args.type });
      return { status: 'ok', notified: true };
    }
    case 'oasis_add_todo': {
      session.todos.push({ text: args.text, done: false }); saveSession(session);
      appendLogEntry({ action: 'add_todo', text: args.text });
      return { status: 'ok', todos: session.todos.length };
    }
    case 'oasis_toggle_todo': {
      if (args.index < 0 || args.index >= session.todos.length) return { error: `Invalid index ${args.index}`, status: 'error' };
      session.todos[args.index].done = !session.todos[args.index].done; saveSession(session);
      return { status: 'ok', index: args.index, done: session.todos[args.index].done };
    }
    case 'oasis_execute': return executeSafe(args.command, args.timeout);
    default: return { error: `Unknown tool: ${name}`, status: 'error' };
  }
}

// ─── JSON-RPC over stdio ──────────────────────────────────────────────
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { const req = JSON.parse(trimmed); handleRequest(req); }
    catch { /* ignore malformed */ }
  }
});

function handleRequest(req) {
  const { id, method, params } = req;
  switch (method) {
    case 'initialize':
      respond(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'p31-oasis-mcp', version: '1.0.0' } });
      break;
    case 'notifications/initialized': break;
    case 'tools/list': respond(id, { tools: TOOLS }); break;
    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const tool = TOOLS.find(t => t.name === toolName);
      if (!tool) { respondError(id, -32602, `Unknown tool: ${toolName}`); break; }
      try {
        const result = executeTool(toolName, toolArgs);
        const content = [{ type: 'text', text: JSON.stringify(result, null, 2) }];
        respond(id, { content });
      } catch (e) {
        respond(id, { content: [{ type: 'text', text: JSON.stringify({ error: e.message, status: 'error' }) }], isError: true });
      }
      break;
    }
    case 'ping': respond(id, {}); break;
    default:
      if (id !== undefined) respondError(id, -32601, `Method not found: ${method}`);
  }
}

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

process.stderr.write('[p31-oasis-mcp] Server started. Listening on stdin (JSON-RPC).\n');
```

---

### 3.2 `cli/component-registry.js` — Component Registry MCP Server (833 lines)

```js
#!/usr/bin/env node

const yaml = require('yaml');
const fs = require('fs');
const path = require('path');

const tokensYml = yaml.parse(fs.readFileSync(path.join(__dirname, 'tokens', 'tokens.yml'), 'utf8'));

function dt(path) {
  const parts = path.split('.');
  let node = tokensYml;
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return (node != null && typeof node === 'object' && node['$value'] != null) ? node['$value'] : node;
}

const designTokens = {
  colors: {
    'void': dt('primitive.color.void'),
    surface: dt('primitive.color.surface'),
    surface2: dt('primitive.color.surface2'),
    cloud: '#A1A1AA',
    accent: dt('primitive.color.accent'),
    'accent-alt': dt('primitive.color.accent-alt'),
    'accent-violet': '#A78BFA',
    'accent-gold': '#FBBF24',
    'accent-green': '#34D399',
    'accent-red': '#F87171',
    'accent-iris': '#818CF8',
  },
  // ... full design tokens from tokens.yml
};

const COMPONENTS = [
  {
    name: 'GlassPanel',
    description: 'Raised glass surface with backdrop blur, radius, and optional glow.',
    props: {
      color: { type: 'string', enum: ['cyan','violet','gold','green','red','iris'], default: 'cyan' },
      padding: { type: 'string', enum: ['sm','md','lg','xl','2xl'], default: 'lg' },
      glow: { type: 'boolean', default: false },
    },
    slots: ['default'],
  },
  // ... more components
];

function generateComponent(name, props) {
  const comp = COMPONENTS.find(c => c.name === name);
  if (!comp) return { error: `Unknown component: ${name}` };
  // ... generation logic
  return { html: '', css: '', status: 'ok' };
}

// ... 4 more tools: registry_search, registry_suggest, tokens_inspect, tokens_diff

// ─── JSON-RPC over stdio ──────────────────────────────────────────────
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { const req = JSON.parse(trimmed); handleRequest(req); }
    catch { /* ignore */ }
  }
});

function handleRequest(req) {
  const { id, method, params } = req;
  switch (method) {
    case 'initialize':
      respond(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'p31-component-registry', version: '1.0.0' } });
      break;
    case 'notifications/initialized': break;
    case 'tools/list': respond(id, { tools: TOOLS }); break;
    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const tool = TOOLS.find(t => t.name === toolName);
      if (!tool) { respondError(id, -32602, `Unknown tool: ${toolName}`); break; }
      try {
        const result = executeTool(toolName, toolArgs);
        respond(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (e) {
        respond(id, { content: [{ type: 'text', text: JSON.stringify({ error: e.message, status: 'error' }) }], isError: true });
      }
      break;
    }
    case 'ping': respond(id, {}); break;
    default:
      if (id !== undefined) respondError(id, -32601, `Method not found: ${method}`);
  }
}

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

process.stderr.write('[p31-component-registry] Server started. Listening on stdin (JSON-RPC).\n');
```

---

### 3.3 `cli/love-registry.js` — LOVE Ledger MCP Server (164 lines)

```js
#!/usr/bin/env node

const TOOLS = [
  {
    name: 'love_status',
    description: 'Get ledger status (total LOVE, care_score, pools, vesting).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'love_balance',
    description: 'Get LOVE balance for a user.',
    inputSchema: {
      type: 'object', properties: {
        userId: { type: 'string', description: 'The user ID (DID or address)' },
      }, required: ['userId'],
    },
  },
  {
    name: 'love_sync',
    description: 'Sync local LOVE state with the cloud ledger.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'love_anchor',
    description: 'Anchor LOVE chain root to IPFS via BOND protocol.',
    inputSchema: { type: 'object', properties: {} },
  },
];

const BRIDGE_URL = process.env.LOVE_LEDGER_URL || 'https://love-ledger.p31ca.org';

async function executeTool(name, args) {
  // ... tool execution logic
}

// ─── JSON-RPC over stdio ──────────────────────────────────────────────
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { const req = JSON.parse(trimmed); handleRequest(req); }
    catch { /* ignore */ }
  }
});

function handleRequest(req) {
  const { id, method, params } = req;
  switch (method) {
    case 'initialize':
      respond(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'p31-love-registry', version: '1.0.0' } });
      break;
    case 'notifications/initialized': break;
    case 'tools/list': respond(id, { tools: TOOLS }); break;
    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const tool = TOOLS.find(t => t.name === toolName);
      if (!tool) { respondError(id, -32602, `Unknown tool: ${toolName}`); break; }
      try {
        const result = executeTool(toolName, toolArgs);
        respond(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (e) {
        respond(id, { content: [{ type: 'text', text: JSON.stringify({ error: e.message, status: 'error' }) }], isError: true });
      }
      break;
    }
    case 'ping': respond(id, {}); break;
    default:
      if (id !== undefined) respondError(id, -32601, `Method not found: ${method}`);
  }
}

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}
```

---

### 3.4 `cli/cognitive-prosthetic.js` — Cognitive Prosthetic MCP Server (872 lines, initialize section only)

**File**: `cli/cognitive-prosthetic.js` lines 810-872 (handleRequest and below):

```js
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { handleRequest(JSON.parse(trimmed)); }
    catch { /* ignore non-JSON lines */ }
  }
});

function handleRequest(req) {
  const { id, method, params } = req;
  switch (method) {
    case 'initialize':
      respond(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'p31-cognitive-prosthetic', version: '1.0.0' } });
      break;
    case 'notifications/initialized': break;
    case 'tools/list': respond(id, { tools: TOOLS }); break;
    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const tool = TOOLS.find(t => t.name === toolName);
      if (!tool) { respondError(id, -32602, `Unknown tool: ${toolName}`); break; }
      try {
        const out = executeTool(toolName, toolArgs);
        respond(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] });
      } catch (e) {
        respond(id, { content: [{ type: 'text', text: JSON.stringify({ error: e.message, status: 'error' }) }], isError: true });
      }
      break;
    }
    case 'ping': respond(id, {}); break;
    default:
      if (id !== undefined) respondError(id, -32601, `Method not found: ${method}`);
  }
}

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}
```

---

### 3.5 `cli/cognitive-comms.js` — Cognitive Comms MCP Server (299 lines, initialize section only)

**File**: `cli/cognitive-comms.js` lines 233-299 (handleRequest and below):

```js
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { handleRequest(JSON.parse(trimmed)); }
    catch { /* ignore non-JSON lines */ }
  }
});

function handleRequest(req) {
  const { id, method, params } = req;
  switch (method) {
    case 'initialize':
      respond(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'p31-cognitive-comms', version: '1.0.0' } });
      break;
    case 'notifications/initialized': break;
    case 'tools/list': respond(id, { tools: TOOLS }); break;
    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const tool = TOOLS.find(t => t.name === toolName);
      if (!tool) { respondError(id, -32602, `Unknown tool: ${toolName}`); break; }
      try {
        const out = executeTool(toolName, toolArgs);
        respond(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] });
      } catch (e) {
        respond(id, { content: [{ type: 'text', text: JSON.stringify({ error: e.message, status: 'error' }) }], isError: true });
      }
      break;
    }
    case 'ping': respond(id, {}); break;
    default:
      if (id !== undefined) respondError(id, -32601, `Method not found: ${method}`);
  }
}

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}
```

---

### 3.6 `cli/marge-server.js` — MARGE Design Expert MCP Server (1083 lines, initialize section only)

**File**: `cli/marge-server.js` lines 1015-1083 (handleRequest and below):

```js
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { handleRequest(JSON.parse(trimmed)); }
    catch { /* ignore malformed */ }
  }
});

function handleRequest(req) {
  const { id, method, params } = req;
  switch (method) {
    case 'initialize':
      respond(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'p31-marge', version: '2.0.0', upgraded: true } });
      break;
    case 'notifications/initialized': break;
    case 'tools/list': respond(id, { tools: TOOLS }); break;
    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const tool = TOOLS.find(t => t.name === toolName);
      if (!tool) { respondError(id, -32602, `Unknown tool: ${toolName}`); break; }
      try {
        const out = executeTool(toolName, toolArgs);
        respond(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] });
      } catch (e) {
        respond(id, { content: [{ type: 'text', text: JSON.stringify({ error: e.message, status: 'error' }) }], isError: true });
      }
      break;
    }
    case 'ping': respond(id, {}); break;
    default:
      if (id !== undefined) respondError(id, -32601, `Method not found: ${method}`);
  }
}

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}
```

---

### 3.7 `cli/bob-server.js` — BOB Structural Expert MCP Server (1180 lines, initialize section only)

**File**: `cli/bob-server.js` lines 1114-1180 (handleRequest and below):

```js
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { handleRequest(JSON.parse(trimmed)); }
    catch { /* ignore */ }
  }
});

function handleRequest(req) {
  const { id, method, params } = req;
  switch (method) {
    case 'initialize':
      respond(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'p31-bob', version: '2.0.0', upgraded: true } });
      break;
    case 'notifications/initialized': break;
    case 'tools/list': respond(id, { tools: TOOLS }); break;
    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const tool = TOOLS.find(t => t.name === toolName);
      if (!tool) { respondError(id, -32602, `Unknown tool: ${toolName}`); break; }
      try {
        const out = executeTool(toolName, toolArgs);
        respond(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] });
      } catch (e) {
        respond(id, { content: [{ type: 'text', text: JSON.stringify({ error: e.message, status: 'error' }) }], isError: true });
      }
      break;
    }
    case 'ping': respond(id, {}); break;
    default:
      if (id !== undefined) respondError(id, -32601, `Method not found: ${method}`);
  }
}

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}
function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}
```

---

### 3.8 `tools/phos-forge/mcp-server.mjs` — PHOS Forge MCP Server (798 lines, initialize section only)

**File**: `tools/phos-forge/mcp-server.mjs` lines 737-777 (handleRequest):

```js
async handleRequest(request) {
  if (request.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'phos-forge-mcp', version: '2.0.0' },
      },
    };
  }

  if (request.method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: Object.entries(this.tools).map(([name, def]) => ({ name, ...def })),
      },
    };
  }

  if (request.method === 'tools/call') {
    const { name, arguments: args } = request.params;
    try {
      const result = await this.callTool(name, args);
      return { jsonrpc: '2.0', id: request.id, result };
    } catch (err) {
      return { jsonrpc: '2.0', id: request.id, result: { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true } };
    }
  }

  return { jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Method not found' } };
}
```

---

### 3.9 `apps/gateway/src/mcp/proxy.ts` — Gateway MCP Dispatcher (303 lines)

```typescript
import { TOOLS, type ToolName } from './catalog.js';
import { filterTools, isToolAllowed } from './policy.js';
import { getSessionId, getState, setState } from '../state.js';

export type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: number | string | null;
  method: string;
  params?: any;
};

export type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: any;
  error?: { code: number; message: string };
};

function errorResponse(id: number | string | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function okResponse(id: number | string | null, result: any): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

function base64UrlDecode(str: string): string {
  const withPlus = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = withPlus.length % 4;
  const padded = pad ? withPlus + '='.repeat(4 - pad) : withPlus;
  const bin = atob(padded);
  return new TextDecoder().decode(new Uint8Array(bin.length).fill(0).map((_, i) => bin.charCodeAt(i)));
}

export function extractDidFromToken(authHeader: string | undefined): { did: string; valid: boolean } {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { did: '', valid: false };
  const token = authHeader.slice(7);
  const parts = token.split('.');
  if (parts.length !== 3) return { did: '', valid: false };
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const sub = payload.sub || payload.iss || '';
    return { did: sub.startsWith('did:') ? sub : sub, valid: true };
  } catch { return { did: '', valid: false }; }
}

async function resolveSessionDid(env: any, sid: string): Promise<string> {
  const raw = await env.SESSION_STORE.get(`state:${sid}`);
  if (!raw) return '';
  try {
    const state = JSON.parse(raw) as { did?: string };
    return state.did || '';
  } catch { return ''; }
}

async function callTool(name: string, args: any, c: any): Promise<any> {
  const env = c.env;
  const sid = getSessionId(c);
  const authHeader = c.req.header('Authorization');
  const tokenInfo = extractDidFromToken(authHeader);

  let sessionDid = await resolveSessionDid(env, sid);

  if (tokenInfo.valid && tokenInfo.did) {
    if (!sessionDid) {
      await setState(env, sid, { did: tokenInfo.did });
      sessionDid = tokenInfo.did;
    } else if (sessionDid !== tokenInfo.did) {
      throw new Error('Token DID mismatch with session identity');
    }
  }

  const identityHeaders: Record<string, string> = {};
  if (authHeader) identityHeaders['Authorization'] = authHeader;
  if (sessionDid) identityHeaders['X-User-DID'] = sessionDid;

  switch (name as ToolName) {
    case 'getLoveBalance': {
      const st = await getState(env, sid);
      return { loveBalance: st.loveBalance };
    }
    case 'setSpoonLevel': {
      const level = Math.max(0, Math.min(5, Number(args.level) ?? 3));
      const st = await setState(env, sid, { spoonLevel: level });
      return { spoonLevel: st.spoonLevel };
    }
    case 'getState': {
      const st = await getState(env, sid);
      return { sessionId: st.sessionId, spoonLevel: st.spoonLevel, trustTier: st.trustTier, loveBalance: st.loveBalance, did: st.did, updatedAt: st.updatedAt };
    }
    case 'getTrustTier': {
      const st = await getState(env, sid);
      return { trustTier: st.trustTier };
    }
    case 'aiProxy': {
      const { prompt, model = 'default', maxTokens = 512 } = args || {};
      if (!prompt || typeof prompt !== 'string') throw new Error('prompt is required');
      const target = new URL(c.req.url);
      target.pathname = '/v1/chat/completions';
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...identityHeaders };
      const res = await c.env.phos_ai_proxy.fetch(target, {
        method: 'POST', headers,
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
      });
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: any };
      const text = data?.choices?.[0]?.message?.content || '';
      return { text, model, usage: data?.usage ?? null };
    }
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

async function auditLog(env: any, entry: {
  requestId: string; sessionId: string; did: string; toolName: string;
  args: any; result: any; error: string | null; trustTier: string;
  allowed: boolean; upstreamStatus: number;
}) {
  try {
    await env.p31_audit.prepare(
      `INSERT INTO audit_logs (id, request_id, session_id, did, tool_name, arguments, result, error, trust_tier, allowed, timestamp, upstream_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(), entry.requestId, entry.sessionId, entry.did || null,
      entry.toolName, JSON.stringify(entry.args),
      entry.result ? JSON.stringify(entry.result) : null, entry.error,
      entry.trustTier || null, entry.allowed ? 1 : 0, Date.now(), entry.upstreamStatus
    ).run();
  } catch { /* fire-and-forget */ }
}

export async function handleMcp(c: any): Promise<Response> {
  const origin = c.req.header('Origin') || '';
  const sessionId = getSessionId(c);

  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID',
        ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' } : {}),
      },
    });
  }

  if (c.req.method !== 'POST') {
    return new Response(JSON.stringify(errorResponse(null, -32601, 'Method not allowed')), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) },
    });
  }

  let req: JsonRpcRequest;
  try { req = await c.req.json(); }
  catch {
    return new Response(JSON.stringify(errorResponse(null, -32700, 'Parse error')), {
      status: 400, headers: { 'Content-Type': 'application/json', ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) },
    });
  }

  const id = req.id ?? null;
  const method = req.method;
  const params = req.params ?? {};

  if (method === 'initialize') {
    return new Response(JSON.stringify(okResponse(id, {
      protocolVersion: '2026-07-28',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'p31-gateway-mcp', version: '1.0.0' },
    })), { headers: { 'Content-Type': 'application/json', ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) } });
  }

  if (method === 'tools/list') {
    let trustTier: string | undefined;
    if (sessionId) {
      const raw = await c.env.SESSION_STORE.get(`state:${sessionId}`);
      if (raw) {
        const state = JSON.parse(raw) as { trustTier?: string };
        trustTier = state.trustTier;
      }
    }
    const filteredTools = filterTools(TOOLS, trustTier);
    return new Response(JSON.stringify(okResponse(id, { tools: filteredTools })), {
      headers: { 'Content-Type': 'application/json', ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) },
    });
  }

  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments ?? {};
    const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();

    if (!name || !TOOLS.find(t => t.name === name)) {
      await auditLog(c.env, {
        requestId, sessionId, did: '', toolName: name || 'unknown', args,
        result: null, error: 'Tool not found', trustTier: '', allowed: false, upstreamStatus: 0,
      });
      return new Response(JSON.stringify(errorResponse(id, -32601, `Tool not found: ${name}`)), {
        headers: { 'Content-Type': 'application/json', ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) },
      });
    }

    let trustTier: string | undefined;
    let sessionDid = '';
    if (sessionId) {
      const raw = await c.env.SESSION_STORE.get(`state:${sessionId}`);
      if (raw) {
        const state = JSON.parse(raw) as { trustTier?: string; did?: string };
        trustTier = state.trustTier;
        sessionDid = state.did || '';
      }
    }
    const allowed = isToolAllowed(name, trustTier);
    if (!allowed) {
      await auditLog(c.env, {
        requestId, sessionId, did: sessionDid, toolName: name, args,
        result: null, error: `Tool "${name}" is not allowed for trust tier ${trustTier || 'none'}`,
        trustTier: trustTier || '', allowed: false, upstreamStatus: 0,
      });
      return new Response(JSON.stringify(errorResponse(id, -403, `Tool "${name}" is not allowed for trust tier ${trustTier || 'none'}`)), {
        status: 403, headers: { 'Content-Type': 'application/json', ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) },
      });
    }

    try {
      const result = await callTool(name, args, c);
      let postTrustTier = trustTier;
      let postDid = sessionDid;
      if (sessionId) {
        const raw = await c.env.SESSION_STORE.get(`state:${sessionId}`);
        if (raw) {
          const state = JSON.parse(raw) as { trustTier?: string; did?: string };
          postTrustTier = state.trustTier || trustTier;
          postDid = state.did || sessionDid;
        }
      }
      await auditLog(c.env, {
        requestId, sessionId, did: postDid, toolName: name, args, result,
        error: null, trustTier: postTrustTier || '', allowed: true, upstreamStatus: 200,
      });
      return new Response(JSON.stringify(okResponse(id, { content: [{ type: 'text', text: JSON.stringify(result) }] })), {
        headers: { 'Content-Type': 'application/json', ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) },
      });
    } catch (e: any) {
      await auditLog(c.env, {
        requestId, sessionId, did: sessionDid, toolName: name, args,
        result: null, error: e.message || 'Tool error',
        trustTier: trustTier || '', allowed: true, upstreamStatus: 0,
      });
      return new Response(JSON.stringify(errorResponse(id, -32603, e.message || 'Tool error')), {
        headers: { 'Content-Type': 'application/json', ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) },
      });
    }
  }

  // ⚠️ FALLTHROUGH: notifications/initialized hits this → -32601
  return new Response(JSON.stringify(errorResponse(id, -32601, `Method not found: ${method}`)), {
    headers: { 'Content-Type': 'application/json', ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) },
  });
}
```

---

### 3.10 x402 Bridge Router (`workers/mcp-x402-gateway/bridge/src/router.mjs`) — 79 lines

```js
import { StdioBackend } from './stdio-client.mjs';

export class BridgeRouter {
  constructor(backendConfigs) {
    this.backends = backendConfigs.map((c) => new StdioBackend(c));
    this.routeTable = new Map();
    this.catalog = [];
    this.ready = false;
  }

  async start() {
    await Promise.all(
      this.backends.map((b) =>
        b.probe().catch(() => { b.healthy = false; }),
      ),
    );
    for (const b of this.backends.filter((x) => x.healthy)) {
      for (const t of b.tools || []) {
        if (t && t.name) this.routeTable.set(t.name, b.id);
      }
    }
    this.catalog = this.backends.filter((b) => b.healthy).flatMap((b) => b.tools || []);
    this.ready = true;
  }

  stop() { for (const b of this.backends) b.stop(); }

  async handle(msg) {
    const method = msg && msg.method;
    if (!method) return { jsonrpc: '2.0', id: msg?.id ?? null, error: { code: -32600, message: 'no method' } };

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'p31-mcp-x402-bridge', version: '0.1.0' },
        },
      };
    }

    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id: msg.id, result: { tools: this.catalog } };
    }

    if (method === 'tools/call') {
      const name = msg.params?.name;
      const backendId = this.routeTable.get(name);
      if (!backendId) return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `unknown tool: ${name}` } };
      const backend = this.backends.find((b) => b.id === backendId);
      if (!backend || !backend.healthy) return { jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: `backend ${backendId} unavailable` } };
      const r = await backend.request({ jsonrpc: '2.0', id: msg.id, method: 'tools/call', params: msg.params });
      return { jsonrpc: '2.0', id: msg.id, result: r.result };
    }

    if (method.startsWith('notifications/')) {
      for (const b of this.backends.filter((x) => x.healthy)) {
        if (b.mode === 'stream' && b.child) b.child.stdin.write(JSON.stringify(msg) + '\n');
      }
      return null;
    }

    return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `unsupported method: ${method}` } };
  }
}
```

---

### 3.11 x402 Bridge Stdio Client (`workers/mcp-x402-gateway/bridge/src/stdio-client.mjs`) — 152 lines

```js
import { spawn } from 'node:child_process';
import { REPO_ROOT } from './backends.mjs';

let _id = 1;
const genId = () => `br${_id++}`;

export class StdioBackend {
  constructor(config) {
    this.id = config.id;
    this.cmd = config.cmd;
    this.args = config.args;
    this.mode = config.mode || 'stream';
    this.optional = !!config.optional;
    this.cwd = REPO_ROOT;
    this.child = null;
    this.buffer = '';
    this.pending = new Map();
    this.healthy = false;
    this.initialized = false;
    this.tools = [];
    this.stopped = false;
    this.restarts = 0;
    this.maxRestarts = 5;
    this.timeoutMs = 8000;
  }

  start() {
    if (this.stopped) return;
    const child = spawn(this.cmd, this.args, {
      cwd: this.cwd, stdio: ['pipe', 'pipe', 'ignore'],
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    });
    this.child = child;
    child.stdin.setDefaultEncoding('utf8');
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => this._onData(chunk));
    child.on('exit', (code) => this._onExit(code));
  }

  _onData(chunk) {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    for (const line of lines) {
      const s = line.trim();
      if (!s) continue;
      let msg;
      try { msg = JSON.parse(s); } catch { continue; }
      if (msg.id != null && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        clearTimeout(p.timer);
        this.pending.delete(msg.id);
        p.resolve(msg);
      }
    }
  }

  _onExit() {
    this.healthy = false;
    this.child = null;
    if (this.stopped) return;
    if (this.restarts >= this.maxRestarts) return;
    const delay = Math.min(1000 * 2 ** this.restarts, 8000);
    this.restarts++;
    setTimeout(() => this.start(), delay);
  }

  stop() {
    this.stopped = true;
    if (this.child) this.child.kill('SIGTERM');
  }

  _initialize() {
    if (this.initialized) return Promise.resolve();
    this.initialized = true;
    return this.request({ jsonrpc: '2.0', id: genId(), method: 'initialize', params: {} }, 6000)
      .then(() => undefined).catch(() => { this.initialized = false; });
  }

  async probe() {
    if (this.mode === 'batch') {
      const r = await this._batchRequest({ jsonrpc: '2.0', id: genId(), method: 'tools/list', params: {} });
      this.tools = r.result?.tools || [];
      this.healthy = Array.isArray(this.tools);
      return;
    }
    this.start();
    await this._initialize();
    const r = await this.request({ jsonrpc: '2.0', id: genId(), method: 'tools/list', params: {} }, 8000);
    this.tools = r.result?.tools || [];
    this.healthy = Array.isArray(this.tools);
  }

  request(msg, timeoutMs = this.timeoutMs) {
    if (this.mode === 'batch') return this._batchRequest(msg, timeoutMs);
    if (!this.child) return Promise.reject(new Error(`backend ${this.id} not running`));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(msg.id);
        reject(new Error(`timeout on ${this.id} for ${msg.method}`));
      }, timeoutMs);
      this.pending.set(msg.id, { resolve, reject, timer });
      this.child.stdin.write(JSON.stringify(msg) + '\n');
    });
  }

  _batchRequest(msg, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const child = spawn(this.cmd, this.args, {
        cwd: this.cwd, stdio: ['pipe', 'pipe', 'ignore'],
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
      });
      let buf = '';
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`batch timeout on ${this.id}`));
      }, timeoutMs);
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (c) => (buf += c));
      child.on('close', () => {
        clearTimeout(timer);
        const lines = buf.split('\n').map((l) => l.trim()).filter(Boolean);
        const last = lines[lines.length - 1];
        if (!last) return reject(new Error(`no response from ${this.id}`));
        try { resolve(JSON.parse(last)); }
        catch (e) { reject(e); }
      });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: genId(), method: 'initialize', params: {} }) + '\n');
      child.stdin.write(JSON.stringify(msg) + '\n');
      child.stdin.end();
    });
  }
}
```

---

### 3.12 Edge Worker — BROS (stateless Streamable HTTP, 349 lines)

**File**: `workers/bros/src/index.ts`

Key characteristics:
- No `initialize`/`initialized` handler
- Implements `tools/list`, `tools/call`, `ping` directly
- Single DO: `SignalingRoom` (zero-state hibernation)
- Streamable HTTP transport: `POST /mcp` (JSON-RPC) + `GET /mcp` (SSE)

---

### 3.13 Edge Worker — DADS (stateless Streamable HTTP, 398 lines)

**File**: `workers/dads/src/index.ts`

Key characteristics:
- No `initialize`/`initialized` handler
- Single DO: `TaskDispatchDO` with embedded SQLite
- Streamable HTTP transport

---

### 3.14 Edge Worker — p31-justice-hub (stateless Streamable HTTP, 564 lines)

**File**: `workers/p31-justice-hub/src/index.ts`

Key characteristics:
- No `initialize`/`initialized` handler
- DOs: `EvidenceVaultDO` (SHA-256 chain-of-custody), `EscrowEngineDO` (2-of-3 multi-sig)
- D1: `JUSTICE_D1` + `LOVE_D1` + `EVIDENCE_R2` + `JUSTICE_KV`

---

### 3.15 Edge Worker — p31-crypto-mcp (stateless Streamable HTTP, 524 lines)

**File**: `workers/p31-crypto-mcp/src/index.ts`

Key characteristics:
- No `initialize`/`initialized` handler
- Delegates to: ledger-bridge, federation-bridge, taler-bridge-billing, x402-gateway
- Minor statelessness gap: session ID tracked but no enforced handshake

---

### 3.16 Portal HTML Sample — `willow-portal.html` (annotated)

**File**: `/home/p31/production/portals/children/willow-portal.html` (1817 lines)

```html
<!DOCTYPE html>
<html lang="en" data-brand="willow" data-spoons="3" data-mode="play" data-theme="willow"
      data-dark-mode="false" data-a2ui-component="Portal">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
  <meta name="theme-color" content="#f5efe6">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Willow Portal — Child & Teen Companion</title>
  <meta name="description" content="A sovereign companion portal for children and teens.">
  <link rel="preconnect" href="https://gateway.p31ca.org">
  <link rel="dns-prefetch" href="https://gateway.p31ca.org">
  <link rel="manifest" href="/manifest.json">
  <link rel="stylesheet" href="/assets/components.css">
  <style>
    /* 124 P31 CSS variables omitted for brevity — see production file */
  </style>
  <!-- ... full portal content with data-a2ui-component annotations throughout ... -->
</head>
```

Key annotation patterns in the portal:
- `<html data-brand="willow" data-spoons="3" data-a2ui-component="Portal">`
- `<nav data-a2ui-component="Navigation" data-a2ui-props='{"type":"top","items":["home","care","play","learn"]}'>`
- `<div class="glass-panel" data-a2ui-component="GlassPanel" data-a2ui-props='{"color":"violet"}'>`
- `<div id="love-meter" data-a2ui-component="SpoonMeter" data-a2ui-actions='["watch","set"]'>`
- WebMCP registry: `navigator.modelContext?.registerTool(...)` for `setSpoonLevel`, `setStatus`, etc.

---

### 3.17 CSP Worker (`_worker.js.bak`) — 55 lines

```js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const nonce = crypto.randomUUID().replace(/-/g, '');

    const cspHeader = [
      `default-src 'none'`,
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'nonce-${nonce}'`,
      `img-src 'self' data:`,
      `font-src 'self' data:`,
      `connect-src 'self' https://render.p31ca.org`,
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `upgrade-insecure-requests`,
      `block-all-mixed-content`,
    ].join('; ');

    const securityHeaders = {
      'Content-Security-Policy': cspHeader,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    };

    const cacheKey = new Request(url.toString(), request);
    let response = await caches.default.match(cacheKey);

    if (!response) {
      response = await fetch(request);
      if (response.ok && response.headers.get('Content-Type')?.includes('text/html')) {
        const clone = new Response(response.body, response);
        ctx.waitUntil(caches.default.put(cacheKey, clone));
      }
    }

    const body = await response.text();
    const injected = body.replace(/\{\{NONCE\}\}/g, nonce);

    return new Response(injected, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        ...securityHeaders,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  },
};
```

---

### 3.18 Deploy Orchestrator (`deploy-portals.js`) — 159 lines

```js
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = '/home/p31/production/portals';
const STAGING_BASE = '/tmp/p31-portal-deploy';
const ASSETS_SRC = path.join(PROJECT_ROOT, 'assets');

const PORTALS = [
  { subdir: 'children',               domain: 'willow.p31ca.org',      project: 'p31-portal-children' },
  { subdir: 'parent',                 domain: 'tetra.p31ca.org',       project: 'p31-portal-parent' },
  { subdir: 'teen',                   domain: 'sixseven.p31ca.org',    project: 'p31-portal-teen' },
  { subdir: 'meatspace',              domain: 'meatspace.p31ca.org',   project: 'p31-portal-meatspace' },
  { subdir: 'developer/p31ca',        domain: 'p31ca.org',             project: 'p31-portal-developer' },
  { subdir: 'institutional/phosphorus31', domain: 'phosphorus31.org',  project: 'p31-portal-institutional' },
  { subdir: 'design/deploy',          domain: 'design.p31ca.org',      project: 'p31-portal-design' },
];

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

function stagePortal({ subdir, domain, project }) {
  const srcDir = path.join(PROJECT_ROOT, subdir);
  const stagingDir = path.join(STAGING_BASE, subdir);
  const entryHtml = {
    'children': 'willow-portal.html',
    'parent': 'tetra-ops.html',
    'teen': 'p31-portal.html',
    'meatspace': 'meatspace-bonding-mvp.html',
  };

  log(`Staging ${project} (${domain})`);

  if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true });
  fs.mkdirSync(stagingDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'wrangler.toml' || entry.name === 'wrangler.toml.bak') continue;
    const src = path.join(srcDir, entry.name);
    const dest = path.join(stagingDir, entry.name);
    if (entry.isDirectory()) fs.cpSync(src, dest, { recursive: true, filter: (f) => !f.includes('node_modules') });
    else fs.copyFileSync(src, dest);
  }

  const assetsDir = path.join(stagingDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  for (const file of ['p31-ui.umd.js', 'p31-ui.umd.css', 'state-sync.js', 'components.css']) {
    fs.copyFileSync(path.join(ASSETS_SRC, file), path.join(assetsDir, file));
  }
  if (fs.existsSync(path.join(stagingDir, 'manifest.json'))) {
    for (const icon of ['icon-192.png', 'icon-512.png']) {
      fs.copyFileSync(path.join(ASSETS_SRC, icon), path.join(assetsDir, icon));
    }
  }

  const htmlFile = entryHtml[subdir] || 'index.html';
  const htmlPath = path.join(stagingDir, htmlFile);
  if (fs.existsSync(htmlPath)) {
    let content = fs.readFileSync(htmlPath, 'utf8');
    const ogUrlPattern = /<meta property="og:url"\s+content="[^"]*"\s*\/?>/;
    if (ogUrlPattern.test(content)) {
      content = content.replace(ogUrlPattern, `<meta property="og:url" content="https://${domain}">`);
    } else {
      content = content.replace('<head>', `<head>\n  <meta property="og:url" content="https://${domain}">`);
    }
    fs.writeFileSync(htmlPath, content);
  }

  if (entryHtml[subdir]) {
    const indexPath = path.join(stagingDir, 'index.html');
    if (!fs.existsSync(indexPath) && fs.existsSync(htmlPath)) fs.copyFileSync(htmlPath, indexPath);
  }

  fs.writeFileSync(path.join(stagingDir, 'wrangler.toml'), [
    `name = "${project}"`,
    `pages_build_output_dir = "."`,
    `compatibility_date = "2026-07-29"`,
    ``,
    `[observability]`,
    `enabled = true`,
    ``
  ].join('\n'));

  return stagingDir;
}

function createProject(project) {
  log(`Creating project ${project}...`);
  try {
    execSync(`npx wrangler pages project create "${project}" --production-branch main`, { stdio: 'pipe', cwd: PROJECT_ROOT });
  } catch (e) {
    log(`Project ${project} may already exist (continuing): ${e.stderr?.toString().trim().slice(0,80)}`);
  }
}

function deployPortal({ project, domain }, stagingDir) {
  log(`Deploying ${project} → https://${domain}`);
  try {
    execSync(`npx wrangler pages deploy "${stagingDir}" --project-name="${project}" --branch=main --commit-dirty=true`, { stdio: 'inherit', cwd: PROJECT_ROOT });
    log(`✅ ${project} deployed`);
    return true;
  } catch (e) {
    log(`❌ ${project} failed: ${e.message}`);
    return false;
  }
}

function main() {
  if (!process.env.CLOUDFLARE_API_TOKEN) { log('CLOUDFLARE_API_TOKEN not set'); process.exit(1); }
  if (fs.existsSync(STAGING_BASE)) fs.rmSync(STAGING_BASE, { recursive: true });

  log(`Creating ${PORTALS.length} Pages projects...`);
  for (const { project } of PORTALS) createProject(project);

  let ok = 0, fail = 0;
  for (const portal of PORTALS) {
    try {
      const stagingDir = stagePortal(portal);
      if (deployPortal(portal, stagingDir)) ok++; else fail++;
    } catch (e) { log(`Error staging ${portal.subdir}: ${e.message}`); fail++; }
  }

  log(`Done — ${ok} deployed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main();
```

---

### 3.19 A2UI Catalog Scanner (`scripts/scan-a2ui-catalog.mjs`) — 206 lines

```js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PRODUCTION_PORTALS = '/home/p31/production/portals';
const OUTPUT = path.join(ROOT, '.well-known/a2ui-catalog.json');
const CONSUMER_APPS = ['phos', 'p31ca', 'willow', 'bonding', 'phosphorus31'];
const PRODUCTION_PORTAL_DIRS = ['children', 'teen', 'parent', 'developer/p31ca', 'institutional/phosphorus31', 'meatspace', 'design'];

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

function extractComponentsFromHTML(html, filePath) {
  const components = [];
  const re = /<[^>]*\s+data-a2ui-component=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const tag = match[0];
    const name = match[1];
    const propsMatch = tag.match(/data-a2ui-props=["']([^"']*)["']/);
    let props = {};
    if (propsMatch) { try { props = JSON.parse(propsMatch[1]); } catch { /* ignore */ } }
    const actionsMatch = tag.match(/data-a2ui-actions=["']([^"']*)["']/);
    let actions = [];
    if (actionsMatch) { try { actions = JSON.parse(actionsMatch[1]); } catch { /* ignore */ } }
    if (!components.some(c => c.name === name)) {
      components.push({ name, description: `A2UI component from ${path.basename(filePath)}`, props: Object.keys(props).length ? props : undefined, actions: actions.length ? actions : undefined, source: filePath });
    }
  }
  return components;
}

function scanProductionPortals() {
  if (!fs.existsSync(PRODUCTION_PORTALS)) { console.warn(`⚠️  Production portals path not found: ${PRODUCTION_PORTALS}`); return []; }
  const htmlFiles = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(fullPath);
    }
  };
  walk(PRODUCTION_PORTALS);
  console.log(`🔍 Scanning ${htmlFiles.length} production HTML files...`);
  const allComponents = [];
  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const comps = extractComponentsFromHTML(content, file);
    for (const comp of comps) {
      if (!allComponents.find(c => c.name === comp.name)) allComponents.push(comp);
      else { const existing = allComponents.find(c => c.name === comp.name); if (comp.props && !existing.props) existing.props = comp.props; if (comp.actions && !existing.actions) existing.actions = comp.actions; }
    }
  }
  return allComponents;
}

function runFallback() {
  const FALLBACK_GENERATOR = path.join(ROOT, 'scripts', 'generate-a2ui-catalog.mjs');
  if (fs.existsSync(FALLBACK_GENERATOR)) execSync(`node ${FALLBACK_GENERATOR}`, { cwd: ROOT, stdio: 'inherit' });
  else { console.error('❌ Fallback catalog generator not found.'); process.exit(1); }
  const consumerApps = ['phos', 'p31ca', 'willow', 'bonding', 'phosphorus31'];
  for (const app of consumerApps) {
    const appCatalog = path.join(ROOT, 'apps', app, 'public', '.well-known', 'a2ui-catalog.json');
    if (fs.existsSync(appCatalog)) { fs.copyFileSync(appCatalog, OUTPUT); console.log(`  Copied ${app} catalog → root .well-known/a2ui-catalog.json`); break; }
  }
}

function mergeWithBase() {
  const BASE_CATALOG = path.join(ROOT, 'packages', 'interface-generator', 'src', 'adapters', 'a2ui.schema.json');
  if (!fs.existsSync(BASE_CATALOG) || !fs.existsSync(OUTPUT)) return;
  try {
    const base = JSON.parse(fs.readFileSync(BASE_CATALOG, 'utf8'));
    const scanned = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
    const merged = { ...base, components: [...base.components.filter(c => !scanned.components.some(s => s.name === c.name)), ...scanned.components], version: '1.0.0', id: 'p31ca.org:a2ui' };
    fs.writeFileSync(OUTPUT, JSON.stringify(merged, null, 2));
    console.log('✅ Merged with base catalog');
  } catch (err) { console.warn('⚠️  Could not merge with base catalog:', err.message); }
}

function copyToConsumerApps() {
  for (const app of CONSUMER_APPS) {
    const target = path.join(ROOT, 'apps', app, 'public', '.well-known', 'a2ui-catalog.json');
    const targetDir = path.dirname(target);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(OUTPUT, target);
    console.log(`  ✅ Copied to apps/${app}/public/.well-known/`);
  }
}

function copyToProductionPortals() {
  for (const subdir of PRODUCTION_PORTAL_DIRS) {
    const targetDir = path.join(PRODUCTION_PORTALS, subdir, '.well-known');
    const targetFile = path.join(targetDir, 'a2ui-catalog.json');
    ensureDir(targetDir);
    fs.copyFileSync(OUTPUT, targetFile);
    console.log(`  ✅ Copied to production/${subdir}/.well-known/a2ui-catalog.json`);
  }
}

function main() {
  console.log('🔍 A2UI Catalog Generation (Production-first)');
  console.log('═══════════════════════════════════════════════');
  ensureDir(path.dirname(OUTPUT));
  let components = scanProductionPortals();
  if (!components || components.length === 0) {
    console.log('⚠️  No production components found. Falling back to design-system generator.');
    runFallback();
  } else { console.log(`✅ Found ${components.length} component(s) from production portals.`); }
  const catalog = {
    $schema: 'https://a2ui.dev/schemas/catalog.json',
    version: '1.0.0',
    metadata: { name: 'P31 Production Catalog', description: 'Auto-generated from deployed HTML portals', source: 'production', generated: new Date().toISOString() },
    components: components.map(c => ({ name: c.name, description: c.description || '', props: c.props || {}, actions: c.actions || [] })),
  };
  fs.writeFileSync(OUTPUT, JSON.stringify(catalog, null, 2));
  console.log(`📄 Catalog written to ${OUTPUT}`);
  copyToConsumerApps();
  copyToProductionPortals();
  mergeWithBase();
  console.log(`\n🎉 Done. Component count: ${catalog.components.length}`);
}

main();
```

---

## 4. Unified Search/Replace Instructions for Phase 1

### A1.1 — Gateway: Add `notifications/initialized` handler

**File**: `apps/gateway/src/mcp/proxy.ts` — Insert after line 196 (the `initialize` block)

```
Add before the final return on line 302:
  if (method === 'notifications/initialized') {
    return new Response(JSON.stringify(okResponse(id, {})), {
      headers: { 'Content-Type': 'application/json', ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}) },
    });
  }
```

### A1.2 — x402 Bridge: Replace protocolVersion

**File**: `workers/mcp-x402-gateway/bridge/src/router.mjs` line 45

```
old: protocolVersion: '2024-11-05',
new: protocolVersion: '2026-07-28',
```

### A1.3 — All 8 CLI servers: Replace protocolVersion + remove initialized

Each of the 8 files needs the same two changes:

1. `protocolVersion: '2024-11-05'` → `protocolVersion: '2026-07-28'`
2. Remove the `case 'notifications/initialized': break;` line entirely

Or for the stateless approach, replace the entire `initialize` case:

```js
// New pattern (stateless):
case 'initialize':
  respond(id, { protocolVersion: '2026-07-28', capabilities: { tools: {} }, serverInfo: { name: 'p31-...', version: '...' } });
  break;
// REMOVE: case 'notifications/initialized': break;
```

---

## 5. Key Observations for AI Analysis

1. **Gateway rejects `notifications/initialized`** with `-32601` (line 302 fallthrough) — needs silent accept. Stateless clients send this notification every connection; rejection causes unnecessary error logging.

2. **All 8 CLI servers use `2024-11-05`** with explicit `initialize`/`notifications/initialized` handshake. The 2026-07-28 draft is stateless: servers should still respond to `initialize` (with the new protocolVersion) but should silently accept (or simply not care about) `notifications/initialized`.

3. **x402 bridge also uses `2024-11-05`** in its `initialize` response (router.mjs:45). The bridge's stdio-client (stdio-client.mjs:87) sends `initialize` to its backends — this is fine, the bridge translates between protocols.

4. **4 edge workers are already stateless** (no `initialize` handler). They already comply with 2026-07-28 expectations. Any client that sends `initialize` to them will get a `-32601 Method not found` error — which is the correct stateless behavior per the spec (servers MAY respond to initialize but MUST NOT require it).

5. **7 portal HTML files** have A2UI annotations using `data-a2ui-component` with `data-a2ui-props` and `data-a2ui-actions`. These should be aligned with the A2UI v1.0 RC schema.

6. **CSP worker** (`_worker.js.bak`) has `Cross-Origin-Embedder-Policy: require-corp` which caused 503 errors during production (recursive `fetch()` to Pages origin). The fix is to remove COEP or use a different CSP strategy.
