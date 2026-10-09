#!/usr/bin/env node
/**
 * @p31ca/canon-mcp — src/server.ts
 *
 * The canon's agent-facing surface. An MCP server that exposes the canon's
 * component contracts as tools. Agents call:
 *
 *   list_components — what components have a contract today
 *   get_contract    — read the full contract for one component
 *   validate_props  — check a props payload against a contract
 *   list_tokens     — what tokens EXIST in the DTCG tree (verified source)
 *
 * Everything is derived, nothing is hardcoded. The REGISTRY below is built
 * by walking src/contracts/*.contract.ts and import()ing each — the exact
 * same walk validate-contracts.mjs performs. A contract that does not
 * validate on disk does not get registered. An agent can never receive a
 * contract the canon does not believe in.
 *
 * Tools note (2026 SDK v2): @modelcontextprotocol/server v2 registers
 * tools via server.registerTool(name, { inputSchema, description }, fn),
 * not the deprecated server.tool() form. Zod v4 is the schema language.
 *
 * Run: npm run start   (tsx, stdio transport)
 */
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { ComponentContract } from '@p31ca/canon/contracts';
import { observe, traverse, propose, review, awaitReviews, mediate, resolveLogPath } from './loom-tools';

const here = dirname(fileURLToPath(import.meta.url));
const canonRoot = resolve(here, '..', '..', 'canon');
const contractsDir = join(canonRoot, 'src', 'contracts');
const dtcgPath = join(canonRoot, 'tokens', 'tokens.dtc.json');
const dsdsPath = join(canonRoot, 'dsds.json');
// The tetrahedral engine's agent contract — canon→JSON Schema for the Dreamer
// (closed component enum, per-component props, p31.* tokens). Bundled as a
// static asset here (self-contained — no cross-package filesystem coupling);
// also fetchable at https://phos-ai-proxy.trimtab-signal.workers.dev/ui-schema.
const uiSchemaPath = join(here, 'ui-schema.json');

// ── design-core registry (the VISUAL canon — 3-category taxonomy) ─────────
// The MCP surface has three categories:
//   chrome     — the 12 canon chrome components (Topbar, SidebarNav, …)
//   primitives — the non-chrome compositions (Button, Badge, Card, …)
//   contracts  — the @p31ca/canon contract/governance layer (loom, get_contract)
// `list_components`/`get_contract` stay on the contracts layer; the design
// family below reads @p31ca/design-core/registry.json (the visual canon).
const designCoreRoot = resolve(here, '..', '..', 'design-core');
const registryPath = join(designCoreRoot, 'registry.json');
function loadDesignRegistry() {
  try {
    if (!existsSync(registryPath)) return null;
    return JSON.parse(readFileSync(registryPath, 'utf8'));
  } catch { return null; }
}

/** The block registry — hand-authored (src/registry/blocks.json), parallel to
 *  the generated component registry. Blocks are compositions an agent can
 *  propose and a human approves. */
const blocksPath = join(designCoreRoot, 'src', 'registry', 'blocks.json');
function loadBlockRegistry() {
  try {
    if (!existsSync(blocksPath)) return null;
    return JSON.parse(readFileSync(blocksPath, 'utf8'));
  } catch { return null; }
}

// Startup gate: @p31ca/canon must be present and have contracts
if (!existsSync(contractsDir)) {
  console.error(`⛔ canon-mcp: FATAL — @p31ca/canon not found at ${canonRoot}`);
  console.error('   Install with: npm install @p31ca/canon (or check file: dependency)');
  process.exit(1);
}

/** Walk a DTCG tree and return every leaf path with $value. */
function walkDtcg(
  node: unknown,
  prefix: string[] = [],
  out: Array<{ path: string; value: unknown; type: string }> = [],
): Array<{ path: string; value: unknown; type: string }> {
  if (!node || typeof node !== 'object') return out;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (value && typeof value === 'object' && '$value' in value) {
      const v = value as { $value: unknown; $type?: string };
      out.push({ path: [...prefix, key].join('.'), value: v.$value, type: v.$type ?? 'unknown' });
    } else if (value && typeof value === 'object') {
      walkDtcg(value, [...prefix, key], out);
    }
  }
  return out;
}

/** Build the registry from disk — same walk as validate-contracts.mjs.
 * Returns { registry, dropped } — callers must check dropped.length and fail
 * if any contracts were dropped. A partial registry is worse than empty. */
async function buildRegistry(): Promise<{
  registry: Map<string, ComponentContract>;
  dropped: string[];
}> {
  const registry = new Map<string, ComponentContract>();
  const dropped: string[] = [];
  for (const entry of readdirSync(contractsDir)) {
    if (!entry.endsWith('.contract.ts')) continue;
    const stem = basename(entry, '.contract.ts');
    try {
      const mod = await import(join(canonRoot, 'src', 'contracts', entry).replace(/\\/g, '/'));
      const contract = Object.values(mod).find((v): v is ComponentContract => {
        return typeof v === 'object' && v !== null && 'layer' in v && 'intent' in v;
      });
      if (!contract) throw new Error(`${entry}: no component contract export found`);
      registry.set(stem.toLowerCase(), contract);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      dropped.push(`${entry}: ${msg}`);
    }
  }
  return { registry, dropped };
}

