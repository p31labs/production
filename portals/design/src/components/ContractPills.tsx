export type PillKind = 'parts' | 'states' | 'forbidden' | 'tokens';

interface ContractPillsProps {
  kind: PillKind;
  items: readonly string[];
}

export function ContractPills({ kind, items }: ContractPillsProps) {
  if (!items || items.length === 0) {
    return <span className="contract-pill contract-pill--empty">none declared</span>;
  }
  return (
    <div className="contract-pills">
      {items.map((item) => (
        <span key={item} className={`contract-pill contract-pill--${kind}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

interface ContractBlockProps {
  label: string;
  kind: PillKind;
  items: readonly string[];
  danger?: boolean;
}

export function ContractBlock({ label, kind, items, danger = false }: ContractBlockProps) {
  return (
    <div>
      <h5 className={`contract-block-label${danger ? ' contract-block-label--danger' : ''}`}>{label}</h5>
      <ContractPills kind={kind} items={items} />
    </div>
  );
}