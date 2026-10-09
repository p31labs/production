import React from 'react';
import { resolveComponent, tokensToStyle, type TreeNode } from './registry';

/** Recursive tree renderer — maps a ui-forge component tree to live
 *  design-core components. Unknown types render a visible fallback block
 *  (never crash). */
export function TreeRenderer({ node }: { node: TreeNode | null }) {
  if (!node) return null;

  const Component = resolveComponent(node.type);
  if (!Component) return <UnknownBlock node={node} />;

  const style = tokensToStyle(node.tokens);
  const children = node.children?.map((child, i) => <TreeRenderer key={child.id ?? i} node={child} />);

  return (
    <Component
      {...(node.props as Record<string, unknown>)}
      style={style}
      data-binding={node.dataBinding ?? undefined}
    >
      {children}
    </Component>
  );
}

/** Visible fallback so an unmapped component type never takes down the page. */
export function UnknownBlock({ node }: { node: TreeNode }) {
  return (
    <div className="forge-unknown-block" data-unknown-type={node.type} aria-label={`Unknown component ${node.type}`}>
      <span className="forge-unknown-block__tag">unmapped</span>
      <code className="forge-unknown-block__type">{node.type}</code>
      {node.children?.length ? node.children.map((c, i) => <TreeRenderer key={i} node={c} />) : null}
    </div>
  );
}