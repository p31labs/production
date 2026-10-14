/**
 * reactTree.ts — the React world's adapter for the shared markup trees.
 *
 * Converts a @p31ca/canon-parts/markup tree node into React elements:
 *   - attr names are already React prop names ('className', 'htmlFor',
 *     'tabIndex', 'data-*', 'aria-*'); 'class' is mapped to 'className'.
 *   - `{ passthrough: ReactNode }` children render the node directly (this is
 *     how ReactNode slot props enter the tree).
 *   - `__handlers` on a node merge interactive props (onClick / pointer /
 *     keyboard / ref) — those never serialize to HTML, so the Astro world's
 *     output is unaffected and the parity gate stays exact.
 *   - `{ raw: string }` is NOT supported in the React world (ReactNodes
 *     replace pre-rendered HTML); it throws rather than silently diverge.
 */
import { createElement, type ReactNode } from 'react';

export interface MarkupNodeLike {
  tag: string;
  attrs?: [string, unknown][];
  children?: ChildLike[];
  __handlers?: Record<string, unknown>;
}

export type ChildLike =
  | MarkupNodeLike
  | { raw: string }
  | { passthrough: unknown }
  | string
  | number
  | null
  | undefined;

export function nodeToReact(node: ChildLike): ReactNode {
  if (node == null || typeof node === 'string' || typeof node === 'number') {
    return node as ReactNode;
  }
  if (typeof node === 'object' && 'passthrough' in node) {
    return (node as { passthrough: unknown }).passthrough as ReactNode;
  }
  if (typeof node === 'object' && 'raw' in node) {
    throw new Error(
      '@p31ca/canon-react: { raw } HTML is not supported — pass a ReactNode instead.',
    );
  }
  const n = node as MarkupNodeLike;
  const props: Record<string, unknown> = {};
  for (const [k, v] of n.attrs ?? []) {
    if (v == null || k === '__handlers') continue;
    props[k === 'class' ? 'className' : k] = v;
  }
  Object.assign(props, n.__handlers ?? {});
  const children = (n.children ?? []).map((c) => nodeToReact(c));
  return createElement(n.tag, props, ...children);
}

/** Mark a ReactNode so it can travel through a markup tree child slot. */
export function pass(node: ReactNode): { passthrough: ReactNode } {
  return { passthrough: node };
}

/**
 * Normalize a spread-rest object into a CANONICAL key order (the Astro
 * world's explicit prop lists). Object key insertion order determines the
 * HTML attribute order on both sides — the parity gate requires the two
 * worlds to agree, so the React world cannot inherit the caller's order.
 */
export function orderedRest(
  rest: Record<string, unknown>,
  order: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of order) {
    if (rest[key] !== undefined) out[key] = rest[key];
  }
  for (const [key, value] of Object.entries(rest)) {
    if (out[key] === undefined && !order.includes(key)) out[key] = value;
  }
  return out;
}

/** Mark a node that carries interactive handlers (React-only, unserialized). */
export function withHandlers(
  node: MarkupNodeLike,
  handlers: Record<string, unknown>,
): MarkupNodeLike {
  node.__handlers = handlers;
  return node;
}