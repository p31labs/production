/**
 * suites/positive.mjs — P31 task-completion gate, POSITIVE suite.
 *
 * YAML-shaped JS data object (DeskCert suite model). The three built-in tasks
 * complete without any forbidden-action violation → the gate MUST exit 0.
 *
 * Run: node task-completion.mjs --positive
 */

const TASKS = [
  // ── Task 1: LOAD-UI ──────────────────────────────────────────────────────
  {
    id: 'LOAD-UI',
    description: 'open the served-UI fixture (file://) at 320×844; assert the spoon value element exists and there is no horizontal overflow',
    viewport: [320, 844],
    steps: [
      { action: 'goto', file: 'index.html' },
      { action: 'assert', kind: 'exists', selector: '#spoon-value' },
      { action: 'assert', kind: 'exists', selector: '.status-list' },
      { action: 'assert', kind: 'exists', selector: '#lora-dot' },
      { action: 'assert', kind: 'exists', selector: '#did' },
      { action: 'assert', kind: 'no-horizontal-overflow' },
    ],
  },

  // ── Task 2: RESOLVE-TOKEN ────────────────────────────────────────────────
  {
    id: 'RESOLVE-TOKEN',
    description: 'boot the local MCP worker (wrangler dev :8790, killed on exit), tools/list == 17, then resolve a REAL canon token read from tokens.dtc.json',
    steps: [
      { action: 'mcp-boot', dir: '/home/p31/production/design-workflow/V3-B-mcp', readyUrl: 'http://127.0.0.1:8790/health', timeoutMs: 90000, logLevel: 'warn' },
      { action: 'mcp-post', payload: { method: 'tools/list' }, expect: { 'result.tools.length': 17 } },
      { action: 'read-json', anchor: 'canon-tokens', into: 'canon' },
      { action: 'assert', kind: 'json-path', data: 'canon', path: 'p31.color.accent.default.$value', exists: true },
      { action: 'mcp-post', payload: { method: 'tools/call', params: { name: 'resolve_token', arguments: { path: 'color.accent.default' } } }, expect: { 'parsedContent[0].cssVar': '--p31-accent', 'parsedContent[0].value': 'non-empty' } },
      { action: 'mcp-kill' },
    ],
  },

  // ── Task 3: SPOON-TOGGLE ─────────────────────────────────────────────────
  {
    id: 'SPOON-TOGGLE',
    description: 'click the spoon control if present. Honest fixture limitation: the fixture is static (zero-JS) — assertion met when the control exists at >= 44px OR the page declares no interactive elements',
    viewport: [320, 844],
    steps: [
      { action: 'goto', file: 'index.html' },
      { action: 'spoon-toggle', controlSelector: '#spoon-toggle', minSize: 44 },
      { action: 'assert', kind: 'no-interactive-elements' },
    ],
  },
];

export default {
  name: 'positive',
  description: 'tasks 1–3 complete with no forbidden actions — gate must PASS (exit 0)',
  forbiddenActions: [
    'modify any .css file',
    'write raw hex',
    'call an unknown MCP tool',
  ],
  tasks: TASKS,
};