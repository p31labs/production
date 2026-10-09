import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface StatusClusterProps {
  /** Read-only status segments — each should be a pill or chip. */
  children: React.ReactNode;
  className?: string;
}

/**
 * StatusCluster — the read-only status row in the topbar's right region.
 *
 * Scrolls horizontally when it outgrows the bar, with edge fades rendered only
 * on the side that overflows. The trailing action cluster stays pinned outside
 * this component. Children must not open in-flow absolute panels (overflow
 * clips both axes) — portaled overlays only.
 */
export function StatusCluster({ children, className = '' }: StatusClusterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setOverflow({
      left: scrollLeft > 1,
      right: scrollLeft + clientWidth < scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [measure]);

  return (
    <div
      className={`status-cluster ${overflow.left ? 'has-fade-left' : ''} ${overflow.right ? 'has-fade-right' : ''} ${className}`.trim()}
    >
      <div ref={ref} className="status-cluster__scroller">
        {children}
      </div>
    </div>
  );
}

export default StatusCluster;