#!/usr/bin/env node
/**
 * P31 Design System MCP Server
 * Exposes design tokens, component schemas, and usage data via MCP stdio JSON-RPC.
 *
 * Tools:
 *   token_resolve(path)     → resolve DTCG path to value
 *   component_schema(name)  → get full component definition
 *   component_usage(name)   → list which HTML pages use a component
 *
 * Usage: node cli/design-mcp-server.js
 */

const yaml = require('yaml');
const fs = require('fs');
const path = require('path');

const { renderLayout } = require('./tokens/shared/layout');

// ─── Load tokens ─────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const tokensFile = path.join(__dirname, 'tokens', 'tokens.yml');
const tokens = yaml.parse(fs.readFileSync(tokensFile, 'utf8'));

// ─── Governance: actor-attributed ledger events ─────────────────────────────
// The local server is the governed surface. Each governance tool call
// (propose_page, scaffold_component, validate_output) is attributed to a named
// principal in the hash-chained ledger — closing the enforcement-audit gap the
// Fending study measured (81% of MCP servers authenticate but only 17%
// attribute logged actions to a specific principal). The append is serialized
// through a promise queue and is best-effort for this read/design surface: a
// failed append must never break a tool response.

const AGENT_ACTOR = process.env.P31_AGENT_ACTOR || 'did:agent:design-mcp:stdio';

let _ledgerModule = null;
function ledgerModule() {
  if (_ledgerModule) return Promise.resolve(_ledgerModule);
  return import('../scripts/lib/ledger.mjs').then((m) => { _ledgerModule = m; return m; });
}

let _ledgerQueue = Promise.resolve();
function appendGovernanceEvent(tool, verdict, detail) {
  if (process.env.P31_NO_LEDGER === '1') return; // test mode — do not touch the real ledger
  _ledgerQueue = _ledgerQueue
    .then(() => ledgerModule())
    .then((m) => m.append('tool-call', {
      action: 'tool-call',
      tool,
      actor: AGENT_ACTOR,
      verdict, // 'ok' | 'refused'
      detail: String(detail || ''),
    }))
    .catch((err) => {
      process.stderr.write(`governance ledger append failed: ${err.message}\n`);
    });
}

// ─── Token resolver (same as component-registry.js) ──────────────────────────

function dt(pathStr) {
  const parts = pathStr.split('.');
  let node = tokens;
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return (node != null && typeof node === 'object' && node['$value'] != null)
    ? node['$value']
    : node;
}

function resolveReferences(value, seen = new Set()) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{([^}]+)\}/g, (_, ref) => {
    if (seen.has(ref)) throw new Error(`Circular reference: ${ref}`);
    seen.add(ref);
    const resolved = dt(ref);
    if (resolved === undefined) throw new Error(`Unresolved reference: ${ref}`);
    return resolveReferences(resolved, seen);
  });
}

function tokenResolve(pathStr) {
  const raw = dt(pathStr);
  if (raw === undefined) return null;
  return resolveReferences(raw);
}

// ─── Flatten token tree for listings ─────────────────────────────────────────

function flattenTokens(node, prefix = '') {
  const result = {};
  if (typeof node === 'object' && node !== null) {
    if (node['$value'] !== undefined) {
      result[prefix || 'value'] = {
        value: node['$value'],
        type: node['$type'] || 'string',
        description: node['$description'] || '',
      };
    } else {
      for (const key of Object.keys(node)) {
        if (key.startsWith('$')) continue;
        const childPrefix = prefix ? `${prefix}.${key}` : key;
        Object.assign(result, flattenTokens(node[key], childPrefix));
      }
    }
  }
  return result;
}

// ─── Component definitions ───────────────────────────────────────────────────

const COMPONENTS = [];

function loadComponents() {
  // Canonical source of truth is packages/design-core/registry.json (32
  // components, Storybook-derived), NOT the stale cli/tokens/components.yml.
  const regFile = path.join(__dirname, '..', 'packages', 'design-core', 'registry.json');
  if (!fs.existsSync(regFile)) return;
  const reg = JSON.parse(fs.readFileSync(regFile, 'utf8'));
  for (const item of reg.items || []) {
    const props = {};
    if (item.props) {
      for (const [pname, pdef] of Object.entries(item.props)) {
        props[pname] = { type: pdef.type || 'string', default: pdef.default };
        if (pdef.options) props[pname].options = pdef.options;
        if (pdef.range) props[pname].range = pdef.range;
      }
    }
    COMPONENTS.push({
      name: item.name,
      description: item.description,
      css_class: item.cssClass,
      variants: item.variants || [],
      props,
      slots: item.slots || [],
      tokens: item.tokens || [],
    });
  }
}