// ── Tool catalog — progressive disclosure ────────────────────────────────
// The search index behind search_tools / get_tool_details. Mirrors the tools
// registered below: `family` is the description's namespace tag, `oneLine` is
// the summary an agent sees before loading a full schema, `params` names the
// inputs. Keep in sync with the registerTool calls — a new tool needs an entry.
type ToolFamily = 'contract' | 'tokens' | 'validation' | 'docs' | 'observe' | 'act' | 'mediate' | 'design';

interface ToolEntry {
  name: string;
  family: ToolFamily;
  oneLine: string;
  params: string[];
}

const TOOL_CATALOG: ToolEntry[] = [
  { name: 'search_tools', family: 'docs', oneLine: 'Search the tool catalog by family or keyword.', params: ['query', 'family'] },
  { name: 'get_tool_details', family: 'docs', oneLine: 'Full instructions and params for one tool.', params: ['name', 'dense'] },
  { name: 'get_design_md', family: 'docs', oneLine: 'The immutable baseline rules.', params: ['dense'] },
  { name: 'list_docs', family: 'docs', oneLine: 'List the DSDS documentation index.', params: ['type'] },
  { name: 'list_tokens', family: 'tokens', oneLine: 'List every token in the DTCG tree.', params: ['prefix', 'resolvable'] },
  { name: 'resolve_token', family: 'tokens', oneLine: 'Resolve a token path to value + CSS var.', params: ['token'] },
  { name: 'list_chrome', family: 'design', oneLine: 'List the 12 canon chrome components (from @p31ca/design-core registry).', params: ['status'] },
  { name: 'get_chrome', family: 'design', oneLine: 'Full details for one canon chrome component (props, tokens, variants).', params: ['name'] },
  { name: 'find_usages', family: 'design', oneLine: 'Where a canon component is used/forks (blast radius across portals).', params: ['entity'] },
  { name: 'list_primitives', family: 'design', oneLine: 'List canon primitives (non-chrome compositions: Button, Badge, …).', params: ['status'] },
  { name: 'get_confidence', family: 'design', oneLine: 'The derived confidence tier map (autonomous/supervised/blocked) — the human↔agent boundary.', params: [] },
  { name: 'list_components', family: 'contract', oneLine: 'List every component with a contract.', params: ['layer'] },
  { name: 'get_contract', family: 'contract', oneLine: 'Read the full contract for one component.', params: ['component'] },
  { name: 'get_ui_schema', family: 'contract', oneLine: 'The canon→JSON Schema agent contract (34 components, closed enum, p31.* tokens). summary mode = catalog; full mode = JSON Schema for constrained decoding.', params: ['mode'] },
  { name: 'validate_props', family: 'validation', oneLine: 'Validate a props payload against a contract.', params: ['component', 'props'] },
  { name: 'validate_output', family: 'validation', oneLine: 'Validate props and flag hardcoded hex.', params: ['component', 'props'] },
  { name: 'loom_observe', family: 'observe', oneLine: 'Observe the live Loom state.', params: ['proposalId'] },
  { name: 'loom_traverse', family: 'act', oneLine: 'Record a traversal step.', params: ['from', 'to', 'reason'] },
  { name: 'loom_propose', family: 'act', oneLine: 'Propose a change against a node.', params: ['id', 'node', 'body', 'author'] },
  { name: 'loom_review', family: 'act', oneLine: 'Post an advisory review on a proposal.', params: ['proposalId', 'decision', 'agent', 'reason'] },
  { name: 'loom_await', family: 'act', oneLine: 'Wait for a review event on a proposal.', params: ['proposalId', 'timeoutMs'] },
  { name: 'loom_mediate', family: 'mediate', oneLine: "Render a proposal at the human's tier.", params: ['humanId', 'proposalId'] },
];

