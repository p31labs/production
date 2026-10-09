/**
 * renderer/A2UI.tsx — the declarative generative-UI renderer.
 *
 * An agent emits an A2UI-style declaration: a JSON payload of typed nodes.
 * The shell renders each node natively through the canon component catalog
 * (renderer/catalog.tsx). The catalog is the guardrail — the agent can arrange
 * and combine approved components, but cannot step outside the set. An unknown
 * type renders a visible fallback with the raw data (no silent failures).
 *
 * This is the declarative tier of the generative-UI spectrum: controlled
 * (shell chrome) / declarative (this renderer) / open (sandboxed MCP Apps).
 */

import type { ReactNode } from 'react';
import { CANON_CATALOG, validateProps, resolveFixedSchema, type FixedSchemaLayout } from './catalog';

/** A declarative A2UI node. */
export interface A2UINode {
  /** Component type — resolved through the catalog. */
  type: string;
  /** Component props (validated against the catalog's allowed props). */
  props?: Record<string, unknown>;
  /** Child nodes (for container components). */
  children?: A2UINode[];
  /** Data binding ref (entity.field) for dynamic data. */
  dataBinding?: string;
}

/** Render an A2UI node tree. Unknown types render a visible fallback. Props
 *  are validated against the catalog guardrail — disallowed props drop. */
export function renderA2UINode(node: A2UINode): ReactNode {
  if (!node || typeof node !== 'object') return null;
  const def = CANON_CATALOG[node.type];
  if (!def) {
    return (
      <div className="a2ui-fallback" data-missing-type={node.type} role="status">
        <span className="a2ui-fallback__badge">unrendered</span>
        <code className="a2ui-fallback__type">{node.type}</code>
      </div>
    );
  }
  const safeProps = validateProps(def, node.props ?? {});
  const children = (node.children ?? []).map((c, i) => (
    <div key={i} className="a2ui-child">{renderA2UINode(c)}</div>
  ));
  return def.render(safeProps, children.length ? children : undefined);
}

/** Render a top-level A2UI surface (an array of nodes). */
export function renderA2UISurface(nodes: A2UINode[] | undefined | null): ReactNode {
  if (!nodes || nodes.length === 0) return null;
  return (
    <div className="a2ui-surface">
      {nodes.map((n, i) => <div key={i} className="a2ui-block">{renderA2UINode(n)}</div>)}
    </div>
  );
}

/** Render a fixed-schema layout (pre-authored tree + agent-filled data).
 *  Deterministic: no layout step — the dashboard pattern. */
export function renderFixedSchema(layout: FixedSchemaLayout): ReactNode {
  const nodes = resolveFixedSchema(layout).map((n) => ({ type: n.type, props: n.props, children: n.children as A2UINode[] | undefined }));
  return renderA2UISurface(nodes as A2UINode[]);
}

/** The full canon catalog (exposed for the audit/schema surfaces). */
export { CANON_CATALOG } from './catalog';