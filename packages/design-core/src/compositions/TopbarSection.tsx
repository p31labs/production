import React from 'react';

export type TopbarSlot = 'leading' | 'brand' | 'center' | 'status' | 'mode' | 'trailing' | 'identity' | 'mobile-trailing';

export interface TopbarSectionProps {
  /** Slot identity — used for `data-slot` styling and responsive rules. */
  slot: TopbarSlot;
  children?: React.ReactNode;
  className?: string;
}

/**
 * TopbarSection — a vertically-centered, gap-consistent group of topbar content.
 * Every region of the bar is a TopbarSection; the Topbar owns arrangement, the
 * section owns internal spacing. Mirrors the GmTopbarSection contract.
 */
export function TopbarSection({ slot, children, className = '' }: TopbarSectionProps) {
  if (children == null) return null;
  return (
    <div className={`topbar-section topbar-section--${slot} ${className}`.trim()} data-slot={slot}>
      {children}
    </div>
  );
}

export default TopbarSection;