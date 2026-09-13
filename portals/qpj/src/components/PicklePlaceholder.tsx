interface PicklePlaceholderProps {
  kind: 'mesh-node' | 'sbt' | 'passport' | 'sensory' | 'mesh';
  reason: string;
}

const PICKLE_LABELS: Record<PicklePlaceholderProps['kind'], string> = {
  'mesh-node': 'A pickle is waiting here',
  sbt: 'A pickle jar will appear here',
  passport: 'Pickle profile loading',
  sensory: 'Pickle settings coming soon',
  mesh: 'The pickle mesh is empty',
};

export function PicklePlaceholder({ kind, reason }: PicklePlaceholderProps) {
  return (
    <div
      className="pickle-placeholder"
      role="status"
      aria-label={`${PICKLE_LABELS[kind]}: ${reason}`}
      data-placeholder="true"
      data-pickle-kind={kind}
    >
      <span className="pickle-placeholder__jar" aria-hidden="true">🥒</span>
      <span className="pickle-placeholder__reason">
        {reason || PICKLE_LABELS[kind]}
      </span>
    </div>
  );
}
