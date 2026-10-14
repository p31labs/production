import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';

export interface SplitProps {
  /** First pane content (summary, list, tree…). */
  a: ReactNode;
  /** Second pane content (focus surface, canvas, editor…). */
  b: ReactNode;
  /** Collapse pane B + handle; pane A owns the row. */
  collapsed?: boolean;
  /** Enable the collapse affordances (WCAG 2.5.7 single-pointer alternative):
   *  Enter/Space toggle + double-click on the handle. When collapsible, the
   *  handle stays rendered while collapsed as the restore affordance. */
  collapsible?: boolean;
  /** Controlled collapse handler — pass this to own the collapsed state
   *  (`collapsed` stays the source of truth). */
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
 * Split — two panes with a draggable handle. Pointer-resized via capture.
 * Keyboard fallback (WCAG 2.5.7): Left/Right nudge ±5%, Home/End snap to
 * min/max; with `collapsible`, Enter/Space toggle and double-click collapse
 * pane B (the handle stays rendered as the restore affordance while
 * collapsed). Pane B collapses on mobile via CSS.
 */
export function Split({ a, b, collapsed = false, collapsible = false, onCollapsedChange, defaultRatio = 0.5, onRatioChange, ariaLabelA, ariaLabelB, className = '', style }: SplitProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatioState] = useState(() => Math.min(MAX_RATIO, Math.max(MIN_RATIO, defaultRatio)));
  const [dragging, setDragging] = useState(false);
  const [collapsedState, setCollapsedState] = useState(collapsed);
  const isCollapsed = onCollapsedChange ? collapsed : collapsedState;

  // Legacy controlled usage (`collapsed` prop, no handler) stays live: when
  // uncontrolled, mirror prop changes into internal state (internal toggles
  // do not retrigger — the prop is unchanged).
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
    // A collapsed handle is the restore affordance, not a drag surface.
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

  const vars = { '--_split-a': `${ratio}fr`, '--_split-b': `${1 - ratio}fr` } as CSSProperties;

  return (
    <div ref={rootRef} data-p31="split" data-collapsed={isCollapsed ? '' : undefined} className={className} style={{ ...vars, ...style }}>
      <section data-p31="split-pane" data-side="a" aria-label={ariaLabelA}>{a}</section>
      {(!isCollapsed || collapsible) && (
        <div
          data-p31="split-handle"
          data-collapsible={collapsible ? '' : undefined}
          data-dragging={dragging ? '' : undefined}
          role="separator"
          aria-orientation="vertical"
          aria-valuemin={Math.round(MIN_RATIO * 100)}
          aria-valuemax={Math.round(MAX_RATIO * 100)}
          aria-valuenow={Math.round((isCollapsed ? MAX_RATIO : ratio) * 100)}
          aria-valuetext={isCollapsed ? 'pane B collapsed' : undefined}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={onDoubleClick}
          onKeyDown={onKeyDown}
        />
      )}
      <section data-p31="split-pane" data-side="b" aria-label={ariaLabelB}>{b}</section>
    </div>
  );
}

export default Split;