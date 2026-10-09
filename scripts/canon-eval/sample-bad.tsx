// A plausible BAD agent output: invented tokens, raw colors, no AAF, no
// design-core import, small touch targets. This is what the eval must catch.
export function SettingsCard() {
  return (
    <section className="card">
      <h2 style={{ color: '#1a1a2e' }}>sound</h2>
      <p style={{ color: 'rgb(120, 120, 140)', fontSize: '14px' }}>
        toggle the sound
      </p>
      <button
        onClick={() => alert('toggle')}
        style={{ minHeight: '32px', background: '#00f0ff', color: '#0a0e14' }}
      >
        sound off
      </button>
    </section>
  );
}