/**
 * PageTree — recursive render of the page tree from buildTree().
 */

import { buildTree, type Page, type PageNode } from '../lib/pageStore';

interface PageTreeProps {
  pages: Page[];
  cursor: string | null;
  onSelect: (id: string) => void;
}

function PageTreeNode({
  node,
  depth = 0,
  cursor,
  onSelect,
}: {
  node: PageNode;
  depth?: number;
  cursor: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="pages-tree__node">
      <button
        type="button"
        className={`docs-item${cursor === node.id ? ' is-active' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => onSelect(node.id)}
      >
        <span className="docs-item__title">{node.title}</span>
      </button>
      {node.children.map((child) => (
        <PageTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          cursor={cursor}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function PageTree({ pages, cursor, onSelect }: PageTreeProps) {
  const roots = buildTree(pages);
  return (
    <div className="pages-tree" role="tree">
      {roots.map((node) => (
        <PageTreeNode key={node.id} node={node} cursor={cursor} onSelect={onSelect} />
      ))}
    </div>
  );
}