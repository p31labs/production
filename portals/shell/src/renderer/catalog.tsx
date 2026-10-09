/**
 * renderer/catalog.ts — the canon A2UI catalog (formal, additive-only).
 *
 * The catalog is the guardrail: the agent can arrange and combine the canon
 * compositions freely, but cannot step outside the set. This mirrors the A2UI
 * catalog contract — component type → props schema + renderer. The renderer
 * (A2UI.tsx) resolves declarations against this catalog.
 *
 * Two modes:
 *   dynamic       — the agent designs the surface from conversation (novel layouts)
 *   fixed-schema  — a pre-authored layout that the agent fills with data
 *                   (deterministic, no layout step — the dashboard pattern)
 */
import type { ReactNode } from 'react';
import { GlassPanel } from '@p31ca/design-core/compositions';
import { MetricBadge } from '@p31ca/design-core/compositions';
import { StatusBadge } from '@p31ca/design-core/compositions';
import { Button } from '@p31ca/design-core/compositions';
import { McpApp } from './McpApp';

export interface CatalogComponentDef {
  /** Allowed props — anything else is rejected (the guardrail). */
  allowedProps: string[];
  /** Renderer: props → ReactNode (children for containers). */
  render: (props: Record<string, unknown>, children?: ReactNode) => ReactNode;
}

/** A prop-schema validator: only allowed props pass; unknown props drop. */
export function validateProps(def: CatalogComponentDef, props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props ?? {})) {
    if (def.allowedProps.includes(k)) out[k] = v;
  }
  return out;
}

/** The canon A2UI catalog. Additive-only: the shell owns the registry. */
export const CANON_CATALOG: Record<string, CatalogComponentDef> = {
  GlassPanel: {
    allowedProps: ['padding'],
    render: (p, children) => (
      <GlassPanel padding={(p.padding as 'sm' | 'md' | 'lg') ?? 'md'}>{children}</GlassPanel>
    ),
  },
  MetricBadge: {
    allowedProps: ['icon', 'value', 'label'],
    render: (p) => (
      <MetricBadge
        icon={typeof p.icon === 'string' ? p.icon : undefined}
        value={typeof p.value === 'string' || typeof p.value === 'number' ? p.value : ''}
        label={typeof p.label === 'string' ? p.label : ''}
      />
    ),
  },
  StatusBadge: {
    allowedProps: ['status', 'label'],
    render: (p) => (
      <StatusBadge
        status={(p.status as 'online' | 'offline' | 'busy' | 'away') ?? 'online'}
        label={typeof p.label === 'string' ? p.label : undefined}
      />
    ),
  },
  Button: {
    allowedProps: ['variant', 'label'],
    render: (p, children) => (
      <Button variant={(p.variant as 'primary' | 'secondary' | 'ghost' | undefined) ?? 'primary'}>
        {typeof p.label === 'string' ? p.label : children}
      </Button>
    ),
  },
  /** The open-ended tier: an MCP App rendered in a sandboxed iframe. */
  McpApp: {
    allowedProps: ['resource', 'displayMode'],
    render: (p) => (
      <McpApp
        resource={typeof p.resource === 'string' ? p.resource : 'about:blank'}
        displayMode={(p.displayMode as 'widget' | 'full') ?? 'widget'}
      />
    ),
  },
};

/** A fixed-schema layout: a pre-authored tree with `data` bindings the agent
 *  fills. The schema (node types + order) is fixed; only the data varies.
 *  Deterministic — no layout step, ideal for dashboards. */
export interface FixedSchemaLayout {
  /** The pre-authored A2UI node tree. */
  tree: Array<{ type: string; props?: Record<string, unknown>; children?: FixedSchemaLayout['tree'] }>;
  /** Data bindings: { ref: value } — the agent fills these. */
  data: Record<string, string | number>;
}

/** Resolve a fixed-schema layout against its data (bind `{{ref}}` in props). */
export function resolveFixedSchema(layout: FixedSchemaLayout): Array<{ type: string; props?: Record<string, unknown>; children?: unknown[] }> {
  const fill = (v: unknown): unknown => {
    if (typeof v === 'string' && v.startsWith('{{') && v.endsWith('}}')) {
      const ref = v.slice(2, -2).trim();
      return layout.data[ref] ?? '';
    }
    return v;
  };
  const map = (nodes: FixedSchemaLayout['tree']): Array<{ type: string; props?: Record<string, unknown>; children?: unknown[] }> =>
    nodes.map((n) => ({
      type: n.type,
      props: Object.fromEntries(Object.entries(n.props ?? {}).map(([k, v]) => [k, fill(v)])),
      children: n.children ? map(n.children) : undefined,
    }));
  return map(layout.tree);
}