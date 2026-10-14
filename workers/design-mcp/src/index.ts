/**
 * P31 Design System MCP Worker
 * MCP 2026-07-28 Stateless Core — no session handshake.
 *
 * Endpoints:
 *   POST /              MCP JSON-RPC (tools/list, tools/call, server/discover)
 *   GET  /health         Health check
 *   GET  /              Tool listing page (HTML)
 *
 * Deploy: wrangler deploy
 * Bind to: mcp.p31ca.org (or custom domain)
 */

import { tokens, TOKENS_DTC, COMPONENT_DEFS, CATALOG, getCatalogEntry, icons, iconCatalog } from './data';
import { guardXaa } from './xaa-auth';
import {
  proposeComponent,
  proposeIcon,
  proposeToken,
  tokenize,
  scoreComponents,
  suggestTokens,
  suggestProps,
  generateGuidance,
  validateProposal,
} from './proposer';
import { validateComponent, auditTokens, auditIcons, type ValidationResult, type AuditResult, type AuditIconsResult } from './validator';
import { scanUI, type MCPAnnotation } from './handlers/scan-ui';
import { handleToggleDrawer, handleNavigate, handleSetSpoonLevel, handleListContracts, handleGetContract, handleValidateContract, handleClarify, handleProposeFromSpec, componentPreviewHtmlInline } from './handlers/tools';
import { handleProposePage, handleScaffoldComponent, handleValidateOutput } from './handlers/governance';
import skillsData from './generated/skills.json';
import { resolveDeviceTier, getTierTokens } from './tiers';
import { McpServer, createMcpHandler, fromJsonSchema, ResourceTemplate, ProtocolError, ProtocolErrorCode } from '@modelcontextprotocol/server';
const SKILLS = skillsData as Record<string, { title: string; body: string; has_evals: boolean }>;

const BRAND_TOKENS_RESOLVED: Record<string, Record<string, any>> = {
  p31ca: { '--p31-accent': 'var(--p31-accent)', '--p31-accent-violet': 'var(--p31-accent-violet)' },
  phos: { '--p31-accent': 'var(--p31-accent)', '--p31-accent-emerald': 'var(--p31-color-emerald)' },
  phosphorus31: { '--p31-accent': 'var(--p31-accent)', '--p31-accent-amber': 'var(--p31-color-amber)' },
  willow: { '--p31-accent': 'var(--p31-accent)', '--p31-accent-violet': 'var(--p31-accent-violet)' },
  bonding: { '--p31-accent': 'var(--p31-accent)', '--p31-accent-cyan': 'var(--p31-accent-cyan)' },
};

function designCoreCss(): string {
  return `/* P31 Design Core CSS — the canonical token + recipe stylesheet.
     Load at runtime via: <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@p31ca/design-core@latest/css/all.css">
     This resource is a reference marker; the full CSS ships in the @p31ca/design-core package. */`;
}

/**
 * Render the catalog as a self-contained HTML page for MCP Apps hosts
 * (SEP-1865). Hosts render `text/html;profile=mcp-app` in a sandboxed iframe; JSON blobs
 * render as inert text.
 */
function renderCatalogHtml(): string {
  const entries = Object.entries(COMP_LIST).map(([name, def]: [string, any]) => ({
    name,
    description: def.description ?? '',
    category: def.category ?? 'ambient',
    css_class: def.css_class ?? name.toLowerCase(),
    tokens: def.tokens ?? [],
    spoonCost: def.category === 'action' ? 1 : def.category === 'surface' ? 2 : 1,
  }));

  const cards = entries.map((c) => `
    <article class="catalog-card" data-category="${c.category}" data-name="${c.name}">
      <div class="stage">
        <span class="name">${h(c.name)}</span>
        <code>.${h(c.css_class)}</code>
      </div>
      <p class="desc">${h(c.description)}</p>
      <div class="meta">
        <span class="cat">${h(c.category)}</span>
        <span class="cost">◆ ${c.spoonCost}</span>
      </div>
    </article>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en" data-spoons="3">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@p31ca/design-core@2.3.0/css/all.css">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 16px;
    background: var(--p31-bg, #0a0a0f);
    color: var(--p31-text, #f5f5f7);
    font-family: var(--p31-font-sans, system-ui);
    font-size: 13px;
  }
  h1 { font-size: 15px; margin: 0 0 12px; font-weight: 700; letter-spacing: 0.02em; }
  .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
  .catalog-card {
    background: var(--p31-glass-bg, rgba(255,255,255,0.04));
    border: 1px solid var(--p31-glass-border, rgba(255,255,255,0.08));
    border-radius: 10px; padding: 10px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .stage {
    display: flex; flex-direction: column; align-items: center;
    padding: 10px 0; background: rgba(0,0,0,0.2); border-radius: 6px;
    min-height: 56px; justify-content: center;
  }
  .stage .name { font-weight: 600; font-size: 12px; }
  .stage code { font-size: 10px; opacity: 0.5; font-family: var(--p31-font-mono, monospace); }
  .desc { margin: 0; font-size: 11px; opacity: 0.7; line-height: 1.4; min-height: 30px; }
  .meta { display: flex; justify-content: space-between; font-size: 10px; }
  .cat { color: var(--p31-accent, #00f0ff); text-transform: uppercase; letter-spacing: 0.05em; }
  .cost { color: var(--p31-accent-gold, #fbbf24); font-family: var(--p31-font-mono, monospace); }
</style>
</head>
<body>
  <h1>P31 Component Catalog — ${entries.length} components</h1>
  <div class="catalog-grid">${cards}</div>
</body>
</html>`;
}

// ─── Icon lazy loader ──────────────────────────────────────────────────

let _iconsData: { icons: any[]; iconCatalog: Record<string, any> } | null = null;

async function loadIconsData(): Promise<{ icons: any[]; iconCatalog: Record<string, any> }> {
  if (_iconsData) return _iconsData;
  _iconsData = { icons: [...icons] as any[], iconCatalog: iconCatalog as Record<string, any> };
  return _iconsData;
}

/** Metadata-only icon data (SVG strings stripped) for list/search resources. */
async function loadIconMeta(): Promise<Array<Record<string, any>>> {
  const { icons } = await loadIconsData();
  return icons.map((icon: any) => {
    const { svg, ...meta } = icon;
    return meta;
  });
}

// ─── MCP 2026-07-28 Stateless Core ──────────────────────────────────────

const PROTOCOL_VERSION = '2026-07-28';
const META_PROTOCOL = 'io.modelcontextprotocol/protocolVersion';
const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo';
const SERVER_INFO = { name: 'p31-design-system', version: '1.0.0' };

function metaEnvelope(): { _meta: Record<string, unknown> } {
  return {
    _meta: {
      [META_PROTOCOL]: PROTOCOL_VERSION,
      [META_SERVER_INFO]: SERVER_INFO,
    },
  };
}

// ─── Token resolver ─────────────────────────────────────────────────────────

function dt(pathStr: string): unknown {
  const parts = pathStr.split('.');
  let node: any = tokens;
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return (node != null && typeof node === 'object' && node['$value'] != null)
    ? node['$value']
    : node;
}

function resolveReferences(value: any, seen = new Set<string>()): any {
  if (typeof value !== 'string') return value;
  return value.replace(/\{([^}]+)\}/g, (_, ref) => {
    if (seen.has(ref)) throw new Error(`Circular reference: ${ref}`);
    seen.add(ref);
    const resolved = dt(ref);
    if (resolved === undefined) throw new Error(`Unresolved reference: ${ref}`);
    return resolveReferences(resolved, seen);
  });
}

function tokenResolve(pathStr: string): any {
  const raw = dt(pathStr);
  if (raw === undefined) return null;
  return resolveReferences(raw);
}

// ─── Component schema ────────────────────────────────────────────────────────

// Use canonical COMPONENT_DEFS from design-core for all component tools
interface CompDef {
  description?: string;
  css_class?: string;
  aiGuidance?: { useWhen?: string[]; avoidWhen?: string[]; examples?: string[] };
  variants?: string[];
  props?: Record<string, { type?: string; default?: any; options?: string[]; range?: [number, number] }>;
  slots?: string[];
  tokens?: string[];
}

const COMP_LIST = COMPONENT_DEFS || {};

function getComponent(name: string) {
  const key = Object.keys(COMP_LIST).find(
    k => k.toLowerCase() === name.toLowerCase()
  );
  if (!key) return null;
  const raw = COMP_LIST[key];

  const props: Record<string, any> = {};
  for (const [pname, pdef] of Object.entries(raw.props || {})) {
    props[pname] = {
      type: pdef.type || 'string',
      default: pdef.default,
    };
    if ((pdef as any).options) props[pname].options = (pdef as any).options;
    if ((pdef as any).range) props[pname].range = (pdef as any).range;
  }

  const resolvedTokens: Record<string, any> = {};
  for (const t of raw.tokens || []) {
    try { resolvedTokens[t] = tokenResolve(t); } catch {}
  }

  return {
    name: key,
    description: raw.description,
    css_class: raw.css_class,
    aiGuidance: raw.aiGuidance || null,
    variants: raw.variants || [],
    props,
    slots: raw.slots || [],
    tokens: raw.tokens || [],
    resolved_tokens: resolvedTokens,
    category: raw.category,
    status: raw.status,
    version: raw.version,
    importPath: raw.importPath,
  };
}