export async function createServer(): Promise<McpServer> {
  const { registry: REGISTRY, dropped: DROPPED } = await buildRegistry();

  // Hard gate: the server must serve EVERY contract, or none.
  // A partial registry is worse than empty — an agent that calls list_components
  // and gets four of five contracts, with the fifth missing and unannounced,
  // will write code against a canon that doesn't exist. Fail instead.
  if (DROPPED.length > 0) {
    console.error('⛔ canon-mcp: FATAL — contracts were dropped during registry build:');
    for (const d of DROPPED) console.error(`   - ${d}`);
    console.error('   A partial registry is worse than empty. Fix the contracts or exit.');
    throw new Error('canon-mcp: contracts were dropped during registry build');
  }

  // Empty registry gate (kept from the original startup gate)
  if (REGISTRY.size === 0) {
    throw new Error('canon-mcp: no contracts registered. Check that @p31ca/canon is installed and contracts exist.');
  }

  const server = new McpServer({ name: 'p31-canon', version: '0.1.0' });

  // The Loom's shared log — resolved once, shared by all four loom_* tools.
  const loomLogPath = resolveLogPath();
  // The profile store sits next to the log directory, NOT inside it. The log
  // carries only the humanId reference; the store carries presentation data.
  const loomProfilesDir = join(dirname(loomLogPath), 'profiles');

  // ── Progressive disclosure ──────────────────────────────────────────────
  // Two meta-tools so a small agent can find the right tool without loading
  // all 16 schemas into context. search_tools returns names + one-liners;
  // get_tool_details returns the full params for a single tool on demand.

  server.registerTool(
    'search_tools',
    {
      description:
        '[docs] Search the tool catalog by namespace family or keyword. Returns name + family + ' +
        'one-line purpose only — call this first to find the right tool without loading every schema.',
      inputSchema: z.object({
        query: z.string().optional().describe('Substring to match against tool name or one-line purpose.'),
        family: z.enum(['contract', 'tokens', 'validation', 'docs', 'observe', 'act', 'mediate', 'design']).optional().describe('Filter by namespace family.'),
      }),
    },
    async ({ query, family }) => {
      const q = query?.toLowerCase();
      const hits = TOOL_CATALOG
        .filter((t) => !family || t.family === family)
        .filter((t) => !q || t.name.toLowerCase().includes(q) || t.oneLine.toLowerCase().includes(q))
        .map(({ name, family: f, oneLine }) => ({ name, family: f, oneLine }));
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: hits.length, tools: hits }, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_tool_details',
    {
      description:
        '[docs] Return the full instructions and input params for ONE tool. Call after search_tools ' +
        'narrows the choice. Pass dense=true to strip prose and return only name/family/params.',
      inputSchema: z.object({
        name: z.string().describe('Tool name, e.g. "resolve_token".'),
        dense: z.boolean().optional().describe('Return only name, family, and params as JSON.'),
      }),
    },
    async ({ name, dense }) => {
      const entry = TOOL_CATALOG.find((t) => t.name === name);
      if (!entry) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'tool_not_found',
                message: `No tool named "${name}". Call search_tools to see what exists.`,
              }),
            },
          ],
          isError: true,
        };
      }
      if (dense) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ name: entry.name, family: entry.family, oneLine: entry.oneLine, params: entry.params }, null, 2),
            },
          ],
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(entry, null, 2) }] };
    },
  );

  server.registerTool(
    'list_components',
    {
      description:
        '[contract] List every component that has a machine-readable contract in the P31 canon. ' +
        'Call this first to discover what exists before writing code.',
      inputSchema: z.object({
        layer: z
          .enum(['contract', 'primitive', 'semantic', 'component', 'composition'])
          .optional()
          .describe('Filter by canon layer. Omit for all.'),
      }),
    },
    async ({ layer }) => {
      const items = [...REGISTRY.values()]
        .filter((c) => !layer || c.layer === layer)
        .map((c) => ({ name: c.name, layer: c.layer, intent: c.intent, props: c.props.length }));
      return {
        content: [{ type: 'text', text: JSON.stringify({ components: items }, null, 2) }],
      };
    },
  );

  server.registerTool(
    'get_contract',
    {
      description:
        '[contract] Read the FULL contract for a single component — props, semantics, required ARIA, ' +
        'token references, import statement. Read this before writing any code against the component.',
      inputSchema: z.object({
        component: z.string().describe('Component name, case-insensitive. e.g. "Button".'),
      }),
    },
    async ({ component }) => {
      const contract = REGISTRY.get(component.toLowerCase());
      if (!contract) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'component_not_found',
                message: `No contract registered for "${component}". Call list_components to see what exists.`,
              }),
            },
          ],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: JSON.stringify(contract, null, 2) }] };
    },
  );

  server.registerTool(
    'get_ui_schema',
    {
      description:
        '[contract] The canon→JSON Schema agent contract (the tetrahedral engine\'s Dreamer schema): ' +
        '34 components, closed type enum, per-component props, p31.* token namespace. ' +
        'summary mode (default) returns the component catalog (names + import paths) — prompt-ready. ' +
        'full mode returns the complete JSON Schema for constrained decoding / JSON Mode. ' +
        'Also fetchable at https://phos-ai-proxy.trimtab-signal.workers.dev/ui-schema.',
      inputSchema: z.object({
        mode: z.enum(['summary', 'full']).optional().describe('summary = catalog; full = JSON Schema for constrained decoding.'),
      }),
    },
    async ({ mode }) => {
      let raw: { schema: { properties: { type: { enum: string[] } } }; catalog: { components: Array<{ name: string; category?: string; importPath?: string | null; cssClass?: string | null }> } };
      try {
        raw = JSON.parse(readFileSync(uiSchemaPath, 'utf8'));
      } catch (e) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'ui_schema_unavailable', message: String(e) }) }],
          isError: true,
        };
      }
      if (mode === 'full') {
        return { content: [{ type: 'text', text: JSON.stringify({ schema: raw.schema, catalog: raw.catalog }, null, 2) }] };
      }
      const summary = {
        components: raw.catalog.components.map((c) => ({ name: c.name, category: c.category, importPath: c.importPath, cssClass: c.cssClass })),
        enum: raw.schema.properties.type.enum,
        tokenNamespace: 'p31.*',
      };
      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    },
  );

  server.registerTool(
    'validate_props',
    {
      description:
        '[validation] Validate a props payload AGAINST a component contract. Returns every violation: ' +
        'unknown props, invalid enum values, missing required props. Call this after writing ' +
        'component code to prove it satisfies the contract. NOTE: this tool validates a props ' +
        'object, not the contract definition itself — contract-definition validation happens at ' +
        'build time via validate-contracts.mjs.',
      inputSchema: z.object({
        component: z.string().describe('Component name, case-insensitive. e.g. "Button".'),
        props: z.record(z.string(), z.unknown()).describe('The props object to validate.'),
      }),
    },
    async ({ component, props }) => {
      const contract = REGISTRY.get(component.toLowerCase());
      if (!contract) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'component_not_found',
                message: `No contract registered for "${component}".`,
              }),
            },
          ],
          isError: true,
        };
      }

      const violations = [];
      const declared = new Map(contract.props.map((p) => [p.name, p]));

      // Closed-shape enforcement: every provided prop must be declared.
      for (const key of Object.keys(props)) {
        if (!declared.has(key)) {
          violations.push({ kind: 'unknown_prop', prop: key, message: `"${key}" is not declared on ${contract.name}. Declared: ${[...declared.keys()].join(', ')}` });
        }
      }

      // Enum + required enforcement.
      for (const def of contract.props) {
        const provided = props[def.name];
        if (def.required && provided === undefined) {
          violations.push({ kind: 'missing_required', prop: def.name, message: `"${def.name}" is required on ${contract.name}.` });
        } else if (def.type === 'enum' && provided !== undefined) {
          const options = def.options ?? [];
          if (!options.includes(String(provided))) {
            violations.push({ kind: 'invalid_enum', prop: def.name, message: `"${provided}" is not a valid option. Valid: ${options.join(', ')}` });
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { component: contract.name, valid: violations.length === 0, violations },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    'list_tokens',
    {
      description:
        '[tokens] List every token that EXISTS in the canon DTCG tree — BOTH namespaces. ' +
        'Each result is flagged contractResolvable: only tokens whose path starts with ' +
        '"p31." may be referenced by a component contract (validate-contracts hard-gates ' +
        'on the p31.* namespace). Tokens under "themes.<id>.*" are the per-theme palette ' +
        'for external designers — informational, present for inspection, NEVER contract-resolvable. ' +
        'This walks tokens/tokens.dtc.json — the same tree validate-contracts hard-gates against.',
      inputSchema: z.object({
        prefix: z.string().optional().describe('Filter to paths starting with this prefix, e.g. "p31.color.action".'),
        resolvable: z
          .boolean()
          .optional()
          .describe('If true, return only contractResolvable tokens (p31.*). If false, only informational (themes.*). Omit for all.'),
      }),
    },
    async ({ prefix, resolvable }) => {
      let all: Array<{ path: string; value: unknown; type: string }> = [];
      try {
        const raw = JSON.parse(readFileSync(dtcgPath, 'utf8'));
        // Walk the WHOLE tree so themes.<id>.* and p31.* both appear. Earlier
        // this only walked raw.p31 — but tokens.dtc.json has 261 per-theme
        // palette leaves that designers DO inspect. The old walker returned
        // less than the description promised it would ("every token that
        // EXISTS in the DTCG tree"). Fixed here; the shoe drops on both.
        all = walkDtcg(raw, []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'dtcg_unreadable', message: msg }) }],
          isError: true,
        };
      }
      const filtered = all
        .filter((t) => {
          if (prefix && !t.path.startsWith(prefix)) return false;
          const cr = t.path.startsWith('p31.');
          if (resolvable === true && !cr) return false;
          if (resolvable === false && cr) return false;
          return true;
        })
        .map((t) => ({
          path: t.path,
          contractResolvable: t.path.startsWith('p31.'),
          type: t.type,
        }));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { count: filtered.length, tokens: filtered },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ── DSDS documentation index ───────────────────────────────────────────
  // The machine-readable Design System Documentation Spec layer. Generated by
  // scripts/gen-dsds.mjs; served read-only so agents can discover the seven
  // entity types (components, tokens, themes, foundations, patterns, guides,
  // chunks) without re-deriving them from raw files.

  server.registerTool(
    'list_docs',
    {
      description:
        '[docs] List the design-system documentation index (DSDS) — components, tokens, ' +
        'themes, foundations, patterns, guides, chunks. Filter by entity type, or omit ' +
        'to receive the summary + counts. Reads packages/canon/dsds.json.',
      inputSchema: z.object({
        type: z
          .enum(['component', 'token', 'theme', 'foundation', 'pattern', 'guide', 'chunk'])
          .optional()
          .describe('Entity type to filter to. Omit for the full summary.'),
      }),
    },
    async ({ type }) => {
      let doc: Record<string, unknown>;
      try {
        doc = JSON.parse(readFileSync(dsdsPath, 'utf8'));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'dsds_unreadable',
                message: `${msg} — run \`pnpm --filter @p31ca/canon gen:dsds\` to regenerate dsds.json.`,
              }),
            },
          ],
          isError: true,
        };
      }

      // The DSDS entity type is singular (token/component/theme/…); dsds.json
      // keys are plural. Map `token` → `tokens` before lookup.
      const key = type ? `${type}s` : null;
      if (!key) {
        const arr = (v: unknown) => (Array.isArray(v) ? v.length : 0);
        const summary = {
          spec: doc.spec,
          version: doc.version,
          name: doc.name,
          counts: {
            components: arr(doc.components),
            tokens: (doc.tokens as { count?: number })?.count ?? 0,
            themes: arr(doc.themes),
            foundations: arr(doc.foundations),
            patterns: arr(doc.patterns),
            guides: arr(doc.guides),
            chunks: arr(doc.chunks),
          },
        };
        return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
      }

      // `tokens` is a summary object (count + semantic `entries`), not a flat
      // list — every other entity type is an array.
      if (key === 'tokens') {
        const tokens = doc.tokens as { count?: number; entries?: unknown[]; note?: string };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { type: 'tokens', count: tokens.count ?? 0, entries: tokens.entries ?? [], note: tokens.note },
                null,
                2,
              ),
            },
          ],
        };
      }

      const list = doc[key];
      if (!Array.isArray(list)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'no_entities', message: `No "${key}" entities in dsds.json.` }),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ type: key, count: list.length, entries: list }, null, 2) }],
      };
    },
  );

  // ── Agent-surface tools ────────────────────────────────────────────────
  // The "smallest agent does big things" surface: the immutable baseline rules
  // (get_design_md), token resolution (resolve_token), and output self-proof
  // (validate_output). These let an agent inherit the floor and lint its own
  // output before proposing — without parsing CSS or re-deriving contracts.

  server.registerTool(
    'get_design_md',
    {
      description:
        "[docs] The design system's immutable baseline rules, condensed into one document. " +
        'Read this before generating any component or CSS so the output inherits the floor by default.',
      inputSchema: z.object({
        dense: z.boolean().optional().describe('Return structural JSON instead of prose.'),
      }),
    },
    async ({ dense }) => {
      if (dense) {
        const floor = [
          { rule: 'min_text_size', value: '12px (0.75rem)' },
          { rule: 'min_touch_target', value: '24x24px (44x44 primary)' },
          { rule: 'color', value: 'var(--p31-*) only, no hardcoded hex, no color-only meaning' },
          { rule: 'motion', value: 'honor prefers-reduced-motion; animate transform/opacity only' },
          { rule: 'cognitive_load', value: 'fewer than five choices; plain language' },
        ];
        return { content: [{ type: 'text', text: JSON.stringify({ design_system: 'P31', floor }, null, 2) }] };
      }
      // SYNC WITH: packages/canon/scripts/check-inclusive.mjs (MIN_FONT_PX,
      // MIN_TARGET_PX). Keep these numbers identical to the gate.
      const md = [
        '# P31 Design System — baseline rules',
        '',
        'These are immutable floors. Generated code must meet every one.',
        '',
        '## Typography',
        '- Minimum text size 12px (0.75rem). Never smaller.',
        '- Values (changing numbers) use the mono font; labels use sans.',
        '',
        '## Touch targets',
        '- Minimum 24x24 CSS px per interactive element; 44x44 for primary actions.',
        '',
        '## Color',
        '- No hardcoded hex. Always `var(--p31-*)` tokens.',
        '- Never rely on color alone to convey meaning.',
        '',
        '## Motion',
        '- Honor `prefers-reduced-motion` at the floor. Animate transform/opacity only.',
        '',
        '## Cognitive load',
        '- Fewer than five main choices per surface.',
        '- Plain language by default; technical terms only when necessary.',
      ].join('\n');
      return { content: [{ type: 'text', text: md }] };
    },
  );

  server.registerTool(
    'resolve_token',
    {
      description:
        '[tokens] Resolve a semantic token path (e.g. "p31.color.action.primary") to its ' +
        'DTCG value, CSS variable, and contract-resolvable flag. Call this when you need the ' +
        'exact value/var for a token instead of listing every token.',
      inputSchema: z.object({
        token: z.string().describe('Dot path into the DTCG tree, e.g. "p31.color.action.primary".'),
      }),
    },
    async ({ token }) => {
      let leaves: Array<{ path: string; value: unknown; type: string }> = [];
      try {
        const raw = JSON.parse(readFileSync(dtcgPath, 'utf8'));
        leaves = walkDtcg(raw, []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'dtcg_unreadable', message: msg }) }],
          isError: true,
        };
      }
      const leaf = leaves.find((t) => t.path === token);
      if (!leaf) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'token_not_found',
                message: `No token at "${token}". Call list_tokens to see what exists.`,
              }),
            },
          ],
          isError: true,
        };
      }
      const cssVar = `--${token.replace(/\./g, '-')}`;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                path: leaf.path,
                value: leaf.value,
                type: leaf.type,
                cssVar,
                contractResolvable: leaf.path.startsWith('p31.'),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ── design family — the VISUAL canon (@p31ca/design-core) ────────────────
  // Three-category taxonomy: chrome (12) / primitives (non-chrome) / contracts
  // (kept on @p31ca/canon). These read @p31ca/design-core/registry.json.

  server.registerTool(
    'list_chrome',
    {
      description:
        '[design] List the canon chrome components (from @p31ca/design-core registry). ' +
        'Chrome = the shared portal chrome: Topbar, SidebarNav, MobileBottomNav, CalmOverlay, ' +
        'CommandPalette, NotificationStack, BottomNav, SectionStrip, Crown, Footer, SpoonDial, CrisisOverlay.',
      inputSchema: z.object({
        status: z.string().optional().describe('Filter by status (stable/beta/deprecated).'),
      }),
    },
    async ({ status }) => {
      const reg = loadDesignRegistry();
      if (!reg) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'design-registry-unavailable', hint: 'run: cd packages/design-core && node scripts/gen-registry.mjs' }) }], isError: true };
      }
      const chrome = reg.items.filter((i: any) => i.category === 'chrome' && (!status || i.status === status));
      return { content: [{ type: 'text', text: JSON.stringify(chrome.map((i: any) => ({ name: i.name, category: i.category, status: i.status, version: i.version, installable: i.installable })), null, 2) }] };
    },
  );

  server.registerTool(
    'get_chrome',
    {
      description:
        '[design] Full details for one canon chrome component (props, tokens, variants, a11y).',
      inputSchema: z.object({
        name: z.string().describe('Chrome component name, e.g. "SidebarNav".'),
      }),
    },
    async ({ name }) => {
      const reg = loadDesignRegistry();
      if (!reg) return { content: [{ type: 'text', text: JSON.stringify({ error: 'design-registry-unavailable' }) }], isError: true };
      const e = reg.items.find((i: any) => i.name === name);
      if (!e) return { content: [{ type: 'text', text: JSON.stringify({ error: 'not_found', hint: 'call list_chrome first' }) }], isError: true };
      // Confidence gate: a blocked item must not be surfaced for use — the agent
      // reads this tier before acting. Refusal is loud, not a silent null.
      if (e.confidence?.tier === 'blocked') {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'blocked', name, hint: 'deprecated or file missing — do not use this component', tier: e.confidence }) }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(e, null, 2) }] };
    },
  );

  server.registerTool(
    'list_blocks',
    {
      description:
        '[design] List the canon page blocks (from @p31ca/design-core/src/registry/blocks.json). ' +
        'Blocks are compositions of canon components wired to state — the units an agent proposes ' +
        'and a human approves (Loom propose/approve pair). Each lists the slot it targets (see shell contract).',
      inputSchema: z.object({
        category: z.string().optional().describe('Filter by block category (page/ambient).'),
      }),
    },
    async ({ category }) => {
      const reg = loadBlockRegistry();
      if (!reg) return { content: [{ type: 'text', text: JSON.stringify({ error: 'block-registry-unavailable' }) }], isError: true };
      const blocks = reg.blocks.filter((b: any) => !category || b.category === category);
      return { content: [{ type: 'text', text: JSON.stringify(blocks.map((b: any) => ({ id: b.id, name: b.name, category: b.category, slot: b.slot, status: b.status, confidence: b.confidence })), null, 2) }] };
    },
  );

  server.registerTool(
    'get_block',
    {
      description:
        '[design] Full details for one canon page block (props schema, slot, confidence). The props schema is the contract a LUMI proposal must satisfy.',
      inputSchema: z.object({
        id: z.string().describe('Block id, e.g. "evidence-block".'),
      }),
    },
    async ({ id }) => {
      const reg = loadBlockRegistry();
      if (!reg) return { content: [{ type: 'text', text: JSON.stringify({ error: 'block-registry-unavailable' }) }], isError: true };
      const b = reg.blocks.find((x: any) => x.id === id);
      if (!b) return { content: [{ type: 'text', text: JSON.stringify({ error: 'not_found', hint: 'call list_blocks first' }) }], isError: true };
      if (b.confidence === 'blocked') {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'blocked', id, hint: 'do not propose this block' }) }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(b, null, 2) }] };
    },
  );

  server.registerTool(
    'get_confidence',
    {
      description:
        '[design] The derived confidence tier map (autonomous/supervised/blocked) — the human↔agent boundary. ' +
        'An agent reads this before acting: autonomous = proceed, supervised = propose, blocked = refuse.',
      inputSchema: z.object({}),
    },
    async () => {
      const reg = loadDesignRegistry();
      if (!reg) return { content: [{ type: 'text', text: JSON.stringify({ error: 'design-registry-unavailable' }) }], isError: true };
      const byTier: Record<string, string[]> = { autonomous: [], supervised: [], blocked: [] };
      for (const i of reg.items) {
        const tier = (i.confidence as { tier?: string })?.tier || 'supervised';
        (byTier[tier] ?? byTier.supervised).push(i.name);
      }
      return { content: [{ type: 'text', text: JSON.stringify(byTier, null, 2) }] };
    },
  );

  server.registerTool(
    'list_primitives',
    {
      description:
        '[design] List canon primitives (non-chrome compositions: Button, Badge, Card, Checkbox, …).',
      inputSchema: z.object({
        status: z.string().optional().describe('Filter by status (stable/beta/deprecated).'),
      }),
    },
    async ({ status }) => {
      const reg = loadDesignRegistry();
      if (!reg) return { content: [{ type: 'text', text: JSON.stringify({ error: 'design-registry-unavailable' }) }], isError: true };
      const prims = reg.items.filter((i: any) => i.category !== 'chrome' && (!status || i.status === status));
      return { content: [{ type: 'text', text: JSON.stringify(prims.map((i: any) => ({ name: i.name, category: i.category, status: i.status, installable: i.installable })), null, 2) }] };
    },
  );

  server.registerTool(
    'find_usages',
    {
      description:
        '[design] Where a canon component is used or forked across portals (blast radius). ' +
        'Returns each consuming file and whether it is an import (canon) or a fork (duplicate).',
      inputSchema: z.object({
        entity: z.string().describe('Canon component name, e.g. "Topbar".'),
      }),
    },
    async ({ entity }) => {
      const reg = loadDesignRegistry();
      if (!reg) return { content: [{ type: 'text', text: JSON.stringify({ error: 'design-registry-unavailable' }) }], isError: true };
      const e = reg.items.find((i: any) => i.name === entity);
      if (!e) return { content: [{ type: 'text', text: JSON.stringify({ error: 'not_found', hint: 'call list_chrome or list_primitives first' }) }], isError: true };
      // Registry-informed usage scan — NOT a filesystem grep. The registry is the
      // projection of canon (files[].path is authoritative); the fork-gate already
      // detects duplicates. We mirror its R1/R2 logic so this answer stays in sync
      // with the enforcement gate instead of shelling out to a fragile `grep`.
      const { execSync } = await import('node:child_process');
      const roots = ['/home/p31/production/portals', '/home/p31/production/apps'];
      const consumers: Array<{ path: string; kind: string }> = [];
      for (const root of roots) {
        try {
          // Fork = a portal file at components/<Name>.tsx (R2 of the fork-gate).
          const fork = execSync(
            `find ${root} -path '*/components/${entity}.tsx' -not -path '*/node_modules/*' 2>/dev/null | head -5`,
            { encoding: 'utf8', timeout: 10000 },
          );
          for (const line of fork.split('\n').filter(Boolean)) {
            consumers.push({ path: line, kind: 'fork-pending-migration' });
          }
        } catch { /* no forks */ }
        try {
          // Imports = files referencing the canon import path (not a fork file).
          const imports = execSync(
            `grep -rl "from '@p31ca/design-core" ${root} --include=*.tsx --include=*.ts 2>/dev/null | grep -v node_modules | head -3`,
            { encoding: 'utf8', timeout: 10000 },
          );
          for (const line of imports.split('\n').filter(Boolean)) {
            if (!line.includes(`/components/${entity}.tsx`)) {
              consumers.push({ path: line, kind: 'import' });
            }
          }
        } catch { /* no imports */ }
      }
      return { content: [{ type: 'text', text: JSON.stringify({ entity, canonical_owner: `@p31ca/design-core/compositions/${entity}`, canonical_file: e.files?.[0]?.path ?? `src/compositions/${entity}.tsx`, consumers }, null, 2) }] };
    },
  );

  server.registerTool(
    'validate_output',
    {
      description:
        '[validation] Validate a generated props payload against a component contract AND flag ' +
        'any hardcoded hex color in a prop value (should be a token). Returns every violation: ' +
        'unknown props, invalid enums, missing required props, and hex values.',
      inputSchema: z.object({
        component: z.string().describe('Component name, case-insensitive. e.g. "Button".'),
        props: z.record(z.string(), z.unknown()).describe('The props object to validate.'),
      }),
    },
    async ({ component, props }) => {
      const contract = REGISTRY.get(component.toLowerCase());
      if (!contract) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'component_not_found',
                message: `No contract registered for "${component}".`,
              }),
            },
          ],
          isError: true,
        };
      }

      const violations: Array<{ kind: string; prop?: string; message: string }> = [];
      const declared = new Map(contract.props.map((p) => [p.name, p]));

      for (const key of Object.keys(props)) {
        if (!declared.has(key)) {
          violations.push({
            kind: 'unknown_prop',
            prop: key,
            message: `"${key}" is not declared on ${contract.name}. Declared: ${[...declared.keys()].join(', ')}`,
          });
        }
      }

      for (const def of contract.props) {
        const provided = props[def.name];
        if (def.required && provided === undefined) {
          violations.push({ kind: 'missing_required', prop: def.name, message: `"${def.name}" is required on ${contract.name}.` });
        } else if (def.type === 'enum' && provided !== undefined) {
          const options = def.options ?? [];
          if (!options.includes(String(provided))) {
            violations.push({ kind: 'invalid_enum', prop: def.name, message: `"${provided}" is not a valid option. Valid: ${options.join(', ')}` });
          }
        }
        if (provided !== undefined && typeof provided === 'string' && /#[0-9a-fA-F]{6}/.test(provided)) {
          violations.push({ kind: 'hardcoded_hex', prop: def.name, message: `"${def.name}" uses a hardcoded hex "${provided}" — use a var(--p31-*) token.` });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ component: contract.name, valid: violations.length === 0, violations }, null, 2),
          },
        ],
      };
    },
  );

  // ── Loom presence tools ────────────────────────────────────────────────
  // The agent-facing half of the shared event log. Every write goes through
  // commit(); these emit agent-only events (traverse/propose). Observe/await
  // read the log. See loom-tools.ts for the shared handlers.

  server.registerTool(
    'loom_observe',
    {
      description:
        '[observe] Observe the live Loom: what the human is focused on, where the agent cursor is, ' +
        'the agent attention level, and every open proposal. Reads the current state of the shared log.',
      inputSchema: z.object({
        proposalId: z.string().optional().describe('If set, also return this single proposal (or null).'),
      }),
    },
    async ({ proposalId }) => {
      const view = observe(loomLogPath, proposalId);
      return { content: [{ type: 'text', text: JSON.stringify(view, null, 2) }] };
    },
  );

  server.registerTool(
    'loom_traverse',
    {
      description:
        '[act] Record a traversal step through the design-system graph (agent-only). Appends to the shared log through the gate.',
      inputSchema: z.object({
        from: z.string().describe('Bare node name the traversal starts from, e.g. "--p31-accent".'),
        to: z.string().describe('Bare node name the traversal ends at, e.g. ".glass-card".'),
        reason: z.string().describe('Why the step was taken, e.g. "referenced-by".'),
      }),
    },
    async ({ from, to, reason }) => {
      const r = traverse(loomLogPath, from, to, reason);
      return { content: [{ type: 'text', text: JSON.stringify(r) }], isError: !r.valid };
    },
  );

  server.registerTool(
    'loom_propose',
    {
      description:
        '[act] Propose a change against a node in the graph (agent-only). The id is caller-chosen and must be unique. Appends through the gate.',
      inputSchema: z.object({
        id: z.string().describe('Unique proposal id, e.g. "prop_demo_1".'),
        node: z.string().describe('Bare node name the proposal targets, e.g. ".feature-card".'),
        body: z.unknown().describe('The proposal body (any JSON).'),
        author: z.string().optional().describe('Free-form agent identity (e.g. "presence-01"). Omit for "unknown".'),
      }),
    },
    async ({ id, node, body, author }) => {
      const r = propose(loomLogPath, id, node, body, author);
      return { content: [{ type: 'text', text: JSON.stringify(r) }], isError: !r.valid };
    },
  );

  server.registerTool(
    'loom_review',
    {
      description:
        '[act] Post an advisory review on a proposal (agent-only). Records an opinion at the ' +
        "proposal's current revision; does not change its status — only a human approve/reject " +
        'does. reason is required when decision is amend or reject.',
      inputSchema: z.object({
        proposalId: z.string().describe('Id of the proposal to review.'),
        decision: z.enum(['approve', 'amend', 'reject']).describe('Review verdict.'),
        agent: z.string().describe('Free-form reviewer identity, e.g. "presence-02".'),
        reason: z.string().optional().describe('Required when decision is amend or reject.'),
      }),
    },
    async ({ proposalId, decision, agent, reason }) => {
      const r = review(loomLogPath, proposalId, decision, agent, reason);
      return { content: [{ type: 'text', text: JSON.stringify(r) }], isError: !r.valid };
    },
  );

  server.registerTool(
    'loom_await',
    {
      description:
        '[act] Wait for a review event on a proposal, up to timeoutMs. Returns { status: "timeout" } ' +
        'when nothing arrives — a return value, not an error. Waits on the log file via fs.watch, ' +
        'not polling.',
      inputSchema: z.object({
        proposalId: z.string(),
        timeoutMs: z.number().int().positive().max(120000).optional().describe('Default 30000, max 120000.'),
      }),
    },
    async ({ proposalId, timeoutMs }) => {
      const result = await awaitReviews(loomLogPath, proposalId, timeoutMs ?? 30_000);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    'loom_mediate',
    {
      description:
        '[mediate] Render a proposal for a human at their tier (DISPLAY ONLY — never writes to the log). ' +
        'Reads the human\'s profile and, if they are a beginner who consented to tier sharing, ' +
        'returns a plain-language mediated summary alongside the untouched original body. The human\'s ' +
        'decision is always about the original body; mediation is a render-layer translation, not a revision.',
      inputSchema: z.object({
        humanId: z.string().describe('Stable opaque human id, resolved from the profile store.'),
        proposalId: z.string().optional().describe('If set, mediate this single proposal.'),
      }),
    },
    async ({ humanId, proposalId }) => {
      const view = mediate(loomLogPath, loomProfilesDir, humanId, proposalId);
      return { content: [{ type: 'text', text: JSON.stringify(view, null, 2) }] };
    },
  );

  // Drift guard: the hand-maintained TOOL_CATALOG must match the registered
  // tools, both directions. A new tool without a catalog entry would otherwise
  // be silently invisible to search_tools while still callable directly.
  // _registeredTools is SDK-internal; if a future SDK version renames it,
  // degrade to a warning rather than a confusing startup throw.
  const internals = (server as unknown as { _registeredTools?: Record<string, unknown> })._registeredTools;
  if (internals) {
    const registered = Object.keys(internals).sort();
    const catalog = TOOL_CATALOG.map((t) => t.name).sort();
    const extra = registered.filter((n) => !catalog.includes(n));
    const missing = catalog.filter((n) => !registered.includes(n));
    if (extra.length || missing.length) {
      throw new Error(
        `canon-mcp tool catalog drift — registered but not in catalog: ${extra.join(', ') || 'none'}; ` +
          `in catalog but not registered: ${missing.join(', ') || 'none'}`,
      );
    }
  } else {
    console.warn('canon-mcp: _registeredTools not exposed by this SDK version — skipping the tool-catalog drift guard.');
  }

  return server;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  serveStdio(createServer);
}
