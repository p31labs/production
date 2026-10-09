import { useState } from 'react';
import A2Modal from './ui/A2Modal';
import type { MessageAnalysis, ShieldedMessage } from '@p31ca/rules';

export default function CognitiveShieldSuggestion({
  analysis,
  shield,
  onAccept,
  onKeepOriginal,
  onClose,
}: {
  analysis: MessageAnalysis;
  shield: ShieldedMessage;
  onAccept: (rewritten: string) => void;
  onKeepOriginal: () => void;
  onClose: () => void;
}) {
  const [showOriginal, setShowOriginal] = useState(false);

  const levelColor =
    analysis.conflictLevel === 'CRITICAL'
      ? 'var(--p31-accent-red)'
      : analysis.conflictLevel === 'HIGH' || analysis.conflictLevel === 'ELEVATED'
        ? 'var(--p31-accent-gold)'
        : 'var(--p31-accent)';

  const body = showOriginal ? analysis.originalText : (shield.rewritten ?? shield.blufSummary);

  return (
    <A2Modal
      title="Cognitive shield"
      visible
      onClose={onClose}
      actions={[
        { label: 'Keep original', onClick: onKeepOriginal },
        {
          label: 'Accept rewrite',
          onClick: () => shield.rewritten && onAccept(shield.rewritten),
          disabled: !shield.rewritten,
        },
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-xs)' }}>
        <div style={{ fontSize: 'var(--p31-scale-xs)', color: levelColor, fontWeight: 600 }}>
          {analysis.conflictLevel} conflict
          {analysis.triggers.length > 0 ? ` — ${analysis.triggers.join(', ')}` : ''}
        </div>
        <div>
          <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', marginBottom: 4 }}>
            {showOriginal ? 'Original message' : 'Suggested rewrite (BLUF)'}
          </div>
          <div
            style={{
              padding: 'var(--p31-space-tiny)',
              background: 'var(--p31-glass-bg)',
              borderRadius: 12,
              fontSize: 'var(--p31-scale-sm)',
              color: 'var(--p31-text-secondary)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
            }}
          >
            {body}
          </div>
        </div>
        {shield.rewritten && (
          <button type="button" className="btn ghost" onClick={() => setShowOriginal((v) => !v)} aria-label="Show original">
            {showOriginal ? 'Show rewrite' : 'Show original'}
          </button>
        )}
      </div>
    </A2Modal>
  );
}