// ─── MCP Tools definition ────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'token_resolve',
    description: 'Resolve a DTCG token path to its computed value.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string' as const, description: 'Dotted token path (e.g. p31.color.accent.default)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'component_schema',
    description: 'Get the full schema for a P31 design system component.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Component name (e.g. GlassCard, Button)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'component_usage',
    description: 'List all P31 components with descriptions and CSS classes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Optional filter by component name' },
      },
    },
  },
  {
    name: 'generate_component',
    description: 'Generate a React/TSX component from components.yml. Returns the component code, test, and Storybook story.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Component name to generate (e.g. GlassCard, Button, SpoonMeter). Omit to generate all.' },
      },
    },
  },
  {
    name: 'component_search',
    description: 'Search P31 design components by name, description, CSS class, or AI guidance keywords.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string' as const, description: 'Search query — matches component name, description, css_class, or aiGuidance fields (e.g. "form", "button", "spoons", "crisis").' },
      },
      required: ['query'],
    },
  },
  {
    name: 'token_list',
    description: 'List all available token categories with key values.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        prefix: { type: 'string' as const, description: 'Optional filter prefix' },
      },
    },
  },
  {
    name: 'list_tokens_dtc',
    description: 'List all P31 design tokens in W3C DTCG 2025.10 format. Returns the full token exchange format for design tool integration.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_component_metadata',
    description: 'Get structured metadata for a P31 component: props, slots, variants, accessibility requirements, status, and import path. Optimized for AI agent consumption.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Component name, e.g. "GlassPanel", "Topbar", "SpoonDial"' },
      },
      required: ['name'],
    },
  },
  {
    name: 'component_catalog',
    description: 'Get the full GenUI component catalog: every P31 component with description, props, tokens, variants, accessibility, AI guidance, and Storybook stories. Derived from the Storybook components manifest merged with canonical component definitions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string' as const, enum: ['surface', 'navigation', 'action', 'feedback', 'accessibility', 'ambient'], description: 'Optional filter by component category.' },
      },
    },
  },
  {
    name: 'search_catalog',
    description: 'Search the component catalog by name, description, CSS class, category, tokens, or AI-guidance keywords. Returns matching entries including Storybook stories and render snippets.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string' as const, description: 'Search text (matches name, description, cssClass, category, tokens, aiGuidance useWhen/avoidWhen — e.g. "navigation", "spoons", "crisis", "glass").' },
        category: { type: 'string' as const, enum: ['surface', 'navigation', 'action', 'feedback', 'accessibility', 'ambient'], description: 'Optional category filter.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'resolve_brand',
    description: 'Resolve a brand token set by extending a base theme. Returns merged tokens for the brand.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        brand: { type: 'string' as const, description: 'Brand ID: p31ca, phos, phosphorus31, willow, bonding' },
      },
      required: ['brand'],
    },
  },
  {
    name: 'layout_generate',
    description: 'Generate sovereign HTML layout from a JSON description. Supports hero, tetra-grid, card-grid, section, and cta layout types. Set format: "a2ui" for A2UI JSON output.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string' as const, enum: ['hero', 'tetra-grid', 'card-grid', 'section', 'cta'], description: 'Layout type to render.' },
        format: { type: 'string' as const, enum: ['html', 'a2ui'], description: 'Output format. Default "html". Set "a2ui" for JSON component tree.' },
        title: { type: 'string' as const, description: 'Main heading (hero, section).' },
        subtitle: { type: 'string' as const, description: 'Subtitle text (hero).' },
        heading: { type: 'string' as const, description: 'Section heading (card-grid, section, cta).' },
        description: { type: 'string' as const, description: 'Section description (card-grid, section, cta).' },
        columns: { type: 'number' as const, description: 'Number of grid columns (card-grid, default 3, max 4).' },
        badge: { type: 'string' as const, description: 'Badge text (hero).' },
        content: { type: 'string' as const, description: 'Raw HTML content (section).' },
        ctas: { type: 'array' as const, description: 'Array of {label, href, variant} buttons (hero).' },
        stats: { type: 'array' as const, description: 'Array of {value, label} stat cards (hero).' },
        buttons: { type: 'array' as const, description: 'Array of {label, href, variant} buttons (cta).' },
        items: { type: 'array' as const, description: 'Array of {component: "GlassCard", props: {color, title, description, href}} (tetra-grid, card-grid).' },
      },
      required: ['type'],
    },
  },
  {
    name: 'list_icons',
    description: 'List all P31 icons with family, colors, animation, and description.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        family: { type: 'string' as const, enum: ['regular', 'advanced'], description: 'Optional filter by icon family.' },
      },
    },
  },
  {
    name: 'get_icon',
    description: 'Get a single P31 icon SVG + metadata by id.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Icon id (e.g. sovereign-crown, spoon).' },
      },
      required: ['name'],
    },
  },
  {
    name: 'icon_search',
    description: 'Search P31 icons by name, concept keyword, or color palette. Returns matching icons with metadata.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string' as const, description: 'Search query — matches icon id, name, description, or colors (e.g. "crown", "gold", "sovereign").' },
        family: { type: 'string' as const, enum: ['regular', 'advanced'], description: 'Optional filter by icon family.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'icon_preview',
    description: 'Get a rendered P31 icon preview (HTML with embedded SVG) plus metadata for agent visualization.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Icon id (e.g. sovereign-crown, spoon).' },
        size: { type: 'string' as const, enum: ['sm', 'md', 'lg'], description: 'Preview size: sm=24px, md=40px, lg=64px. Default md.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'propose_component',
    description: 'Propose a new P31 design system component from a natural language description.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        description: { type: 'string' as const, description: 'Natural language description of the component.' },
        style: { type: 'string' as const, enum: ['glass', 'solid', 'minimal'], description: 'Visual style preference.' },
        interactive: { type: 'boolean' as const, description: 'Whether the component accepts user input.' },
        surfaceId: { type: 'string' as const, description: 'The surface ID this component proposal belongs to' },
        userId: { type: 'string' as const, description: 'The user ID for this request' },
      },
      required: ['description'],
    },
  },
  {
    name: 'propose_icon',
    description: 'Propose a new P31 icon from a natural language description.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        description: { type: 'string' as const, description: 'What the icon represents.' },
        family: { type: 'string' as const, enum: ['regular', 'advanced'], description: 'Icon family preference.' },
        colors: { type: 'array' as const, items: { type: 'string' }, description: 'Preferred color tokens.' },
        surfaceId: { type: 'string' as const, description: 'The surface ID this icon proposal belongs to' },
        userId: { type: 'string' as const, description: 'The user ID for this request' },
      },
      required: ['description'],
    },
  },
  {
    name: 'propose_token',
    description: 'Propose a new P31 design token from a natural language description. Returns path, value, type, category, and rationale.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        description: { type: 'string' as const, description: 'Natural language description of the token need (e.g. "a soft purple glow for hover states").' },
        category: { type: 'string' as const, enum: ['primitive', 'semantic', 'theme'], description: 'Token namespace. Defaults to primitive.' },
        type: { type: 'string' as const, enum: ['color', 'dimension', 'fontFamily', 'shadow'], description: 'Token value type. Defaults inferred from description.' },
        surfaceId: { type: 'string' as const, description: 'The surface ID this token proposal belongs to' },
        userId: { type: 'string' as const, description: 'The user ID for this request' },
      },
      required: ['description'],
    },
  },
  {
    name: 'validate_component',
    description: 'Validate a P31 component against the design system schema.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Component name to validate.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'audit_tokens',
    description: 'Audit the P31 token tree for inconsistencies, orphans, and dead tokens.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'audit_icons',
    description: 'Audit the P31 icon catalog for missing SVGs, metadata, family mismatches, color count errors, duplicates, animation/viewBox/aria-label issues, and catalog mismatches.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_template_spec',
    description: 'Get the DESIGN.md spec for a canonical P31 page template. Returns the full template specification including visual theme, color palette, typography, layout, components used, tokens used, and agent generation rules.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        template: { type: 'string' as const, enum: ['template-developer-hub', 'template-institutional', 'template-caregiver'], description: 'Template identifier.' },
        returnFormat: { type: 'string' as const, enum: ['json', 'markdown'], description: 'Output format. "json" (default) returns structured fields. "markdown" returns the full DESIGN.md prose optimized for AI agent reasoning.' },
      },
      required: ['template'],
    },
  },
  {
    name: 'template_preview',
    description: 'Get a live preview URL and metadata for a P31 canonical page template. Returns the live URL, screenshot placeholder, source file path, and a concise visual description optimized for AI agents to "see" the template.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        template: { type: 'string' as const, enum: ['template-developer-hub', 'template-institutional', 'template-caregiver'], description: 'Template identifier.' },
      },
      required: ['template'],
    },
  },
  {
    name: 'scan_ui',
    description: 'Scan HTML for WebMCP annotations (data-mcp-* attributes). Returns structured list of all annotations found.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        html: { type: 'string' as const, description: 'HTML string to scan (usually a component or page).' },
      },
      required: ['html'],
    },
  },
  {
    name: 'propose_from_spec',
    description: 'Propose a component from a spec contract. Takes a spec name (e.g. button, glass-panel), looks up its contract, generates a proposal, validates it, and returns a visual baseline path. One-pass spec→verify pipeline.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        spec: { type: 'string' as const, description: 'Spec/component name (e.g. button, glass-panel, chat-composer). Must match a contract in specs/.' },
      },
      required: ['spec'],
    },
  },
  {
    name: 'toggleDrawer',
    description: 'Open or close the navigation drawer',
    inputSchema: {
      type: 'object' as const,
      properties: {
        state: { type: 'string' as const, enum: ['open', 'closed'], description: 'Desired drawer state' },
        target: { type: 'string' as const, description: 'Which drawer to toggle (e.g. nav-drawer)' },
        surfaceId: { type: 'string' as const, description: 'The surface ID this drawer belongs to' },
        userId: { type: 'string' as const, description: 'The user ID for this request' },
      },
      required: ['state', 'target'],
    },
  },
  {
    name: 'navigate',
    description: 'Navigate to a URL',
    inputSchema: {
      type: 'object' as const,
      properties: {
        href: { type: 'string' as const, description: 'URL to navigate to' },
        external: { type: 'boolean' as const, description: 'Whether the URL is external' },
        surfaceId: { type: 'string' as const, description: 'The surface ID this navigation occurs in' },
        userId: { type: 'string' as const, description: 'The user ID for this request' },
      },
      required: ['href'],
    },
  },
  {
    name: 'setSpoonLevel',
    description: 'Set cognitive load level (0–5)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        level: { type: 'number' as const, minimum: 0, maximum: 5, description: 'Spoon level (0 = crisis, 5 = quantum)' },
        surfaceId: { type: 'string' as const, description: 'The surface ID this spoon level applies to' },
        userId: { type: 'string' as const, description: 'The user ID for this request' },
      },
      required: ['level'],
    },
  },
  {
    name: 'list_contracts',
    description: 'List all machine-readable component contracts with semantic parts, token categories, and required ARIA.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_contract',
    description: 'Fetch the full machine-readable contract for a specific component: closed token lists, semantic parts, required ARIA, interaction states, spoon rules, forbidden patterns.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Component name (e.g. Button, GlassPanel, ChatMessage)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'validate_contract',
    description: 'Validate generated code against a component contract. Checks for hardcoded hex, inline styles, emoji icons, and forbidden patterns.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Component name to validate against' },
        code: { type: 'string' as const, description: 'Generated code to validate' },
      },
      required: ['name'],
    },
  },
  {
    name: 'clarify',
    description: 'Detect ambiguities in a generation prompt before synthesis. Returns prioritized questions to resolve intent gaps that cause agents to invent tokens or skip required ARIA.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        prompt: { type: 'string' as const, description: 'The user prompt or generation request to analyze' },
        context: { type: 'object' as const, description: 'Optional context (theme, brand, age, sensory mode)' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'list_skills',
    description: 'List all available P31 skills — machine-readable standards agents can load at runtime via p31://skills resources.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_skill',
    description: 'Get the full body of a P31 skill (machine-readable standard) by name. Returns the SKILL.md content with audit rules and golden eval cases.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Skill name (e.g. p31-standards)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'propose_page',
    description: 'Propose a sovereign page composed from canon components. Every component name is resolved against the closed catalog; an unknown component refuses the whole proposal (fail-closed).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' as const, description: 'Optional page title.' },
        type: { type: 'string' as const, enum: ['hero', 'tetra-grid', 'card-grid', 'section', 'cta'], description: 'Page layout type.' },
        components: { type: 'array' as const, items: { type: 'string' as const }, description: 'Component names to compose (e.g. ["GlassCard", "Button"]).' },
      },
      required: ['type', 'components'],
    },
  },
  {
    name: 'scaffold_component',
    description: 'Return a contract-conformant scaffold (tsx + test + story) for a known component. No file is written by the worker; the write path is the local CLI under pnpm gate. Unknown component is refused.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, description: 'Component name to scaffold (e.g. Button, GlassPanel, GlassCard).' },
      },
      required: ['name'],
    },
  },
  {
    name: 'validate_output',
    description: 'Fail-closed validation of generated code: flags hardcoded hex, raw color, inline style, emoji icons, legacy token vocabulary, and contract forbidden patterns. Returns valid=false when any violation is found.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: { type: 'string' as const, description: 'Generated code to validate.' },
        component: { type: 'string' as const, description: 'Optional component name to also check against its contract forbidden patterns.' },
      },
      required: ['code'],
    },
  },
  {
    name: 'resolve_device_tier',
    description: 'Resolve the delivery tier (mobile/tablet/desktop/embedded) from capability, never device brand. Independent pointer/hover flags are surfaced, never collapsed; unknown input fails closed.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        widthDp: { type: 'number' as const, description: 'Viewport width in dp (CSS px).' },
        pointer: { type: 'string' as const, description: 'Pointer capability: none | coarse | fine | mixed.' },
        hover: { type: 'string' as const, description: 'Hover capability: none | hover | mixed.' },
      },
      required: ['widthDp', 'pointer', 'hover'],
    },
  },
  {
    name: 'get_tier_tokens',
    description: 'Get the tier contract (touch floor, navigation, delivery surfaces) for a tier. Token VALUES resolve via token_resolve / list_tokens_dtc.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        tier: { type: 'string' as const, description: 'Tier: embedded | mobile | tablet | desktop.' },
      },
      required: ['tier'],
    },
  },
];