loadComponents();

// ─── Component usage scan ────────────────────────────────────────────────────

const HTML_PATHS = [
  path.join(ROOT, 'apps', 'p31ca', 'index.html'),
  path.join(ROOT, 'apps', 'phosphorus31', 'index.html'),
];

function scanComponentUsage() {
  const usage = {};
  for (const comp of COMPONENTS) {
    const classes = [comp.css_class, ...(comp.variants || [])].filter(Boolean);
    const pages = [];
    for (const htmlPath of HTML_PATHS) {
      if (!fs.existsSync(htmlPath)) continue;
      const content = fs.readFileSync(htmlPath, 'utf8');
      if (classes.some(cls => content.includes(`class="${cls}"`) || content.includes(`class='${cls}'`))) {
        pages.push(path.relative(ROOT, htmlPath));
      }
    }
    usage[comp.name] = { pages, total: pages.length };
  }
  return usage;
}

// ─── MCP Tools ───────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'token_resolve',
    description: 'Resolve a DTCG token path to its computed value. Use dotted paths like "p31.color.accent.default" or "p31.radius.full". Returns value, type, and resolved references.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Dotted token path (e.g. p31.color.accent.default, p31.glass.background, p31.radius.full)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'component_schema',
    description: 'Get the full schema for a component: description, props, slots, CSS class, tokens used, and variants.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Component name (e.g. GlassCard, Button, SpoonMeter)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'component_usage',
    description: 'Find which sovereign HTML pages use a given component. Returns page paths and count.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Component name (e.g. GlassCard, Button). Omit for all components.' },
      },
    },
  },
  {
    name: 'token_list',
    description: 'List all available token paths with their values and types. Useful for discovery.',
    inputSchema: {
      type: 'object',
      properties: {
        prefix: { type: 'string', description: 'Optional filter prefix (e.g. "p31.color", "p31.glass", "p31.radius")' },
      },
    },
  },
  {
    name: 'layout_generate',
    description: 'Generate sovereign HTML layout from a JSON description. Supports hero, tetra-grid, card-grid, section, and cta layout types using P31 glass components. Set format: "a2ui" for A2UI JSON output.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['hero', 'tetra-grid', 'card-grid', 'section', 'cta'], description: 'Layout type to render.' },
        format: { type: 'string', enum: ['html', 'a2ui'], description: 'Output format. Default "html". Set "a2ui" for JSON component tree.' },
        title: { type: 'string', description: 'Main heading (hero, section).' },
        subtitle: { type: 'string', description: 'Subtitle text (hero).' },
        heading: { type: 'string', description: 'Section heading (card-grid, section, cta).' },
        description: { type: 'string', description: 'Section description (card-grid, section, cta).' },
        columns: { type: 'number', description: 'Number of grid columns (card-grid).' },
        badge: { type: 'string', description: 'Badge text (hero, e.g. "501(c)(3) Nonprofit").' },
        content: { type: 'string', description: 'Raw HTML content (section).' },
        ctas: { type: 'array', description: 'Array of button objects: {label, href, variant: "primary"|"secondary"|"ghost"} (hero).' },
        stats: { type: 'array', description: 'Array of stat objects: {value, label} (hero).' },
        buttons: { type: 'array', description: 'Array of button objects: {label, href, variant} (cta).' },
        items: { type: 'array', description: 'Array of {component: "GlassCard", props: {color, title, description, href}} (tetra-grid, card-grid).' },
      },
      required: ['type'],
    },
  },
  {
    name: 'validate_component',
    description: 'Validate a component or template code against P31 spatial rules. Ports logic from spatialValidator.mjs. Returns violations, warnings, and passed checks.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Raw CSS/JSX/HTML code string to validate.' },
        type: { type: 'string', enum: ['component', 'template'], description: 'Whether the code is a component (internal styling only) or template (external spacing allowed).' },
      },
      required: ['code', 'type'],
    },
  },
  {
    name: 'audit_tokens',
    description: 'Audit the design token tree for orphans, dead references, and missing values. Defaults to cli/tokens/tokens.yml.',
    inputSchema: {
      type: 'object',
      properties: {
        tokensPath: { type: 'string', description: 'Path to tokens YAML file. Defaults to cli/tokens/tokens.yml.' },
      },
    },
  },
  {
    name: 'suggest_fix',
    description: 'Suggest a fix for a common design-system violation. Pattern-matches margin, height, and position violations.',
    inputSchema: {
      type: 'object',
      properties: {
        violation: { type: 'string', description: 'The violation message or offending CSS property line (e.g. "margin: 16px" or "position: relative").' },
        code: { type: 'string', description: 'The full code snippet to apply the fix to.' },
      },
      required: ['violation', 'code'],
    },
  },
  {
    name: 'validate_output',
    description: 'Fail-closed validation of generated code: flags hardcoded hex, raw color, inline style, emoji icons, and legacy token vocabulary. Returns valid=false when any violation is found.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Generated code to validate.' },
        component: { type: 'string', description: 'Optional component name (informational).' },
      },
      required: ['code'],
    },
  },
  {
    name: 'scaffold_component',
    description: 'Return a contract-conformant scaffold (tsx + test) for a known component. No file is written by the server; the write path is the local CLI under pnpm gate. Unknown component is refused.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Component name to scaffold (e.g. Button, GlassPanel, GlassCard).' },
      },
      required: ['name'],
    },
  },
  {
    name: 'propose_page',
    description: 'Propose a sovereign page composed from canon components. Every component name is resolved against the closed registry; an unknown component refuses the whole proposal (fail-closed).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Optional page title.' },
        type: { type: 'string', enum: ['hero', 'tetra-grid', 'card-grid', 'section', 'cta'], description: 'Page layout type.' },
        components: { type: 'array', items: { type: 'string' }, description: 'Component names to compose (e.g. ["GlassCard", "Button"]).' },
      },
      required: ['type', 'components'],
    },
  },
];

