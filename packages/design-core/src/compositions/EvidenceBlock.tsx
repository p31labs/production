import type { ReactNode } from 'react';

export interface EvidenceBlockProps {
  claim: string;
  value: string;
  source: string;
  verified: string;
  className?: string;
  /** Optional icon/label slot for the value line. */
  icon?: ReactNode;
}

/** EvidenceBlock — a page block: a claim, its value, its source, and its
 *  verification status. The forge's document-pipeline evidence unit, promoted
 *  to canon so it can be composed (registry:block), proposed by an agent
 *  (LUMI), and recorded on the Loom chain as a propose/approve pair. */
export function EvidenceBlock({ claim, value, source, verified, className = '', icon }: EvidenceBlockProps) {
  return (
    <div className={`evidence-block ${className}`.trim()}>
      <div className="evidence-block__claim">{claim}</div>
      <div className="evidence-block__value">
        {icon && <span className="evidence-block__icon" aria-hidden="true">{icon}</span>}
        <span>{value}</span>
      </div>
      <div className="evidence-block__source">Source: {source}</div>
      <div className="evidence-block__verified">Verified: {verified}</div>
    </div>
  );
}

export default EvidenceBlock;