// ─── Layout generator ──────────────────────────────────────────────────────

const COLOR_TO_VAR: Record<string, string> = {
  accent: 'var(--p31-accent)',
  violet: 'var(--p31-accent-violet)',
  gold: 'var(--p31-accent-gold)',
  green: 'var(--p31-accent-green)',
  red: 'var(--p31-accent-red)',
  iris: 'var(--p31-accent-iris)',
};

function h(s: string): string {
  if (typeof s !== 'string') return String(s);
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderA2UI(type: string, props: any): any {
  function make(tag: string, props: any, children?: any[]) {
    return Object.assign({ component: tag, properties: props || {} }, children ? { children } : {});
  }

  switch (type) {
    case 'hero': {
      const children: any[] = [];
      if (props.badge) children.push(make('Label', { text: props.badge, variant: 'badge' }));
      children.push(make('Heading', { text: props.title || '', level: 1 }));
      if (props.subtitle) children.push(make('Text', { text: props.subtitle, variant: 'subtitle' }));
      if (props.ctas) children.push(make('ButtonRow', { buttons: props.ctas.map((c: any) => ({ label: c.label, href: c.href, variant: c.variant || 'primary' })) }));
      if (props.stats) children.push(make('StatRow', { stats: props.stats.map((s: any) => ({ value: s.value, label: s.label })) }));
      return { version: 'p31-a2ui-0.9', layout: 'hero', root: make('Hero', {}, children) };
    }

    case 'tetra-grid':
      return {
        version: 'p31-a2ui-0.9', layout: 'tetra-grid',
        root: make('TetraGrid', {}, (props.items || []).map((item: any, i: number) => {
          const p = item.props || {};
          return make('GlassCard', { title: p.title || '', description: p.description || '', color: p.color || ['accent', 'violet', 'gold', 'green'][i], href: p.href || '' });
        })),
      };

    case 'card-grid': {
      const children: any[] = [];
      if (props.heading) children.push(make('Heading', { text: props.heading, level: 2 }));
      if (props.description) children.push(make('Text', { text: props.description, variant: 'description' }));
      children.push(make('Grid', { columns: props.columns || 3 }, (props.items || []).map((item: any) => {
        const p = item.props || {};
        return make('GlassCard', { title: p.title || '', description: p.description || '', color: p.color || 'accent', href: p.href || '' });
      })));
      return { version: 'p31-a2ui-0.9', layout: 'card-grid', root: make('Section', { variant: 'grid' }, children) };
    }

    case 'section': {
      const children: any[] = [];
      if (props.heading) children.push(make('Heading', { text: props.heading, level: 2 }));
      if (props.description) children.push(make('Text', { text: props.description, variant: 'description' }));
      if (props.content) children.push(make('HtmlBlock', { html: props.content }));
      return { version: 'p31-a2ui-0.9', layout: 'section', root: make('Section', {}, children) };
    }

    case 'cta':
      return {
        version: 'p31-a2ui-0.9', layout: 'cta',
        root: make('CTABlock', { heading: props.heading || '', description: props.description || '', buttons: (props.buttons || []).map((b: any) => ({ label: b.label, href: b.href || '#', variant: b.variant || 'primary' })) }),
      };

    default:
      return { error: `Unknown layout type: ${type}`, supported: ['hero', 'tetra-grid', 'card-grid', 'section', 'cta'] };
  }
}

function renderLayout(input: any): any {
  const format = (input && input.format) || 'html';
  const { type, format: _, ...props } = input || {};

  if (!type) return { error: 'Missing "type" field.' };

  if (format === 'a2ui') return renderA2UI(type, props);

  // HTML format
  switch (type) {
    case 'hero': {
      const { title, subtitle, ctas, stats, badge } = props;
      const badgeHtml = badge ? `<div style="display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:32px;margin-bottom:20px;" class="glass-subtle">${h(badge)}</div>` : '';
      const ctasHtml = (ctas || []).map((c: any) => `<a href="${h(c.href || '#')}" class="btn-${c.variant === 'secondary' ? 'secondary' : c.variant === 'ghost' ? 'ghost' : 'primary'}" style="display:inline-flex;align-items:center;gap:8px;">${h(c.label || '')}</a>`).join('');
      const statsHtml = (stats || []).map((s: any) => `<div class="glass-subtle" style="padding:12px 16px;text-align:center;min-width:80px;"><div style="font-size:20px;font-weight:700;color:var(--p31-text);">${h(String(s.value))}</div><div style="font-size:10px;color:var(--p31-text-tertiary);text-transform:uppercase;letter-spacing:0.05em;">${h(s.label)}</div></div>`).join('');
      return `<section style="text-align:center;padding:60px 0 40px;max-width:1280px;margin:0 auto;padding-left:24px;padding-right:24px;">${badgeHtml}<h1 style="font-size:clamp(2.5rem,6vw,4rem);font-weight:800;color:var(--p31-text);margin-bottom:16px;line-height:1.15;">${h(title || '')}</h1>${subtitle ? `<p style="font-size:1.125rem;color:var(--p31-text-secondary);max-width:650px;margin:0 auto 32px;">${h(subtitle)}</p>` : ''}${ctasHtml ? `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:${statsHtml ? '32px' : '0'};">${ctasHtml}</div>` : ''}${statsHtml ? `<div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;">${statsHtml}</div>` : ''}</section>`;
    }

    case 'tetra-grid': {
      const { items } = props;
      if (!items || items.length !== 4) return '<p>Error: tetra-grid requires exactly 4 items.</p>';
      const cards = items.map((item: any, i: number) => {
        const p = item.props || {};
        const color = p.color || ['accent', 'violet', 'gold', 'green'][i];
        const border = `border-left:2px solid ${COLOR_TO_VAR[color] || COLOR_TO_VAR.accent};`;
        const inner = `${p.title ? `<h3 style="color:var(--p31-text);font-size:14px;font-weight:700;">${h(p.title)}</h3>` : ''}${p.description ? `<p style="color:var(--p31-text-secondary);font-size:12px;line-height:1.5;">${h(p.description)}</p>` : ''}`;
        return (p.href && p.href !== '#')
          ? `<a href="${h(p.href)}" class="glass-card" style="${border}text-decoration:none;display:block;">${inner}</a>`
          : `<div class="glass-card" style="${border}">${inner}</div>`;
      }).join('');
      return `<div class="tetra-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px 0;">${cards}</div>`;
    }

    case 'card-grid': {
      const { columns, heading, description, items } = props;
      const headingHtml = heading ? `<h2 style="font-size:clamp(1.5rem,3vw,2.25rem);font-weight:700;color:var(--p31-text);margin-bottom:8px;text-align:center;">${h(heading)}</h2>` : '';
      const descHtml = description ? `<p style="color:var(--p31-text-secondary);text-align:center;max-width:650px;margin:0 auto 24px;">${h(description)}</p>` : '';
      const col = Math.min(columns || 3, 4);
      const cards = (items || []).map((item: any) => {
        const p = item.props || {};
        const border = p.color ? `border-left:2px solid ${COLOR_TO_VAR[p.color] || COLOR_TO_VAR.accent};` : '';
        const inner = `${p.title ? `<h3 style="color:var(--p31-text);font-size:14px;font-weight:700;margin-bottom:4px;">${h(p.title)}</h3>` : ''}${p.description ? `<p style="color:var(--p31-text-secondary);font-size:12px;line-height:1.5;">${h(p.description)}</p>` : ''}`;
        return (p.href && p.href !== '#')
          ? `<a href="${h(p.href)}" class="glass-card" style="${border}text-decoration:none;display:block;">${inner}</a>`
          : `<div class="glass-card" style="${border}">${inner}</div>`;
      }).join('');
      return `<div style="max-width:1280px;margin:0 auto;padding:24px;">${headingHtml}${descHtml}<div style="display:grid;grid-template-columns:repeat(${col},1fr);gap:16px;">${cards}</div></div>`;
    }

    case 'section': {
      const { heading, description, content } = props;
      return `<section style="padding:48px 24px;max-width:1280px;margin:0 auto;">${heading ? `<h2 style="font-size:clamp(1.5rem,3vw,2.25rem);font-weight:700;color:var(--p31-text);margin-bottom:8px;text-align:center;">${h(heading)}</h2>` : ''}${description ? `<p style="color:var(--p31-text-secondary);text-align:center;max-width:650px;margin:0 auto 24px;">${h(description)}</p>` : ''}${content || ''}</section>`;
    }

    case 'cta': {
      const { heading, description, buttons } = props;
      const btnHtml = (buttons || []).map((b: any) => `<a href="${h(b.href || '#')}" class="btn-${b.variant === 'secondary' ? 'secondary' : b.variant === 'ghost' ? 'ghost' : 'primary'}" style="display:inline-flex;align-items:center;gap:8px;">${h(b.label || '')}</a>`).join('');
      return `<div class="glass-strong" style="padding:48px 24px;text-align:center;max-width:720px;margin:0 auto;border-radius:var(--p31-radius-xl);"><h2 style="font-size:clamp(1.5rem,3vw,2rem);font-weight:700;color:var(--p31-text);margin-bottom:12px;">${h(heading || '')}</h2>${description ? `<p style="color:var(--p31-text-secondary);margin-bottom:24px;max-width:550px;margin-left:auto;margin-right:auto;">${h(description)}</p>` : ''}${btnHtml ? `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">${btnHtml}</div>` : ''}</div>`;
    }

    default:
      return `<p>Unknown layout type: "${h(type)}". Supported: hero, tetra-grid, card-grid, section, cta.</p>`;
  }
}

// ─── Tool execution ─────────────────────────────────────────────────────────

  async function executeTool(name: string, args: Record<string, any>) {
  switch (name) {
    case 'token_resolve': {
      const value = tokenResolve(args.path);
      if (value === null) return { error: `Token not found: "${args.path}"`, status: 'error' };
      const raw = dt(args.path) as any;
      return {
        path: args.path,
        value: String(value),
        type: (raw && raw['$type']) || typeof value,
        status: 'ok',
      };
    }

    case 'component_schema': {
      const comp = getComponent(args.name);
      if (!comp) {
        const available = Object.keys(COMP_LIST).join(', ');
        return { error: `Unknown component "${args.name}". Available: ${available}`, status: 'error' };
      }
      return { component: comp, catalog: getCatalogEntry(args.name), status: 'ok' };
    }

    case 'component_usage': {
      if (args.name) {
        const comp = getComponent(args.name);
        if (!comp) return { error: `Unknown component "${args.name}"`, status: 'error' };
        return { name: comp.name, component: comp, status: 'ok' };
      }
  const allEntries = Object.entries(COMP_LIST) as [string, Record<string, any>][];
  const all: Record<string, { description: string; css_class: string }> = {};
  for (const [key, raw] of allEntries) {
    all[key] = {
      description: (raw as any).description || '',
      css_class: (raw as any).css_class || '',
    };
  }
      return { components: all, total: Object.keys(all).length, status: 'ok' };
    }

    case 'component_catalog': {
      const categoryFilter = args.category;
      const comps = categoryFilter
        ? CATALOG.components.filter((c) => c.category === categoryFilter)
        : CATALOG.components;
      const categories = [...new Set(CATALOG.components.map((c) => c.category))];
      return {
        v: CATALOG.v,
        generatedAt: CATALOG.generatedAt,
        categories,
        total: comps.length,
        components: comps,
        status: 'ok',
      };
    }

    case 'search_catalog': {
      const q = String(args.query || '').toLowerCase().trim();
      const categoryFilter = args.category;
      if (!q && !categoryFilter) return { error: 'Provide "query" or "category".', status: 'error' };
      const matches = CATALOG.components.filter((c) => {
        if (categoryFilter && c.category !== categoryFilter) return false;
        if (!q) return true;
        const haystack = [
          c.name,
          c.description,
          c.cssClass,
          c.category,
          (c.tokens || []).join(' '),
          (c.aiGuidance?.useWhen || []).join(' '),
          (c.aiGuidance?.avoidWhen || []).join(' '),
          (c as any).variants || [],
        ].join(' ').toLowerCase();
        return haystack.includes(q);
      });
      return {
        query: args.query,
        total: matches.length,
        components: matches,
        status: 'ok',
      };
    }

    case 'token_list': {
      const entries: Record<string, unknown> = {};
      const prefix = args.prefix || '';

      function walk(node: any, pathStr: string) {
        if (!node || typeof node !== 'object') return;
        if (node['$value'] !== undefined) {
          if (!prefix || pathStr.startsWith(prefix)) {
            entries[pathStr] = { value: node['$value'], type: node['$type'] || 'string' };
          }
          return;
        }
        for (const key of Object.keys(node)) {
          if (key.startsWith('$')) continue;
          walk(node[key], pathStr ? `${pathStr}.${key}` : key);
        }
      }

      walk(tokens, '');
      return { tokens: entries, total: Object.keys(entries).length, status: 'ok' };
    }

    case 'list_tokens_dtc': {
      return { tokens: TOKENS_DTC, count: Array.isArray(TOKENS_DTC) ? TOKENS_DTC.length : Object.keys(TOKENS_DTC).length, status: 'ok' };
    }

    case 'get_component_metadata': {
      const def = COMPONENT_DEFS[args.name as string];
      if (!def) {
        const available = Object.keys(COMPONENT_DEFS).join(', ');
        return { error: `Component not found: "${args.name}". Available: ${available}`, status: 'error' };
      }
      return { component: args.name, metadata: def, catalog: getCatalogEntry(args.name), status: 'ok' };
    }

    case 'resolve_brand': {
      const brand = String(args.brand || '').trim();
      if (!brand) return { error: 'Missing "brand" field.', status: 'error' };
      const validBrands = ['p31ca', 'phos', 'phosphorus31', 'willow', 'bonding'];
      if (!validBrands.includes(brand)) {
        return { error: `Invalid brand: "${brand}". Valid: ${validBrands.join(', ')}`, status: 'error' };
      }
      const tokens = BRAND_TOKENS_RESOLVED[brand] || {};
      return { brand, tokens, status: 'ok' };
    }

    case 'layout_generate': {
      const result = renderLayout(args);
      return (args && args.format === 'a2ui')
        ? { a2ui: result, status: 'ok' }
        : { html: result, status: 'ok' };
    }

    case 'list_icons': {
      const meta = await loadIconMeta();
      const familyFilter = args.family;
      const filtered = familyFilter ? meta.filter((i: any) => i.family === familyFilter) : meta;
      return {
        icons: filtered,
        total: filtered.length,
        status: 'ok',
      };
    }

    case 'get_icon': {
      const { icons } = await loadIconsData();
      const icon = icons.find((i: any) => i.id === args.name);
      if (!icon) return { error: `Icon not found: "${args.name}"`, status: 'error' };
      return { icon, status: 'ok' };
    }

    case 'icon_search': {
      const meta = await loadIconMeta();
      const q = (args.query || '').toLowerCase();
      const familyFilter = args.family;
      if (!q) return { error: 'Missing "query" field.', status: 'error' };
      const matches = meta.filter((i: any) => {
        if (familyFilter && i.family !== familyFilter) return false;
        const haystack = `${i.id} ${i.name} ${i.description} ${(i.colors || []).join(' ')}`.toLowerCase();
        return haystack.includes(q);
      });
      return {
        query: args.query,
        results: matches,
        total: matches.length,
        status: 'ok',
      };
    }

    case 'icon_preview': {
      const { icons } = await loadIconsData();
      const icon = icons.find((i: any) => i.id === args.name);
      if (!icon) return { error: `Icon not found: "${args.name}"`, status: 'error' };
      const size = args.size || 'md';
      const SIZE_PX = { sm: 24, md: 40, lg: 64 };
      const px = (SIZE_PX as Record<string, number>)[size] || 40;
      const colorSwatches = (icon.colors || []).map((c: string) => `<span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${c};margin-right:4px;" title="${c}"></span>`).join('');
      const preview = `<div style="display:inline-flex;align-items:center;gap:12px;padding:12px 16px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);"><div style="width:${px}px;height:${px}px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(0,240,255,0.06);"><span style="font-size:${px * 0.5}px;color:var(--p31-accent);">⬡</span></div><div><div style="font-size:13px;font-weight:600;color:var(--p31-text);margin-bottom:2px;">${icon.name}</div><div style="font-size:11px;color:var(--p31-text-tertiary);margin-bottom:4px;">${icon.family} &middot; ${icon.animated ? 'animated' : 'static'}</div><div style="display:flex;align-items:center;">${colorSwatches}</div></div></div>`;
      return {
        id: icon.id,
        name: icon.name,
        family: icon.family,
        colors: icon.colors,
        animated: icon.animated,
        description: icon.description,
        size,
        preview,
        status: 'ok',
      };
    }

      case 'generate_component': {
        const name = (args as any).name;
        const componentsUrl = 'https://github.com/p31labs/production/blob/main/packages/design-core/src/componentDefs.ts';
        const cliCommand = `andromeda generate${name ? ` --component ${name}` : ''}`;
        const available = Object.keys(COMP_LIST);
        return {
          status: 'ok',
          message: 'Component generation runs at build time via the local CLI (not inside this edge worker).',
          cliCommand,
          componentsUrl,
          availableComponents: name ? available.filter(c => c.toLowerCase() === name.toLowerCase()) : available,
          instructions: `Run "${cliCommand}" from the monorepo root to generate ${name || 'all'} component(s) into packages/design-core/src/generated/.`,
        };
      }

      case 'component_search': {
        const query = (args.query || '').toLowerCase();
        if (!query) return { error: 'Missing "query" field.', status: 'error' };
        const matches: any[] = [];
        for (const key of Object.keys(COMP_LIST)) {
          const raw = COMP_LIST[key] as Record<string, any>;
          const haystack = `${key} ${raw.description || ''} ${raw.css_class || ''} ${(raw.aiGuidance?.useWhen || '')} ${(raw.aiGuidance?.avoidWhen || '')} ${(raw.aiGuidance?.examples || []).join(' ')}`.toLowerCase();
          if (haystack.includes(query)) {
            matches.push({
              name: key,
              description: raw.description || '',
              css_class: raw.css_class || '',
              aiGuidance: raw.aiGuidance || null,
            });
          }
        }
        return {
          query: args.query,
          results: matches,
          total: matches.length,
          status: 'ok',
        };
      }

      case 'propose_component': {
        const description = String(args.description || '').trim();
        if (!description) return { error: 'Missing "description" field.', status: 'error' };
        const result = proposeComponent(description, args.style, args.interactive, COMPONENT_DEFS);
        return { ...result, status: 'ok' };
      }

      case 'propose_icon': {
        const description = String(args.description || '').trim();
        if (!description) return { error: 'Missing "description" field.', status: 'error' };
        const result = proposeIcon(description, args.family, args.colors);
        return { ...result, status: 'ok' };
      }

      case 'propose_token': {
        const description = String(args.description || '').trim();
        if (!description) return { error: 'Missing "description" field.', status: 'error' };
        const result = proposeToken(description, args.category, args.type);
        return { ...result, status: 'ok' };
      }

      case 'validate_component': {
        const targetName = String(args.name || '').trim();
        if (!targetName) return { error: 'Missing "name" field.', status: 'error' };
        const comp = COMP_LIST[targetName];
        if (!comp) {
          const available = Object.keys(COMP_LIST).join(', ');
          return { error: `Component not found: "${targetName}". Available: ${available}`, status: 'error' };
        }
        const result = validateComponent(targetName, comp, tokens, COMP_LIST);
        const issues = [...result.errors, ...result.warnings];
        if (args.code) {
          const hasHex = /#[0-9a-fA-F]{3,8}/.test(args.code);
          if (hasHex) issues.push('Hardcoded hex colors detected — use var(--p31-*) tokens');
          const hasRgba = /rgba?\(/.test(args.code);
          if (hasRgba) issues.push('Hardcoded rgba() detected — use var(--p31-*) tokens or color-mix()');
        }
        return { ...result, issues, status: 'ok' };
      }

      case 'audit_tokens': {
        const result = auditTokens(tokens, COMPONENT_DEFS);
        return { ...result, status: 'ok' };
      }

      case 'get_template_spec': {
        const TEMPLATE_SPECS: Record<string, Record<string, any>> = {
          'template-developer-hub': {
            id: 'template-developer-hub',
            name: 'Developer Hub Landing (Fortress)',
            visualTheme: 'Dark, high-contrast, technical. Cyan primary accent with violet/emerald/gold support colors. Dense information architecture — 7 sections on one page.',
            colorPalette: {
              accent: { primary: '#00F0FF (cyan)', violet: '#A78BFA', gold: '#FBBF24', green: '#34D399', red: '#FB7185', iris: '#818CF8' },
              surface: { void: '#0A0A0F', 'glass-subtle': 'rgba(255,255,255,0.03)', 'glass-card': 'rgba(255,255,255,0.04)', 'glass-strong': 'rgba(255,255,255,0.08)' },
              text: { primary: '#F5F5F7', secondary: 'rgba(245,245,247,0.5)', tertiary: 'rgba(245,245,247,0.3)', muted: 'rgba(245,245,247,0.2)' },
            },
            typography: { heroTitle: '96px font-extrabold gradient accent', sectionHeader: 'text-3xl md:text-4xl font-bold', monoLabel: '10px JetBrains Mono tracking-[0.2em] uppercase white/20', cardTitle: 'text-sm/base font-bold', cardBody: 'text-xs white/40-50', body: 'Inter', mono: 'JetBrains Mono' },
            structure: ['AppShell', 'SectionHero (Crown + H1 + subtitle + CTAs + EIN)', 'Architecture (4 tetrahedral vertex cards)', 'Products (8-card grid, colored borders)', 'Family (Grandparent agents + children)', 'Agent Mesh (8-card grid with tool counts)', 'Research (6 papers, status badges)', 'CTA (glass-strong panel, 3 buttons)', 'Footer'],
            components: ['AppShell', 'Crown (size lg)', 'SectionHero', 'SectionFeatures', 'Footer', 'glass-card', 'glass-subtle', 'glass-strong', 'btn-primary', 'btn-secondary', 'btn-ghost'],
            tokens: { color: ['--p31-accent', '--p31-accent-violet', '--p31-accent-gold', '--p31-accent-green', '--p31-accent-red'], surface: ['--p31-glass-bg', '--p31-glass-surface', '--p31-glass-border'], animation: ['fadeIn 0.3-0.4s, stagger 0.06-0.1s per card'] },
            rules: ['Density-first: 7 sections, 30+ cards', 'Colored accent borders per card', 'Animated stagger reveal', 'Mono labels for section headers', 'EIN in hero', 'Agent cards show tool counts'],
            sourceFile: 'apps/p31ca/src/pages/index.astro (397 lines)',
            liveUrl: 'https://p31ca.org',
            designMdPath: 'docs/templates/template-developer-hub.md',
          },
          'template-institutional': {
            id: 'template-institutional',
            name: 'Institutional Landing (Garden)',
            visualTheme: 'Clean, trustworthy, editorial. Emerald (green) primary accent for growth and care. Amber secondary for warmth. Generous whitespace, text hierarchy, stats cards for social proof.',
            colorPalette: {
              accent: { primary: '#34D399 (emerald)', amber: '#FBBF24', cyan: '#00F0FF', violet: '#A78BFA' },
              surface: { void: '#0A0A0F', card: 'oklch(18% 0.015 240)', border: 'oklch(28% 0.02 240)' },
              text: { primary: 'oklch(96% 0.005 240)', secondary: 'oklch(75% 0.01 240)', muted: 'oklch(65% 0.01 240)', subtle: 'oklch(45% 0.01 240)' },
            },
            typography: { heroTitle: 'text-4xl md:text-6xl lg:text-7xl font-extrabold', sectionHeader: 'text-2xl md:text-4xl font-bold', stats: 'text-3xl md:text-4xl font-bold font-mono', body: 'text-sm leading-relaxed', buttons: 'px-8 py-3 rounded-full font-semibold text-sm' },
            structure: ['Layout (JSON-LD, canonical)', 'Page wrapper', 'HERO (501c3 badge + H1 + stats + 3 CTAs)', 'MISSION (4 accordion cards)', 'Team + Transparency panels', 'IMPACT (4 stat cards + testimonials)', 'PRODUCTS (4 cards)', 'RESEARCH (3 cards)', 'GET INVOLVED (4 action cards)', 'FINAL CTA (emerald card + 3 buttons)', 'Footer'],
            components: ['Layout', 'Page', 'SectionHero', 'SectionFeatures', 'Footer', 'details (accordion)', 'glass-subtle', 'glass-card'],
            tokens: { color: ['--p31-color-emerald', '--p31-color-amber', '--p31-color-cyan', '--p31-color-violet'], surface: ['--p31-surface-card', '--p31-surface-border'], spacing: ['--p31-space-xs', '--p31-space-xl'], maxWidth: ['--p31-max-width-lg'] },
            rules: ['Trust signals above fold (501c3, EIN, ORCID)', 'Live stats as social proof', 'Mission accordions with progressive disclosure', 'Emerald primary accent only', 'Pill CTAs (rounded-full)', 'No Crown SVG', 'Status badges on products'],
            sourceFile: 'apps/phosphorus31/src/pages/index.astro (363 lines)',
            liveUrl: 'https://phosphorus31.org',
            designMdPath: 'docs/templates/template-institutional.md',
          },
          'template-caregiver': {
            id: 'template-caregiver',
            name: 'Caregiver Companion (PHOS Conversational)',
            visualTheme: 'Minimal, calm, distraction-free. Near-black void background. Only two elements visible: pre-cognitive action chips and a text input bar. No chrome, no navigation, no footer.',
            colorPalette: {
              surface: { base: '#050508 (near-black)', panel: '#12121A', input: 'rgba(255,255,255,0.04)' },
            text: { primary: 'oklch(96% 0.005 240)', secondary: 'oklch(75% 0.01 240)', muted: 'oklch(65% 0.01 240)' },
            accent: { primary: '#A78BFA (violet — calm, non-alarming)' },
            },
            typography: { chips: '12px font-medium', input: '16px (var(--p31-text-base))', messages: '14px', fontFamily: 'Inter' },
            structure: ['ChipBar (5 pre-cognitive action chips, above input)', 'Message canvas (flex: 1, scrollable)', 'Input bar (glass-subtle, sticky bottom, max-width 640px)'],
            components: ['ChipBar (5 chips: Check spoons, Grounding, Log care proof, LOVE balance, Ask anything)', 'Native <input>', 'Native <button>'],
            componentsNOT: ['No Crown', 'No SiteNav', 'No Footer', 'No GlassCard component', 'No SpoonDial'],
            tokens: { surface: ['--p31-void-deep', '--p31-surface', '--p31-glass-surface', '--p31-glass-bg'], text: ['--p31-text-primary', '--p31-text-secondary', '--p31-text-muted'], border: ['--p31-glass-border'], spacing: ['--p31-space-xs', '--p31-space-sm', '--p31-space-md', '--p31-space-lg'], radius: ['--p31-radius-md', '--p31-radius-full'], blur: ['--p31-blur-strong (24px on input bar)'] },
            rules: ['Zero-reading default: no text reading required to start', 'Pre-cognitive chips ABOVE input bar (behavioral upgrade)', 'Exactly 5 chips max (cognitive load research)', 'Auto-focus input on mount', 'Chat-style message bubbles (user right/violet, system left/void)', 'Enter to send (no multiline)', '600ms processing delay', 'Spoon-aware: motion disabled at crisis (spoons 0-1)'],
            crisisMode: 'At spoons 0-1: all motion disabled, ChipBar still visible (fastest path to help), message canvas collapses to 3 messages, processing delay reduced to 0ms',
            sourceFile: 'apps/phos/src/features/conversational/components/ConversationalSurface.tsx (241 lines)',
            liveUrl: 'https://phos.p31ca.org/conversational',
            designMdPath: 'docs/templates/template-caregiver.md',
          },
        };
        const spec = TEMPLATE_SPECS[args.template];
        if (!spec) return { error: `Template not found: "${args.template}". Available: template-developer-hub, template-institutional, template-caregiver`, status: 'error' };

        if (args.returnFormat === 'markdown') {
          const md = generateTemplateMarkdown(spec);
          return { template: spec.id, format: 'markdown', content: md, status: 'ok' };
        }
        return { template: spec, status: 'ok' };
      }

      case 'template_preview': {
        const PREVIEWS: Record<string, { name: string; liveUrl: string; sourceFile: string; designMdPath: string; icon: string; accent: string; sections: number; description: string; layoutHints: string }> = {
          'template-developer-hub': { name: 'Developer Hub Landing', liveUrl: 'https://p31ca.org', sourceFile: 'apps/p31ca/src/pages/index.astro', designMdPath: 'docs/templates/template-developer-hub.md', icon: '🏰', accent: '#00F0FF', sections: 7, description: 'Dark technical hub. Crown hero, 8 product cards, 8 agent mesh cards, 6 research papers, glass CTA panel.', layoutHints: 'Use AppShell + SectionHero + SectionFeatures (4-col) + glass-card for cards. Colored left/right borders per card. Staggered fadeIn animation. Mono section labels.' },
          'template-institutional': { name: 'Institutional Landing', liveUrl: 'https://phosphorus31.org', sourceFile: 'apps/phosphorus31/src/pages/index.astro', designMdPath: 'docs/templates/template-institutional.md', icon: '🌿', accent: '#34D399', sections: 7, description: 'Emerald nonprofit landing. 501c3 badge, 4 live stats, mission accordions, testimonials, 3 CTAs.', layoutHints: 'Use Layout + Page + SectionHero + SectionFeatures. Emerald primary accent. Pill-shaped CTAs (rounded-full). <details> accordions for mission. Surface-card backgrounds.' },
          'template-caregiver': { name: 'Caregiver Companion', liveUrl: 'https://phos.p31ca.org/conversational', sourceFile: 'apps/phos/src/features/conversational/components/ConversationalSurface.tsx', designMdPath: 'docs/templates/template-caregiver.md', icon: '💬', accent: '#A78BFA', sections: 1, description: 'Minimal chat surface. 5 pre-cognitive chips above input bar. Void-deep background. No chrome, no nav, no footer.', layoutHints: 'Use void-deep background, flex-column layout. ChipBar above input bar. Glass-subtle input at bottom. Chat bubble messages. Violet accent for chips. Auto-focus input on mount.' },
        };
        const preview = PREVIEWS[args.template];
        if (!preview) return { error: `Template not found: "${args.template}"`, status: 'error' };
        return { preview, status: 'ok' };
      }

      case 'audit_icons': {
        const { icons: iconList, iconCatalog: cat } = await loadIconsData();
        const result = auditIcons(iconList, cat);
        return { ...result, status: 'ok' };
      }

      case 'scan_ui': {
        const { html } = args as { html: string };
        const result = scanUI(html);
        return { html: result, status: 'ok' };
      }

       case 'toggleDrawer': {
         const result = await handleToggleDrawer(args as { state: 'open' | 'closed', target: string, surfaceId?: string, userId?: string });
         return { ...result, status: 'ok' };
       }

       case 'navigate': {
         const result = await handleNavigate(args as { href: string, external?: boolean, surfaceId?: string, userId?: string });
         return { ...result, status: 'ok' };
       }

        case 'setSpoonLevel': {
          const result = await handleSetSpoonLevel(args as { level: number, surfaceId?: string, userId?: string });
          return { ...result, status: 'ok' };
        }

        case 'list_contracts': {
          const contractsList = await handleListContracts();
          return contractsList;
        }

        case 'get_contract': {
          const contractResult = await handleGetContract(args as { name: string });
          return contractResult;
        }

        case 'validate_contract': {
          const validateResult = await handleValidateContract(args as { name: string; code?: string });
          return validateResult;
        }

        case 'clarify': {
          const clarifyResult = await handleClarify(args as { prompt: string; context?: Record<string, any> });
          return clarifyResult;
        }

        case 'propose_from_spec': {
          const proposeResult = await handleProposeFromSpec(args as { spec: string });
          return proposeResult;
        }

        case 'list_skills': {
          const skills = Object.entries(SKILLS).map(([name, skill]) => ({
            name,
            title: skill.title,
            has_evals: skill.has_evals,
          }));
          return { skills, total: skills.length, status: 'ok' };
        }

        case 'get_skill': {
          const skillName = String(args.name || '');
          const skill = SKILLS[skillName];
          if (!skill) return { error: `Skill not found: "${skillName}"`, status: 'error' };
          return { name: skillName, body: skill.body, status: 'ok' };
        }

        case 'propose_page': {
          return await handleProposePage(args as { title?: string; type: string; components: string[] });
        }

        case 'scaffold_component': {
          return await handleScaffoldComponent(args as { name: string });
        }

        case 'validate_output': {
          return await handleValidateOutput(args as { code: string; component?: string });
        }

        case 'resolve_device_tier': {
          try {
            const r = resolveDeviceTier(args as { widthDp: number; pointer: string; hover: string });
            return { ...r, status: 'ok' };
          } catch (e) {
            return { error: e instanceof Error ? e.message : String(e), status: 'error' };
          }
        }

        case 'get_tier_tokens': {
          try {
            const r = getTierTokens(String((args as { tier?: string }).tier ?? ''));
            return { ...r, status: 'ok' };
          } catch (e) {
            return { error: e instanceof Error ? e.message : String(e), status: 'error' };
          }
        }

      default:
        return { error: `Unknown tool: ${name}`, status: 'error' };
   }
  }

// ─── Markdown formatter for template specs ─────────────────────────────────

function generateTemplateMarkdown(spec: Record<string, any>): string {
  const lines: string[] = [];
  lines.push(`# ${spec.name}`);
  lines.push('');
  lines.push(`> ${spec.visualTheme}`);
  lines.push('');

  if (spec.colorPalette) {
    lines.push('## Color Palette');
    lines.push('');
    for (const [group, colors] of Object.entries(spec.colorPalette as Record<string, any>)) {
      lines.push(`### ${group.charAt(0).toUpperCase() + group.slice(1)}`);
      for (const [name, value] of Object.entries(colors as Record<string, string>)) {
        lines.push(`- **${name}:** \`${value}\``);
      }
      lines.push('');
    }
  }

  if (spec.typography) {
    lines.push('## Typography');
    lines.push('');
    for (const [role, value] of Object.entries(spec.typography as Record<string, string>)) {
      lines.push(`- **${role}:** ${value}`);
    }
    lines.push('');
  }

  if (spec.structure) {
    lines.push('## Layout Structure');
    lines.push('');
    (spec.structure as string[]).forEach((s: string) => lines.push(`1. ${s}`));
    lines.push('');
  }

  if (spec.components) {
    lines.push('## Components Used');
    lines.push('');
    (spec.components as string[]).forEach((c: string) => lines.push(`- \`${c}\``));
    lines.push('');
  }

  if (spec.componentsNOT) {
    lines.push('## Components NOT Used');
    lines.push('');
    (spec.componentsNOT as string[]).forEach((c: string) => lines.push(`- ${c}`));
    lines.push('');
  }

  if (spec.tokens) {
    lines.push('## Design Tokens');
    lines.push('');
    for (const [group, tokens] of Object.entries(spec.tokens as Record<string, any>)) {
      lines.push(`### ${group.charAt(0).toUpperCase() + group.slice(1)}`);
      (tokens as string[]).forEach((t: string) => lines.push(`- \`${t}\``));
      lines.push('');
    }
  }

  if (spec.rules) {
    lines.push('## Behavioral Rules');
    lines.push('');
    (spec.rules as string[]).forEach((r: string) => lines.push(`- ${r}`));
    lines.push('');
  }

  if (spec.crisisMode) {
    lines.push('## Crisis Mode');
    lines.push('');
    lines.push(spec.crisisMode);
    lines.push('');
  }

  lines.push('## Source');
  lines.push('');
  lines.push(`- **File:** ${spec.sourceFile}`);
  lines.push(`- **Live:** ${spec.liveUrl}`);
  lines.push(`- **DESIGN.md:** ${spec.designMdPath}`);

  return lines.join('\n');
}

// ─── MCP 2026-07-28 (SDK v2) ──────────────────────────────────────────────
// The hand-rolled stateless dispatch was replaced by the split SDK v2
// (`@modelcontextprotocol/server` → `McpServer` + `createMcpHandler`).
// The SDK handler serves the modern 2026-07-28 surface (server/discover,
// `_meta` envelope, resultType, ttlMs/cacheScope on cacheable results,
// -32022 version mismatches) and keeps 2025-era clients working through its
// default `legacy: 'stateless'` fallback; the worker's own deprecated
// initialize/initialized branch is intercepted before the handler and kept
// byte-identical (see handleRequest). Tools are registered from the TOOLS
// table via fromJsonSchema (inputSchema emission is byte-identical);
// resources and prompts are re-registered with the SDK's resource/prompt
// APIs, preserving names, descriptions, and payloads. See
// docs/fix-plans/design-mcp-worker-sdk-v2.md.

const LIST_TTL_MS = 60_000;
const LIST_CACHE_HINT = { ttlMs: LIST_TTL_MS, cacheScope: 'public' } as const;

function buildServer(): McpServer {
  const server = new McpServer(SERVER_INFO, {
    capabilities: { tools: {}, resources: {}, prompts: {} },
    cacheHints: {
      'tools/list': LIST_CACHE_HINT,
      'resources/list': LIST_CACHE_HINT,
      'prompts/list': LIST_CACHE_HINT,
    },
  });

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: fromJsonSchema(tool.inputSchema as unknown as Parameters<typeof fromJsonSchema>[0]) },
      async (args) => {
        try {
          const out = await executeTool(tool.name, (args ?? {}) as Record<string, any>);
          return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
        } catch (e: any) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: e?.message ?? String(e), status: 'error' }) }],
            isError: true,
          };
        }
      },
    );
  }

  // ── Resources (registered in resources/list order; dynamic /path reads
  //    behind ResourceTemplates with `list: undefined`, matching the
  //    hand-rolled read surface without altering resources/list) ─────────

  server.registerResource('Design Tokens', 'design://tokens', {
    description: 'P31 design tokens (DTCG 2.0). Append /path for a specific token.',
    mimeType: 'application/json',
  }, async () => ({
    contents: [{
      uri: 'design://tokens',
      mimeType: 'application/json',
      text: JSON.stringify({
        version: (tokens as any).version,
        metadata: (tokens as any).metadata,
        sections: Object.keys(tokens).filter(k => !k.startsWith('$') && k !== 'version' && k !== 'metadata'),
      }, null, 2),
    }],
  }));

  server.registerResource('Design Tokens path', new ResourceTemplate('design://tokens/{path*}', { list: undefined }), {
    mimeType: 'application/json',
  }, async (uri, variables) => {
    const pathStr = typeof variables?.path === 'string' ? variables.path : '';
    const value = dt(pathStr);
    return {
      contents: [{ uri: uri.toString(), mimeType: 'application/json', text: value !== undefined ? JSON.stringify(value, null, 2) : 'null' }],
    };
  });

  server.registerResource('Component Registry', 'design://components', {
    description: 'P31 component definitions with props, slots, and tokens.',
    mimeType: 'application/json',
  }, async () => ({
    contents: [{
      uri: 'design://components',
      mimeType: 'application/json',
      text: JSON.stringify({
        total: Object.keys(COMP_LIST).length,
        components: Object.keys(COMP_LIST).map(k => {
          const c = COMP_LIST[k] as Record<string, any>;
          return { name: k, description: c.description, css_class: c.css_class };
        }),
      }, null, 2),
    }],
  }));

  server.registerResource('Component Registry path', new ResourceTemplate('design://components/{path*}', { list: undefined }), {
    mimeType: 'application/json',
  }, async (uri, variables) => {
    const name = typeof variables?.path === 'string' ? variables.path : '';
    const comp = getComponent(name);
    if (!comp) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Component not found: ${name}`);
    return {
      contents: [{ uri: uri.toString(), mimeType: 'application/json', text: JSON.stringify(comp, null, 2) }],
    };
  });

  server.registerResource('Icon Catalog', 'design://icons', {
    description: 'P31 icon pack manifest (regular + advanced). Append /id for a single icon.',
    mimeType: 'application/json',
  }, async () => ({
    contents: [{
      uri: 'design://icons',
      mimeType: 'application/json',
      text: JSON.stringify({ total: (await loadIconMeta()).length, icons: await loadIconMeta() }, null, 2),
    }],
  }));

  server.registerResource('Icon Catalog path', new ResourceTemplate('design://icons/{path*}', { list: undefined }), {
    mimeType: 'application/json',
  }, async (uri, variables) => {
    const name = typeof variables?.path === 'string' ? variables.path : '';
    const { iconCatalog } = await loadIconsData();
    const entry = iconCatalog[name];
    if (!entry) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Icon not found: ${name}`);
    return {
      contents: [{ uri: uri.toString(), mimeType: 'application/json', text: JSON.stringify({ id: name, ...entry }, null, 2) }],
    };
  });

  const previewResource = (name: string, title: string, description: string) => {
    server.registerResource(title, `ui://p31/component/${name}`, {
      description,
      mimeType: 'text/html;profile=mcp-app',
    }, async (uri) => ({
      contents: [{ uri: uri.toString(), mimeType: 'text/html;profile=mcp-app', text: componentPreviewHtmlInline({ name: previewName(name) }).html }],
    }));
  };
  previewResource('button', 'Button Preview', 'Live Button component preview with brand tokens. MCP Apps: renders in sandboxed iframe.');
  previewResource('chat-composer', 'Chat Composer Preview', 'Live ChatComposer component preview with brand tokens. MCP Apps: renders in sandboxed iframe.');
  previewResource('chat-message', 'Chat Message Preview', 'Live ChatMessage component preview with brand tokens. MCP Apps: renders in sandboxed iframe.');
  previewResource('glass-panel', 'Glass Panel Preview', 'Live GlassPanel component preview with brand tokens. MCP Apps: renders in sandboxed iframe.');
  previewResource('artifact-pane', 'Artifact Pane Preview', 'Live ArtifactPane component preview with brand tokens. MCP Apps: renders in sandboxed iframe.');

  server.registerResource('Component preview path', new ResourceTemplate('ui://p31/component/{name}', { list: undefined }), {
    mimeType: 'text/html;profile=mcp-app',
  }, async (uri, variables) => {
    const name = typeof variables?.name === 'string' ? variables.name : '';
    return {
      contents: [{ uri: uri.toString(), mimeType: 'text/html;profile=mcp-app', text: componentPreviewHtmlInline({ name: previewName(name) }).html }],
    };
  });

  server.registerResource('Component Catalog', 'ui://p31/catalog', {
    description: 'Full P31 component catalog rendered as HTML (MCP Apps compatible).',
    mimeType: 'text/html;profile=mcp-app',
  }, async (uri) => ({
    contents: [{ uri: uri.toString(), mimeType: 'text/html;profile=mcp-app', text: renderCatalogHtml() }],
  }));

  server.registerResource('Icon Catalog', 'ui://p31/icons', {
    description: 'P31 icon metadata (without SVG payloads). Full SVGs via ui://p31/icon/:id.',
    mimeType: 'application/json',
  }, async (uri) => ({
    contents: [{
      uri: uri.toString(),
      mimeType: 'application/json',
      text: JSON.stringify({ total: (await loadIconMeta()).length, icons: await loadIconMeta() }, null, 2),
    }],
  }));

  server.registerResource('Icon path', new ResourceTemplate('ui://p31/icons/{id}', { list: undefined }), {
    mimeType: 'application/json',
  }, async (uri, variables) => {
    const name = typeof variables?.id === 'string' ? variables.id : '';
    if (!name) throw new ProtocolError(ProtocolErrorCode.InvalidParams, 'Icon name required');
    const { iconCatalog } = await loadIconsData();
    const entry = iconCatalog[name];
    if (!entry) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Icon not found: ${name}`);
    return {
      contents: [{ uri: uri.toString(), mimeType: 'application/json', text: JSON.stringify({ id: name, ...entry }, null, 2) }],
    };
  });

  server.registerResource('Design Core CSS', new ResourceTemplate('ui://p31/tokens/css', { list: undefined }), {
    mimeType: 'text/css',
  }, async (uri) => ({
    contents: [{ uri: uri.toString(), mimeType: 'text/css', text: designCoreCss() }],
  }));

  server.registerResource('Skills manifest', new ResourceTemplate('p31://skills', { list: undefined }), {
    mimeType: 'application/json',
  }, async (uri) => ({
    contents: [{
      uri: uri.toString(),
      mimeType: 'application/json',
      text: JSON.stringify({
        skills: Object.entries(skillsData).map(([name, skill]) => ({ name, title: skill.title })),
      }, null, 2),
    }],
  }));

  server.registerResource('Skill body', new ResourceTemplate('p31://skills/{name}', { list: undefined }), {
    mimeType: 'text/markdown',
  }, async (uri, variables) => {
    const skillName = typeof variables?.name === 'string' ? variables.name : '';
    const skill = SKILLS[skillName];
    if (!skill) throw new ProtocolError(ProtocolErrorCode.InvalidParams, `Skill not found: ${skillName}`);
    return {
      contents: [{ uri: uri.toString(), mimeType: 'text/markdown', text: skill.body }],
    };
  });

  // ── Prompts ──────────────────────────────────────────────────────────────

  const PROMPTS = [
    {
      name: 'generate_landing_page',
      listDescription: 'Generate a landing page layout with hero section, product grid, and CTA block.',
      getDescription: 'Generate a landing page layout',
      text: 'Generate a landing page layout using P31 design system components. Call layout_generate twice: (1) "hero" layout with title, subtitle, cta buttons, and stats (format: "a2ui"), (2) "card-grid" layout with products as GlassCard items. Rotate accent colors: cyan, violet, gold, green.',
    },
    {
      name: 'generate_product_grid',
      listDescription: 'Generate a responsive card grid of products.',
      getDescription: 'Generate a product grid',
      text: 'Generate a responsive card grid with layout_generate: type="card-grid", format="a2ui", heading, columns (default 3), items as GlassCard objects. Use accent colors for visual variety.',
    },
    {
      name: 'generate_research_page',
      listDescription: 'Generate a card grid of research papers.',
      getDescription: 'Generate a research page',
      text: 'Generate a research page with layout_generate: type="card-grid", format="a2ui", items as GlassCard objects with title, description, color, href. Published=green, In-review=gold, Preprint=violet.',
    },
  ];
  for (const p of PROMPTS) {
    server.registerPrompt(p.name, { description: p.listDescription }, async () => ({
      description: p.getDescription,
      messages: [{ role: 'user', content: { type: 'text', text: p.text } }],
    }));
  }

  // Conformance (2026-07-28): `server/discover` must return top-level
  // `protocolVersion` + capabilities + serverInfo. The SDK emits
  // `supportedVersions` + `capabilities` and stamps serverInfo into `_meta`;
  // add the missing top-level keys (additive only, no other behavior change).
  const sdkServer = server.server as unknown as { _ondiscover: () => Record<string, unknown> };
  const sdkDiscover = sdkServer._ondiscover.bind(sdkServer);
  sdkServer._ondiscover = () => {
    const base = sdkDiscover();
    return {
      protocolVersion: PROTOCOL_VERSION,
      supportedProtocolVersions: Array.isArray(base.supportedVersions)
        ? [...(base.supportedVersions as string[])]
        : [PROTOCOL_VERSION],
      ...base,
    };
  };

  return server;
}

const mcpHandler = createMcpHandler(() => buildServer());

/** The advertised preview URIs are lowercase slugs; COMPONENT_DEFS keys are
 *  PascalCase. Resolve case-insensitively so ui://p31/component/button
 *  renders the Button preview (the hand-rolled reader passed a bare string
 *  to componentPreviewHtmlInline and always rendered the not-found div —
 *  see docs/fix-plans/design-mcp-component-preview-arg-bug.md). */
function previewName(slug: string): string {
  const key = Object.keys(COMPONENT_DEFS).find(k => k.toLowerCase() === slug.toLowerCase());
  return key ?? slug;
}

/** The SDK handler does not add CORS headers — re-apply the worker's own. */
function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(res.body, { status: res.status, headers });
}

// ─── HTTP handler (Streamable HTTP) ─────────────────────────────────────────

function mcpError(id: any, code: number, message: string) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, ...metaEnvelope(), error: { code, message } }), {
    status: 400,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function handleRequest(request: Request, env?: Record<string, string | undefined>): Promise<Response> {
  const url = new URL(request.url);

  // Enterprise-Managed Authorization (Okta XAA) — opt-in via env. When
  // XAA_ISSUER or XAA_AUD is set, a present-but-invalid assertion is rejected.
  if (env?.XAA_ISSUER || env?.XAA_AUD) {
    const xaaErr = await guardXaa(request, { issuer: env.XAA_ISSUER, expectAud: env.XAA_AUD });
    if (xaaErr) return xaaErr;
  }

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Health check
  if (request.method === 'GET' && url.pathname === '/health') {
    return new Response(JSON.stringify({ status: 'healthy', components: Object.keys(COMP_LIST).length, tools: TOOLS.length }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // W3C DTCG token exchange format
  if (request.method === 'GET' && url.pathname === '/tokens.dtc.json') {
    return new Response(JSON.stringify(TOKENS_DTC), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // ─── Component Generation Capacitor Cache ────────────────────────────────
  // In-memory Map with TTL. For production, swap to KV via wrangler binding.
  const _cacheStore = new Map<string, { ts: number; ttl: number }>();
  function _cacheGet(key: string): boolean {
    const entry = _cacheStore.get(key);
    if (!entry) return false;
    if (Date.now() > entry.ts + entry.ttl) {
      _cacheStore.delete(key);
      return false;
    }
    return true;
  }
  function _cacheSet(key: string, ttlMs = 60_000) {
    _cacheStore.set(key, { ts: Date.now(), ttl: ttlMs });
  }

  // GET /api/cache/check?key=<sha256-hash>
  if (request.method === 'GET' && url.pathname === '/api/cache/check') {
    const key = url.searchParams.get('key') || '';
    const hit = _cacheGet(key);
    return new Response(JSON.stringify({ hit, key }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // POST /api/cache/store  body: { key: string, ttl?: number }
  if (request.method === 'POST' && url.pathname === '/api/cache/store') {
    try {
      const body = await request.json() as { key: string; ttl?: number };
      _cacheSet(body.key, body.ttl || 60_000);
      return new Response(JSON.stringify({ ok: true, key: body.key, ttl: body.ttl || 60_000 }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // Tool listing page (human-friendly)
  if (request.method === 'GET' && url.pathname === '/') {
    const toolList = TOOLS.map(t => `  <li><strong>${t.name}</strong> — ${t.description}</li>`).join('\n');
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>P31 Design System MCP</title><style>body{font-family:system-ui,sans-serif;background:#0A0A0F;color:#F5F5F7;max-width:800px;margin:60px auto;padding:0 24px;}h1{color:#00F0FF;}pre{background:rgba(255,255,255,0.04);padding:12px;border-radius:8px;overflow-x:auto;}code{font-family:monospace;color:#A78BFA;}li{margin:8px 0;}</style></head><body><h1>P31 Design System MCP</h1><p>Streamable HTTP endpoint. Send JSON-RPC requests via POST.</p><h2>Tools (${TOOLS.length})</h2><ul>${toolList}</ul><h2>Example</h2><pre><code>curl -X POST ${url.origin}/ \\\n  -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"token_resolve","arguments":{"path":"p31.color.accent.default"}}}'</code></pre><p style="color:rgba(245,245,247,0.3);margin-top:40px;font-size:12px;">P31 Labs &middot; Sovereign Design System &middot; ${new Date().toISOString()}</p></body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html;profile=mcp-app' } });
  }

  // MCP server discovery card (Smithery / registry scanners)
  if (request.method === 'GET' && url.pathname === '/.well-known/mcp/server-card.json') {
    const card = {
      $schema: 'https://schema.smithery.ai/server-card.json',
      name: 'p31-design-mcp',
      description: 'P31 Design System MCP Server — Token resolution, component schemas, layout generation, icon search, UI auditing for the P31 quantum design system',
      version: '0.1.0',
      serverInfo: { name: 'p31-design-mcp', version: '0.1.0' },
      endpoint: 'https://p31-design-mcp.trimtab-signal.workers.dev/mcp',
      transport: 'streamable-http',
      authentication: { type: 'none' },
      repository: 'https://github.com/p31labs/andromeda',
      homepage: 'https://p31ca.org',
      keywords: ['design-system','components','layout','tokens','ui-audit','p31','neuroinclusive'],
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      resources: [
        { uri: 'design://tokens', name: 'Design Tokens', description: 'P31 design tokens (DTCG 2.0). Append /path for a specific token.', mimeType: 'application/json' },
        { uri: 'design://components', name: 'Component Registry', description: 'P31 component definitions with props, slots, and tokens.', mimeType: 'application/json' },
        { uri: 'design://icons', name: 'Icon Catalog', description: 'P31 icon pack manifest (regular + advanced). Append /id for a single icon.', mimeType: 'application/json' },
      ],
      prompts: [
        { name: 'generate_landing_page', description: 'Generate a landing page layout with hero section, product grid, and CTA block.' },
        { name: 'generate_product_grid', description: 'Generate a responsive card grid of products.' },
        { name: 'generate_research_page', description: 'Generate a card grid of research papers.' },
      ],
    };
    return new Response(JSON.stringify(card), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  // POST — MCP JSON-RPC
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: { 'Allow': 'POST, GET, OPTIONS' } });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return mcpError(null, -32700, 'Parse error');
  }

  const { id, method } = body || {};

  // ── Deprecated legacy-compat branch (pre-SEP-2575) ────────────────────
  // Intercepted BEFORE the SDK handler and kept byte-identical to the
  // hand-rolled era: initialize pins 2024-11-05 with
  // tools.listChanged: false; initialized is acknowledged 204. Do NOT
  // extend; new clients negotiate via server/discover.
  if (method === 'initialize') {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'p31-design-mcp', version: '0.1.0' },
      },
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (method === 'initialized' || method === 'notifications/initialized') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
  // ── End deprecated legacy-compat branch ────────────────────────────────

  // Everything else (server/discover, tools/*, resources/*, prompts/*, and
  // claim-less legacy follow-up traffic) is served by the SDK v2 handler.
  // The body was read above, so hand it over as parsedBody (the SDK never
  // re-reads the consumed stream).
  return withCors(await mcpHandler.fetch(request, { parsedBody: body ?? undefined }));
}

export default {
  async fetch(request: Request, env?: Record<string, string | undefined>): Promise<Response> {
    return handleRequest(request, env);
  },
};