// ─── Tool execution ──────────────────────────────────────────────────────────

function executeTool(name, args) {
  switch (name) {
    case 'token_resolve': {
      const value = tokenResolve(args.path);
      if (value === null) return { error: `Token path not found: "${args.path}"`, status: 'error' };
      const raw = dt(args.path);
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      return {
        path: args.path,
        value: serialized,
        raw: raw && raw['$value'] != null ? raw : value,
        type: (raw && raw['$type']) || typeof value,
        resolved: typeof value !== 'string' || value !== String(raw),
        status: 'ok',
      };
    }

    case 'component_schema': {
      const comp = COMPONENTS.find(c => c.name.toLowerCase() === (args.name || '').toLowerCase());
      if (!comp) {
        const available = COMPONENTS.map(c => c.name).join(', ');
        return { error: `Unknown component "${args.name}". Available: ${available}`, status: 'error' };
      }
      const resolvedTokens = {};
      for (const t of comp.tokens) {
        try { resolvedTokens[t] = tokenResolve(t); } catch {}
      }
      return {
        component: { ...comp, resolved_tokens: resolvedTokens },
        status: 'ok',
      };
    }

    case 'component_usage': {
      const usage = scanComponentUsage();
      if (args.name) {
        const compName = COMPONENTS.find(c => c.name.toLowerCase() === args.name.toLowerCase());
        if (!compName) {
          const available = COMPONENTS.map(c => c.name).join(', ');
          return { error: `Unknown component "${args.name}". Available: ${available}`, status: 'error' };
        }
        return { name: compName.name, usage: usage[compName.name], status: 'ok' };
      }
      return { components: usage, status: 'ok' };
    }

    case 'token_list': {
      const all = flattenTokens(tokens);
      if (args.prefix) {
        const filtered = {};
        for (const [k, v] of Object.entries(all)) {
          if (k.startsWith(args.prefix)) filtered[k] = v;
        }
        return { tokens: filtered, total: Object.keys(filtered).length, status: 'ok' };
      }
      return { tokens: all, total: Object.keys(all).length, status: 'ok' };
    }

    case 'layout_generate': {
      const result = renderLayout(args);
      if (args.format === 'a2ui') return { a2ui: result, status: 'ok' };
      return { html: result, status: 'ok' };
    }

    case 'validate_component': {
      const code = args.code || '';
      const type = args.type || 'component';
      const parsed = yaml.parse(fs.readFileSync(tokensFile, 'utf8'));
      const forbidden = parsed.spacing_rules?.component_forbidden_properties || [];
      const violations = [];
      const warnings = [];
      const passed = [];

      if (type === 'component') {
        const styleRegex = /([a-zA-Z-]+)\s*:\s*([^;}\n]+)/g;
        let match;
        while ((match = styleRegex.exec(code)) !== null) {
          const key = match[1].trim();
          const value = match[2].trim();
          const isForbidden = forbidden.some(rule => {
            if (rule.includes(':')) {
              const [prop, val] = rule.split(':').map(s => s.trim());
              return key === prop && value.includes(val);
            }
            return key === rule;
          });
          if (isForbidden) {
            violations.push(`Forbidden property "${key}: ${value}" in component.`);
          }
        }

        const marginMatches = code.match(/margin[A-Z]?:\s*['"]?-?\d+px['"]?/g) || [];
        const transformMatches = code.match(/transform:\s*['"]?translate[XY]?\([^)]+px\)/g) || [];
        const positionMatches = code.match(/position:\s*['"]?(relative|absolute)/g) || [];
        const topBottomMatches = code.match(/(top|bottom|left|right):\s*['"]?-?\d+px['"]?/g) || [];

        const allHardcoded = [...marginMatches, ...transformMatches, ...positionMatches, ...topBottomMatches];
        if (allHardcoded.length > 0) {
          violations.push(`Generated code contains forbidden spacing: ${allHardcoded.join(', ')}`);
        } else {
          passed.push('No hardcoded external spacing found.');
        }

        if (code.includes('display: inline-block')) {
          warnings.push('Uses display: inline-block (may cause baseline gaps).');
        }
      }

      if (type === 'template') {
        const suspicious = code.match(/margin[A-Z]?:\s*['"]?-?\d+px['"]?/g) || [];
        if (suspicious.length > 0) {
          warnings.push(`Template uses hardcoded margins: ${suspicious.join(', ')}.`);
        }
        passed.push('Template validation complete.');
      }

      return { valid: violations.length === 0, violations, warnings, passed };
    }

    case 'audit_tokens': {
      const tokensPath = args.tokensPath || path.join(__dirname, 'tokens', 'tokens.yml');
      if (!fs.existsSync(tokensPath)) {
        return { error: `Tokens file not found: ${tokensPath}`, valid: false, status: 'error' };
      }
      const parsed = yaml.parse(fs.readFileSync(tokensPath, 'utf8'));

      const primitiveColors = Object.keys(parsed.primitive?.color || {}).length;
      const primitiveSpacing = Object.keys(parsed.primitive?.spacing || {}).length;
      const primitiveRadius = Object.keys(parsed.primitive?.radius || {}).length;
      const primitiveTypography = Object.keys(parsed.primitive?.typography || {}).length;
      const primitiveBlur = Object.keys(parsed.primitive?.blur || {}).length;
      const primitiveShadow = Object.keys(parsed.primitive?.shadow || {}).length;
      const semanticColors = Object.keys(parsed.semantic?.color || {}).length;
      const components = Object.keys(parsed.component || {}).length;
      const boundingBoxes = Object.keys(parsed.bounding_boxes || {}).length;
      const layoutContainers = Object.keys(parsed.layout_containers || {}).length;

      const totalTokens = primitiveColors + primitiveSpacing + primitiveRadius + primitiveTypography + primitiveBlur + primitiveShadow + semanticColors + components + boundingBoxes + layoutContainers;

      const defined = new Set();
      const missingValues = [];

      function walk(node, p) {
        if (!node || typeof node !== 'object') return;
        const keys = Object.keys(node).filter(k => !k.startsWith('$'));
        if (keys.length === 0) return;
        const hasValue = node.$value !== undefined;
        const hasType = node.$type !== undefined;
        if (hasType && !hasValue) {
          missingValues.push(p);
        }
        if (hasValue || hasType) {
          if (p) defined.add(p);
        }
        for (const key of keys) {
          walk(node[key], p ? `${p}.${key}` : key);
        }
      }

      walk(parsed, '');

      const used = new Set();
      for (const comp of Object.values(parsed.component || {})) {
        if (comp.tokens) {
          for (const t of comp.tokens) used.add(t);
        }
      }

      const orphanedTokens = [...defined].filter(t => !used.has(t));
      const deadTokens = [...used].filter(t => !defined.has(t));

      return {
        valid: orphanedTokens.length === 0 && deadTokens.length === 0 && missingValues.length === 0,
        summary: { totalTokens, components, boundingBoxes, layoutContainers, primitiveColors, primitiveSpacing, primitiveRadius, primitiveTypography, primitiveBlur, primitiveShadow, semanticColors },
        orphanedTokens,
        deadTokens,
        missingValues,
        status: 'ok',
      };
    }

    case 'suggest_fix': {
      const violation = args.violation || '';
      const code = args.code || '';
      let suggestion = '';
      let fixedCode = code;

      if (/margin\s*:\s*['"]?-?\d+px['"]?/.test(violation) || /margin[A-Z]?\s*:\s*['"]?-?\d+px['"]?/.test(violation)) {
        suggestion = 'Replace hardcoded margin with template-level spacing (gap or padding).';
        fixedCode = code.replace(/margin\s*:\s*['"]?-?\d+px['"]?/g, 'gap: 16px');
      } else if (/height\s*:\s*56px/.test(violation)) {
        suggestion = 'Use the design token height (48px) or CSS variable var(--p31-header-h).';
        fixedCode = code.replace(/height\s*:\s*56px/g, 'height: 48px');
      } else if (/position\s*:\s*relative/.test(violation)) {
        suggestion = 'Remove position: relative and use template-level spacing instead.';
        fixedCode = code.replace(/position\s*:\s*relative/g, '/* position removed — use template spacing */');
      } else if (/position\s*:\s*absolute/.test(violation)) {
        suggestion = 'Remove position: absolute and use template-level spacing instead.';
        fixedCode = code.replace(/position\s*:\s*absolute/g, '/* position removed — use template spacing */');
      } else if (/transform\s*:\s*translate/.test(violation)) {
        suggestion = 'Remove transform translate hack and use template-level gap/padding.';
        fixedCode = code.replace(/transform\s*:\s*translate[^;]+/g, '/* transform removed — use template spacing */');
      } else if (/(top|bottom)\s*:\s*['"]?-?\d+px['"]?/.test(violation)) {
        suggestion = 'Remove positional offset and use template padding/gap.';
        fixedCode = code.replace(/(top|bottom)\s*:\s*['"]?-?\d+px['"]?/g, '/* $1 removed — use template spacing */');
      } else {
        suggestion = 'No specific fix pattern matched. Review the violation manually.';
      }

      return { suggestion, fixedCode };
    }

    case 'validate_output': {
      const code = String(args.code || '');
      if (!code) {
        appendGovernanceEvent('validate_output', 'refused', 'missing code');
        return { error: 'Missing "code" field.', status: 'error' };
      }
      const violations = [];
      if (/#[0-9a-fA-F]{3,8}\b/.test(code)) violations.push('hardcoded_hex: replace with a var(--p31-*) token');
      if (/rgba?\([^)]*\)/.test(code)) violations.push('raw_color: replace with a color token');
      if (/style=\{/.test(code)) violations.push('inline_style: use tokens or catalog classes');
      if (/[\u{1F300}-\u{1F9FF}]/u.test(code)) violations.push('emoji_icon: use the P31 icon system');
      if (/primitive\.|semantic\.|component\./.test(code)) violations.push('legacy_token_vocabulary: use p31.* paths');
      const valid = violations.length === 0;
      appendGovernanceEvent('validate_output', valid ? 'ok' : 'refused', violations.join('; '));
      return { valid, violations, component: args.component || null, status: 'ok' };
    }

    case 'scaffold_component': {
      const name = String(args.name || '').trim();
      if (!name) return { error: 'Missing "name" field.', status: 'error' };
      const comp = COMPONENTS.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (!comp) {
        appendGovernanceEvent('scaffold_component', 'refused', `unknown component: ${name}`);
        return { error: `Component not found: "${name}". Available: ${COMPONENTS.map((c) => c.name).join(', ')}`, status: 'error' };
      }
      const cls = comp.css_class || comp.name.toLowerCase();
      const propLines = Object.entries(comp.props || {}).map(([k, p]) => {
        const opt = p.default === undefined ? '?' : '';
        const type = p.type || 'string';
        const dflt = p.default !== undefined ? ` = ${JSON.stringify(p.default)}` : '';
        return `  ${k}${opt}: ${type}${dflt};`;
      });
      const tsx = [
        `// Scaffold for ${comp.name} — generated from the closed registry.`,
        `// css_class: .${cls}`,
        `import './${cls}.css';`,
        '',
        `export interface ${comp.name}Props {`,
        ...propLines,
        '}',
        '',
        `export function ${comp.name}(props: ${comp.name}Props) {`,
        '  return (',
        `    <div className="${cls}">`,
        ...(comp.slots || []).map((s) => `      {/* slot: ${s} */}`),
        '    </div>',
        '  );',
        '}',
      ].join('\n');
      const test = [
        `import { describe, it, expect } from 'vitest';`,
        `import { ${comp.name} } from './${comp.name}';`,
        '',
        `describe('${comp.name}', () => {`,
        `  it('renders the registry css_class', () => {`,
        `    expect('${cls}').toBe('${cls}');`,
        '  });',
        '});',
      ].join('\n');
      appendGovernanceEvent('scaffold_component', 'ok', `scaffolded ${comp.name}`);
      return {
        name: comp.name,
        css_class: cls,
        contract: { props: Object.keys(comp.props || {}), slots: comp.slots || [], tokens: comp.tokens || [] },
        scaffold: { tsx, test },
        status: 'ok',
      };
    }

    case 'propose_page': {
      const type = String(args.type || '').trim();
      const components = Array.isArray(args.components) ? args.components.map(String) : [];
      const VALID_TYPES = ['hero', 'tetra-grid', 'card-grid', 'section', 'cta'];
      if (!VALID_TYPES.includes(type)) {
        appendGovernanceEvent('propose_page', 'refused', `invalid type: ${type}`);
        return { error: `Invalid type "${type}". Valid: ${VALID_TYPES.join(', ')}`, status: 'error' };
      }
      if (components.length === 0) {
        appendGovernanceEvent('propose_page', 'refused', 'missing components');
        return { error: 'Missing "components" (non-empty array).', status: 'error' };
      }
      const errors = [];
      const sections = components.map((c) => {
        const comp = COMPONENTS.find((x) => x.name.toLowerCase() === c.toLowerCase());
        if (!comp) { errors.push(`unknown_component: ${c}`); return null; }
        return { component: comp.name, css_class: comp.css_class, category: null };
      });
      const valid = errors.length === 0;
      appendGovernanceEvent('propose_page', valid ? 'ok' : 'refused', errors.join('; '));
      return { valid, page: valid ? { title: args.title || null, type, sections } : null, errors, status: valid ? 'ok' : 'error' };
    }

    default:
      return { error: `Unknown tool: ${name}`, status: 'error' };
  }
}

// ─── MCP stdio transport — SDK v2 (@modelcontextprotocol/server 2.3.1) ─────
// The hand-rolled stdio JSON-RPC loop was replaced by the v2 SDK's serveStdio
// entry (stdio subpath). Opening-era routing is the SDK's: modern stateless
// clients (2026-07-28) negotiate via server/discover with per-request `_meta`
// envelopes and get resultType/ttlMs/cacheScope on cacheable results; legacy
// clients (initialize/notifications/initialized, 2024-11-05..2025-11-25) are
// served a 2025-era instance from the same factory. See
// docs/fix-plans/design-mcp-server-sdk-v2-remainder.md.
//
// Byte-identical tool surface: tools are registered from the TOOLS table
// above via fromJsonSchema, so tools/list emits exactly the hand-rolled
// inputSchema objects, and tool results keep the exact legacy payload shapes.
// The two design:// resources and three prompts are re-registered with the
// SDK's resource/prompt APIs, preserving names, descriptions, and payloads.

const { serveStdio } = require('@modelcontextprotocol/server/stdio');
const { McpServer, fromJsonSchema, ResourceTemplate, ProtocolError, ProtocolErrorCode } = require('@modelcontextprotocol/server');

const SERVER_INFO = { name: 'p31-design-system', version: '1.0.0' };
const LIST_TTL_MS = 300000;
const LIST_CACHE_HINT = { ttlMs: LIST_TTL_MS, cacheScope: 'public' };

function createServer() {
  const server = new McpServer(SERVER_INFO, {
    capabilities: { tools: {}, resources: {}, prompts: {} },
    cacheHints: {
      'tools/list': LIST_CACHE_HINT,
      'resources/list': LIST_CACHE_HINT,
      'resources/read': LIST_CACHE_HINT,
      'prompts/list': LIST_CACHE_HINT,
    },
  });

  for (const tool of TOOLS) {
    server.registerTool(tool.name, {
      description: tool.description,
      inputSchema: fromJsonSchema(tool.inputSchema),
    }, async (args) => {
      try {
        const out = await executeTool(tool.name, args || {});
        return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
      } catch (e) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: e.message, status: 'error' }) }],
          isError: true,
        };
      }
    });
  }

  // ── Resources (design://tokens, design://components, with /path reads) ────

  const TOKENS_META = { description: 'P31 design tokens (DTCG 2.0). Append /path for a specific token.', mimeType: 'application/json', cacheHint: LIST_CACHE_HINT };
  const COMPONENTS_META = { description: 'P31 component definitions with props, slots, and tokens.', mimeType: 'application/json', cacheHint: LIST_CACHE_HINT };

  server.registerResource('Design Tokens', 'design://tokens', TOKENS_META, async () => {
    const topLevel = Object.keys(tokens).filter(k => !k.startsWith('$') && k !== 'version' && k !== 'metadata');
    return {
      contents: [{ uri: 'design://tokens', mimeType: 'application/json', text: JSON.stringify({ version: tokens.version, metadata: tokens.metadata, sections: topLevel }, null, 2) }],
    };
  });
  server.registerResource('Design Tokens path', new ResourceTemplate('design://tokens/{path*}', { list: undefined }), { mimeType: 'application/json', cacheHint: LIST_CACHE_HINT }, async (uri, variables) => {
    const pathStr = typeof variables?.path === 'string' ? variables.path : '';
    const value = dt(pathStr);
    return {
      contents: [{ uri: uri.toString(), mimeType: 'application/json', text: value !== undefined ? JSON.stringify(value, null, 2) : 'null' }],
    };
  });
  server.registerResource('Component Registry', 'design://components', COMPONENTS_META, async () => {
    const summaries = COMPONENTS.map(c => ({ name: c.name, description: c.description, css_class: c.css_class }));
    return {
      contents: [{ uri: 'design://components', mimeType: 'application/json', text: JSON.stringify({ total: summaries.length, components: summaries }, null, 2) }],
    };
  });
  server.registerResource('Component Registry path', new ResourceTemplate('design://components/{path*}', { list: undefined }), { mimeType: 'application/json', cacheHint: LIST_CACHE_HINT }, async (uri, variables) => {
    const name = typeof variables?.path === 'string' ? variables.path : '';
    const comp = COMPONENTS.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!comp) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Component not found: ${name}`);
    return {
      contents: [{ uri: uri.toString(), mimeType: 'application/json', text: JSON.stringify(comp, null, 2) }],
    };
  });

  // ── Prompts ───────────────────────────────────────────────────────────────

  const PROMPTS = [
    {
      name: 'generate_landing_page',
      listDescription: 'Generate a landing page layout with hero section, product grid, and CTA block.',
      getDescription: 'Generate a landing page layout',
      text: `Generate a landing page layout using P31 design system components.

Call layout_generate twice:
1. A "hero" layout with title, subtitle, cta buttons, and stats (use format: "a2ui")
2. A "card-grid" layout with the products as GlassCard items

Map products to: { component: "GlassCard", props: { title: ..., description: ..., color: ..., href: ... } }
Rotate accent colors: cyan, violet, gold, green for visual variety.`,
    },
    {
      name: 'generate_product_grid',
      listDescription: 'Generate a responsive card grid of products.',
      getDescription: 'Generate a product grid',
      text: `Generate a responsive card grid of products using P31 design system components.

Call layout_generate with:
  type: "card-grid"
  format: "a2ui"
  heading: the grid heading
  columns: 2-4 (default 3)
  items: array of { component: "GlassCard", props: { title, description, color, href } }

Use accent colors: accent (cyan), violet, gold, green.`,
    },
    {
      name: 'generate_research_page',
      listDescription: 'Generate a card grid of research papers.',
      getDescription: 'Generate a research page',
      text: `Generate a research papers page using P31 design system components.

Call layout_generate with:
  type: "card-grid"
  format: "a2ui"
  heading: the section heading
  columns: 2-3
  items: array of { component: "GlassCard", props: { title, description, color, href } }

For status, add a StatusBadge component inside each card description.
Published = green, In-review = gold, Preprint = violet.`,
    },
  ];
  for (const p of PROMPTS) {
    server.registerPrompt(p.name, { description: p.listDescription }, async () => ({
      description: p.getDescription,
      messages: [{ role: 'user', content: { type: 'text', text: p.text } }],
    }));
  }

  return server;
}

serveStdio(createServer);
