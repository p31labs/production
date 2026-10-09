/**
 * CardBody — the padded content region of a card.
 *
 * GlassCard is a bare surface (`padding: 0`). CardBody is the composition that
 * gives it the research-validated spacing contract:
 *   - card internal padding: 24px (var(--p31-space-6))
 *   - element-to-element within card: 8px (var(--p31-space-2))
 *
 * The canon owns appearance; faces compose <GlassCard><CardBody>…</CardBody>
 * so cards are never flush-to-edge.
 */
import type { CSSProperties, ReactNode } from 'react';

export interface CardBodyProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function CardBody({ children, className = '', style }: CardBodyProps) {
  return (
    <div className={`card-body ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export default CardBody;