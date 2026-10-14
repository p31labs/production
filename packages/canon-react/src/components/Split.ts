import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  ReactNode,
  PointerEvent as ReactPointerEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { splitTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, pass, withHandlers, type MarkupNodeLike } from '../reactTree.js';

export interface SplitProps {
  /** First pane content (summary, list, tree…). */
  a: ReactNode;
  /** Second pane content (focus surface, canvas, editor…). */
  b: ReactNode;
  /** Collapse pane B + handle; pane A owns the row. */
  collapsed?: boolean;
  /** Enable the collapse affordances (WCAG 2.5.7 single-pointer alternative). */
  collapsible?: boolean;
  /** Controlled collapse handler — pass this to own the collapsed state. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Initial fraction of the container given to pane A (0.2–0.8). */
  defaultRatio?: number;
  onRatioChange?: (ratio: number) => void;
  ariaLabelA?: string;
  ariaLabelB?: string;
  className?: string;
  style?: CSSProperties;
}

const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;
const STEP = 0.05;

/**
 * Split — two panes with a draggable handle. Pointer-resized via capture;
 * keyboard fallback (WCAG 2.5.7): Left/Right nudge ±5%, Home/End snap;
 * with `collapsible`, Enter/Space toggle and double-click collapse pane B.
 */
export function Split({ a, b, collapsed = false, collapsible = false, onCollapsedChange, defaultRatio = 0.5, onRatioChange, ariaLabelA, ariaLabelB, className = '', style }: SplitProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatioState] = useState(() => Math.min(MAX_RATIO, Math.max(MIN_RATIO, defaultRatio)));
  const [dragging, setDragging] = useState(false);
  const [collapsedState, setCollapsedState] = useState(collapsed);
  const isCollapsed = onCollapsedChange ? collapsed : collapsedState;

  useEffect(() => {
    if (!onCollapsedChange) setCollapsedState(collapsed);
  }, [collapsed, onCollapsedChange]);

  const setRatio = useCallback((next: number) => {
    const clamped = Math.min(MAX_RATIO, Math.max(MIN_RATIO, next));
    setRatioState(clamped);
    onRatioChange?.(clamped);
  }, [onRatioChange]);

  const toggleCollapse = useCallback(() => {
    if (onCollapsedChange) onCollapsedChange(!collapsed);
    else setCollapsedState((c) => !c);
  }, [onCollapsedChange, collapsed]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isCollapsed) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setRatio((e.clientX - rect.left) / rect.width);
  };
  const endDrag = () => setDragging(false);
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setRatio(ratio - STEP); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); setRatio(ratio + STEP); return; }
    if (e.key === 'Home') { e.preventDefault(); setRatio(MIN_RATIO); return; }
    if (e.key === 'End') { e.preventDefault(); setRatio(MAX_RATIO); return; }
    if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      toggleCollapse();
    }
  };
  const onDoubleClick = () => {
    if (collapsible) toggleCollapse();
  };

  const tree = splitTree({
    a: pass(a),
    b: pass(b),
    ratio,
    collapsed: isCollapsed,
    collapsible,
    dragging,
    ariaLabelA,
    ariaLabelB,
    className,
    style,
  });

  withHandlers(tree, { ref: rootRef });
  const handle = tree.children.find(
    (c) => c != null && typeof c === 'object' && 'tag' in c && c.attrs?.some(([k, v]) => k === 'data-p31' && v === 'split-handle'),
  ) as MarkupNodeLike | undefined;
  if (handle) {
    withHandlers(handle, {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onDoubleClick,
      onKeyDown,
    });
  }
  return nodeToReact(tree);
}

export default Split;