import { useState, useMemo } from 'react';
import { Button } from '@p31/design-core/compositions';

interface InspectorNode {
  tag: string;
  id?: string;
  classes: string[];
  text?: string;
  children: InspectorNode[];
}

interface ElementInspectorProps {
  html: string;
  onSelect: (selector: string) => void;
}

function buildTree(root: Element): InspectorNode {
  const children = Array.from(root.children).map((child) => buildTree(child));
  const hasElementChildren = children.length > 0;
  const rawText = hasElementChildren ? '' : (root.textContent || '').trim();
  return {
    tag: root.tagName.toLowerCase(),
    id: root.id || undefined,
    classes: typeof root.className === 'string' && root.className ? root.className.split(/\s+/).filter(Boolean) : [],
    text: rawText ? rawText.slice(0, 48) : undefined,
    children,
  };
}

function selectorFor(node: InspectorNode): string {
  return node.tag + (node.id ? `#${node.id}` : '') + (node.classes.length ? '.' + node.classes.join('.') : '');
}

function countNodes(node: InspectorNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

function NodeRow({ node, depth, onSelect }: { node: InspectorNode; depth: number; onSelect: (selector: string) => void }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  return (
    <>
      <div className="inspector-row" style={{ paddingLeft: `var(--inspector-indent, ${depth * 14}px)` }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          disabled={!hasChildren}
          aria-label={open ? 'Collapse' : 'Expand'}
          className={`inspector-toggle${hasChildren ? '' : ' inspector-toggle--leaf'}`}
        >
          {hasChildren ? (open ? '▾' : '▸') : ''}
        </Button>
        <Button variant="ghost" size="sm" className="inspector-tag" onClick={() => onSelect(selectorFor(node))}>
          <span className="inspector-tag-name">{node.tag}</span>
          {node.id && <span className="inspector-tag-id">#{node.id}</span>}
          {node.classes.slice(0, 2).map((cls) => (
            <span key={cls} className="inspector-tag-class">.{cls}</span>
          ))}
          {node.classes.length > 2 && <span className="inspector-tag-ellipsis">…</span>}
          {node.text && <span className="inspector-tag-text">“{node.text}{node.text.length >= 48 ? '…' : ''}”</span>}
        </Button>
      </div>
      {open && hasChildren && node.children.map((child, i) => (
        <NodeRow key={i} node={child} depth={depth + 1} onSelect={onSelect} />
      ))}
    </>
  );
}

export default function ElementInspector({ html, onSelect }: ElementInspectorProps) {
  const tree = useMemo(() => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const root = buildTree(doc.body && doc.body.children.length > 0 ? doc.body : doc.documentElement);
    return { root, nodeCount: countNodes(root) };
  }, [html]);

  return (
    <div className="inspector-panel">
      <div className="inspector-header">
        <span>{tree.nodeCount} nodes</span>
        <span className="inspector-hint">Click a node to highlight it in preview</span>
      </div>
      <div className="inspector-tree">
        {tree.root.children.map((child, i) => (
          <NodeRow key={i} node={child} depth={0} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
