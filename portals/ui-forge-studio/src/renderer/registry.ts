/**
 * registry.ts — maps the ui-forge component-tree `type` to its design-core
 * composition. Derived from the catalog the engine uses (ui-schema.json /
 * design-core genui catalog), not hand-maintained, so a component added to the
 * canon automatically appears here when the studio rebuilds.
 *
 * Unknown types fall back to an inline `UnknownBlock` (never crash).
 */
import type { ComponentType } from 'react';
import * as DC from '@p31ca/design-core/compositions';

export interface TreeNode {
  type: string;
  id?: string;
  props?: Record<string, unknown>;
  tokens?: string[];
  children?: TreeNode[];
  dataBinding?: string | null;
  importPath?: string | null;
  cssClass?: string | null;
}

/** Names the design-core compositions index actually exports. */
const DC_EXPORTS = Object.entries(DC) as [string, unknown][];

/** Registry: engine type → React component (only for component exports —
 *  filters out non-component values like NOTIFICATION_DURATION). */
export const REGISTRY: Record<string, ComponentType<any>> = Object.fromEntries(
  DC_EXPORTS
    .filter(([, v]) => typeof v === 'function')
    .map(([name, v]) => [name, v as ComponentType<any>]),
);

export function resolveComponent(type: string): ComponentType<any> | undefined {
  return REGISTRY[type];
}

/** Apply p31.* tokens as CSS variables on the node's wrapper. */
export function tokensToStyle(tokens?: string[]): React.CSSProperties | undefined {
  if (!tokens || tokens.length === 0) return undefined;
  const style: Record<string, string> = {};
  for (const t of tokens) {
    // `p31.color.action.primary` → `--p31-color-action-primary`
    const varName = t.replace(/^p31\./, '--p31-').replace(/\./g, '-');
    style[varName] = 'var(' + varName + ')';
  }
  return style as React.CSSProperties;
}