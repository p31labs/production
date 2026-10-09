/**
 * renderer/catalog.test.ts — the canon catalog guardrail + fixed-schema mode.
 */
import { describe, expect, it } from 'vitest';
import { CANON_CATALOG, validateProps, resolveFixedSchema, type FixedSchemaLayout } from './catalog';

describe('canon A2UI catalog', () => {
  it('guards allowed props — disallowed props drop', () => {
    const def = CANON_CATALOG.MetricBadge;
    const cleaned = validateProps(def, { value: '4', label: 'Spoons', evil: 'x', onClick: 'y' });
    expect(cleaned).toEqual({ value: '4', label: 'Spoons' });
    expect('evil' in cleaned).toBe(false);
  });

  it('lists the canon compositions + the MCP Apps tier', () => {
    expect(Object.keys(CANON_CATALOG)).toEqual(expect.arrayContaining(['GlassPanel', 'MetricBadge', 'StatusBadge', 'Button', 'McpApp']));
  });

  it('exposes allowedProps per component (the guardrail surface)', () => {
    expect(CANON_CATALOG.StatusBadge.allowedProps).toEqual(['status', 'label']);
    expect(CANON_CATALOG.McpApp.allowedProps).toEqual(['resource', 'displayMode']);
  });
});

describe('fixed-schema mode (deterministic dashboards)', () => {
  it('fills {{ref}} data bindings into a pre-authored layout', () => {
    const layout: FixedSchemaLayout = {
      tree: [
        { type: 'MetricBadge', props: { label: 'Energy', value: '{{spoons}}' } },
        { type: 'StatusBadge', props: { label: '{{state}}', status: 'online' } },
      ],
      data: { spoons: 4, state: 'restored' },
    };
    const resolved = resolveFixedSchema(layout);
    expect(resolved[0].props).toEqual({ label: 'Energy', value: 4 });
    expect(resolved[1].props).toEqual({ label: 'restored', status: 'online' });
  });

  it('leaves the layout shape deterministic (no layout step)', () => {
    const layout: FixedSchemaLayout = {
      tree: [{ type: 'MetricBadge', props: { label: 'X', value: '0' } }],
      data: {},
    };
    expect(resolveFixedSchema(layout).length).toBe(1);
    expect(resolveFixedSchema(layout)[0].type).toBe('MetricBadge');
  });
});