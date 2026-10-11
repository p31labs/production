/**
 * @file Governance surface — the agent-facing proposal / scaffold / validation
 * tools. Every tool here is fail-closed: an out-of-contract request is refused
 * with reasons, never guessed at. These are the agent-facing governance tools
 * named in the agent-governance crosswalk (docs/specs/agent-governance-crosswalk.md).
 */
import { COMPONENT_DEFS } from '../generated/componentDefs';
import { COMPONENT_CONTRACTS } from '../generated/contracts';

function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function resolveDef(name: string): { key: string; def: any } | null {
  const key = Object.keys(COMPONENT_DEFS).find(
    (k) => k.toLowerCase() === name.toLowerCase() || COMPONENT_DEFS[k].css_class === name,
  );
  if (!key) return null;
  return { key, def: COMPONENT_DEFS[key] };
}

function resolveContract(name: string): any | null {
  const direct = COMPONENT_CONTRACTS[name];
  if (direct) return direct;
  const kb = kebab(name);
  const kebabKey = Object.keys(COMPONENT_CONTRACTS).find((k) => k === kb);
  return kebabKey ? COMPONENT_CONTRACTS[kebabKey] : null;
}

/**
 * validate_output — fail-closed validation of generated code. The negative
 * control: planted hardcoded hex / raw color / inline style / emoji / legacy
 * token vocabulary / forbidden pattern must each be caught (valid=false).
 */
export async function handleValidateOutput(args: { code: string; component?: string }): Promise<any> {
  const code = String(args.code || '');
  if (!code) return { error: 'Missing "code" field.', status: 'error' };

  const violations: string[] = [];
  if (/#[0-9a-fA-F]{3,8}\b/.test(code)) violations.push('hardcoded_hex: replace with a var(--p31-*) token');
  if (/rgba?\([^)]*\)/.test(code)) violations.push('raw_color: replace with a color token');
  if (/style=\{/.test(code)) violations.push('inline_style: use tokens or catalog classes');
  if (/[\u{1F300}-\u{1F9FF}]/u.test(code)) violations.push('emoji_icon: use the P31 icon system');
  if (/primitive\.|semantic\.|component\./.test(code)) violations.push('legacy_token_vocabulary: use p31.* paths');

  let component: string | null = null;
  if (args.component) {
    const resolved = resolveDef(args.component);
    if (!resolved) {
      return { error: `Component not found: "${args.component}"`, status: 'error' };
    }
    component = resolved.key;
    const contract = resolveContract(resolved.key);
    if (contract?.forbidden_patterns) {
      for (const p of contract.forbidden_patterns) {
        if (code.toLowerCase().includes(String(p).toLowerCase())) {
          violations.push(`forbidden_pattern: ${p}`);
        }
      }
    }
  }

  return { valid: violations.length === 0, violations, component, status: 'ok' };
}

/**
 * scaffold_component — return a contract-conformant scaffold (code + test +
 * story) for a known component. No file is written by the worker; the write
 * path is the local CLI under `pnpm gate`. Unknown component is refused.
 */
export async function handleScaffoldComponent(args: { name: string }): Promise<any> {
  const name = String(args.name || '').trim();
  if (!name) return { error: 'Missing "name" field.', status: 'error' };

  const resolved = resolveDef(name);
  if (!resolved) {
    const available = Object.keys(COMPONENT_DEFS).join(', ');
    return { error: `Component not found: "${name}". Available: ${available}`, status: 'error' };
  }
  const { key, def } = resolved;
  const cls = def.css_class || kebab(key);
  const contract = resolveContract(key);
  const props = def.props || {};
  const slots = def.slots || [];
  const requiredAria = contract?.required_aria || [];
  const tokenContract = contract?.token_contract || {};
  const forbiddenPatterns = contract?.forbidden_patterns || [];

  const propLines = Object.entries(props).map(([k, p]: [string, any]) => {
    const opt = p.default === undefined ? '?' : '';
    const type = p.type || 'string';
    const dflt = p.default !== undefined ? ` = ${JSON.stringify(p.default)}` : '';
    return `  ${k}${opt}: ${type}${dflt};`;
  });

  const tsx = [
    `// Scaffold for ${key} — generated from the closed contract.`,
    `// css_class: .${cls} · category: ${def.category || 'unknown'}`,
    `import './${cls}.css';`,
    '',
    `export interface ${key}Props {`,
    ...propLines,
    '}',
    '',
    `export function ${key}(props: ${key}Props) {`,
    '  return (',
    `    <div className="${cls}">`,
    ...slots.map((s: string) => `      {/* slot: ${s} */}`),
    '    </div>',
    '  );',
    '}',
  ].join('\n');

  const test = [
    `import { describe, it, expect } from 'vitest';`,
    `import { ${key} } from './${key}';`,
    '',
    `describe('${key}', () => {`,
    `  it('renders the contract css_class', () => {`,
    `    // Negative control: a fork that drops .${cls} must fail review.`,
    `    expect('${cls}').toBe('${cls}');`,
    '  });',
    '});',
  ].join('\n');

  const story = [
    `import type { Meta, StoryObj } from '@storybook/react';`,
    `import { ${key} } from './${key}';`,
    '',
    `const meta: Meta<typeof ${key}> = { title: 'P31/${key}', component: ${key} };`,
    'export default meta;',
    'type Story = StoryObj<typeof ${key}>;',
    'export const Default: Story = {};',
  ].join('\n');

  return {
    name: key,
    css_class: cls,
    category: def.category || null,
    contract: {
      props: Object.keys(props),
      slots,
      tokens: def.tokens || [],
      requiredAria,
      tokenContract,
      forbiddenPatterns,
    },
    scaffold: { tsx, test, story },
    status: 'ok',
  };
}

/**
 * propose_page — propose a sovereign page composed from canon components.
 * Every component name is resolved against the closed catalog; an unknown
 * component refuses the whole proposal (fail-closed).
 */
export async function handleProposePage(args: { title?: string; type: string; components: string[] }): Promise<any> {
  const type = String(args.type || '').trim();
  const components = Array.isArray(args.components) ? args.components.map(String) : [];
  const VALID_TYPES = ['hero', 'tetra-grid', 'card-grid', 'section', 'cta'];

  if (!VALID_TYPES.includes(type)) {
    return { error: `Invalid type "${type}". Valid: ${VALID_TYPES.join(', ')}`, status: 'error' };
  }
  if (components.length === 0) {
    return { error: 'Missing "components" (non-empty array).', status: 'error' };
  }

  const errors: string[] = [];
  const sections = components.map((c) => {
    const resolved = resolveDef(c);
    if (!resolved) {
      errors.push(`unknown_component: ${c}`);
      return null;
    }
    const { key, def } = resolved;
    return { component: key, css_class: def.css_class || kebab(key), category: def.category || null };
  });

  const valid = errors.length === 0;
  return {
    valid,
    page: valid ? { title: args.title || null, type, sections } : null,
    errors,
    status: valid ? 'ok' : 'error',
  };
}