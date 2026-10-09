import { Button } from '@p31ca/design-core/compositions';

// A known-good canon surface: token colors, 48px targets, AAF attributes,
// design-core imports, no raw color literals.
export function SettingsCard() {
  return (
    <section
      className="card"
      aria-label="sound settings"
      style={{ minHeight: 'var(--p31-touch-recommended)' }}
    >
      <h2 className="card__title" style={{ color: 'var(--p31-text)' }}>
        sound
      </h2>
      <p style={{ color: 'var(--p31-text-secondary)', fontSize: '16px' }}>
        turn the family sound on or off
      </p>
      <Button
        variant="ghost"
        aria-pressed="false"
        data-agent-kind="action"
        data-agent-action="instrument.sound.toggle"
        data-agent-danger="none"
        data-agent-confirm="never"
      >
        sound off
      </Button>
    </section>
  );
}