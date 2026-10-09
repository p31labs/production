import { useEffect, useState } from 'react';
import A2Modal from './ui/A2Modal';
import type { ZoneTransitionEvent } from '@p31ca/ble';

type Phase = 'countdown' | 'breathing';

export default function VisitorMindsetModal({
  event,
  onAcknowledge,
  onDismiss,
}: {
  event: ZoneTransitionEvent;
  onAcknowledge: () => void;
  onDismiss: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('countdown');
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (phase !== 'countdown') return;
    const iv = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(iv);
          setPhase('breathing');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const direction =
    event.direction === 'calming'
      ? 'Calming shift'
      : event.direction === 'energizing'
        ? 'Energizing shift'
        : 'Neutral shift';

  return (
    <A2Modal
      title="Visitor mindset"
      visible
      onClose={onDismiss}
      actions={
        phase === 'countdown'
          ? [{ label: 'Dismiss', onClick: onDismiss }]
          : [
              { label: 'Dismiss', onClick: onDismiss },
              { label: 'Acknowledge', onClick: onAcknowledge },
            ]
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--p31-space-xs)', textAlign: 'center' }}>
        {phase === 'countdown' ? (
          <div className="visitor-count" role="status" aria-label={`Settling in ${count}`}>
            {count}
          </div>
        ) : (
          <div className="visitor-breathe" aria-hidden="true" />
        )}
        <div style={{ fontSize: 'var(--p31-scale-md)', fontWeight: 600, color: 'var(--p31-text)' }}>
          Entering {event.toZone.name}
        </div>
        <div style={{ fontSize: 'var(--p31-scale-sm)', color: 'var(--p31-text-secondary)', lineHeight: 1.5 }}>
          {phase === 'countdown' ? 'Settling in…' : `Breathe with the pulse. ${direction} (Δ${event.energyDelta}).`}
        </div>
        {event.toZone.rules.length > 0 && phase === 'breathing' && (
          <ul style={{ margin: 0, paddingLeft: 'var(--p31-space-xs)', textAlign: 'left', fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>
            {event.toZone.rules.map((r) => (
              <li key={r} style={{ marginBottom: 4 }}>{r}</li>
            ))}
          </ul>
        )}
      </div>
    </A2Modal>
  );
}
