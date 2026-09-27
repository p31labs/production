import { Button } from '@p31ca/design-core/compositions';
import { useQpjStore } from '../store/useQpjStore';
import { getPassport } from '../lib/passports';
import { navigateTo } from '../lib/routes';
import { BatteryRing } from '../components/BatteryRing';
import { OnboardingFlow } from './you/OnboardingFlow';
import { useIdentity } from '../hooks/useIdentity';
import { PassportCard } from '../components/PassportCard';
import { SBTGallery } from '../components/SBTGallery';
import { MeshK4 } from '../components/MeshK4';
import { PostEntryChecklist } from '../components/PostEntryChecklist';

const MOODS = [
  { emoji: '😄', label: 'bright', value: 'bright' },
  { emoji: '😌', label: 'calm', value: 'calm' },
  { emoji: '😴', label: 'tired', value: 'tired' },
  { emoji: '🫗', label: 'low', value: 'low' },
] as const;

const TIERS = [
  { label: 'careScore', description: 'Your kindness tally across the mesh' },
  { label: 'symmetry', description: 'How balanced the family graph is' },
  { label: 'curvature', description: 'Mesh curvature across the street' },
  { label: 'topology', description: 'Δ = delta · Y = wye' },
] as const;

export function YouPage() {
  const passportId = useQpjStore((s) => s.passportId);
  const spoons = useQpjStore((s) => s.spoons);
  const treatsReceived = useQpjStore((s) => s.treatsReceived);
  const mood = useQpjStore((s) => s.mood);
  const meshUniform = useQpjStore((s) => s.meshUniform);
  const mode = useQpjStore((s) => s.mode);
  const onlineCount = useQpjStore((s) => Object.values(s.presence).filter((p) => p.online).length);
  const motionScale = useQpjStore((s) => s.motionScale);
  const soundScale = useQpjStore((s) => s.soundScale);
  const contrastTarget = useQpjStore((s) => s.contrastTarget);
  const breathPattern = useQpjStore((s) => s.breathPattern);
  const zeitgeber = useQpjStore((s) => s.zeitgeber);
  const setMotionScale = useQpjStore((s) => s.setMotionScale);
  const setSoundScale = useQpjStore((s) => s.setSoundScale);
  const setContrastTarget = useQpjStore((s) => s.setContrastTarget);
  const setBreathPattern = useQpjStore((s) => s.setBreathPattern);
  const setZeitgeber = useQpjStore((s) => s.setZeitgeber);
  const setMood = useQpjStore((s) => s.setMood);

  const me = getPassport(passportId);
  const symmetryPct = Math.round((meshUniform.symmetry ?? 1) * 100);
  const curvature = (meshUniform.curvature ?? 0).toFixed(2);
  const { status, identity, verify } = useIdentity(passportId);

  return (
    <main className="page you" id="you">
      {status === 'loading' && (
        <section className="you__identity card you__loading" aria-live="polite">
          Loading your identity…
        </section>
      )}
      {status === 'none' && (
        <OnboardingFlow passportId={passportId} onDone={() => { void verify(); navigateTo('you'); }} />
      )}
      {status === 'ready' && identity && (
        <section className="you__identity card" aria-label="Your passport">
          <span className="you__avatar" aria-hidden="true">{identity.avatar}</span>
          <div className="you__identity-text">
            <h1 className="you__name">{me.pickledName}</h1>
            <p className="you__blurb">{me.blurb}</p>
            <p className="you__meta">
              <span>🎂 {me.birthday}</span>
              <span>·</span>
              <span>{me.role} passport</span>
              <span>·</span>
              <span>mode: {mode}</span>
              <span>·</span>
              <span title={identity.did}>{identity.did.slice(0, 28)}…</span>
            </p>
          </div>
          <BatteryRing level={spoons} size={72} />
        </section>
      )}

      {status === 'ready' && identity && (
        <PassportCard identity={identity} />
      )}

      {status === 'ready' && identity && (
        <SBTGallery did={identity.did} />
      )}

      {status === 'ready' && identity && (
        <PostEntryChecklist />
      )}

      {status === 'ready' && identity && (
        <details className="you__mesh card">
          <summary>
            <h2 className="section-eyebrow">Mesh · {onlineCount}/4 present</h2>
          </summary>
          <MeshK4 />
        </details>
      )}

      <section className="you__mood card" aria-label="How are you feeling">
        <h2 className="section-eyebrow">How are you feeling?</h2>
        <div className="you__mood-row" role="radiogroup" aria-label="Mood">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mood === m.value}
              className={`mood-button${mood === m.value ? ' mood-button--active' : ''}`}
              onClick={() => setMood(mood === m.value ? null : m.value)}
            >
              <span aria-hidden="true">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        {mood && <p className="you__mood-note">Logged “{mood}” — stay gentle with yourself.</p>}
      </section>

      <section className="you__stats card" aria-label="Your constellation">
        <h2 className="section-eyebrow">Your constellation</h2>
        <dl className="you__stats-grid">
          <div>
            <dt>Treats collected</dt>
            <dd>🍖 ×{treatsReceived}</dd>
          </div>
          {TIERS.map((tier) => {
            const value =
              tier.label === 'symmetry'
                ? `${symmetryPct}%`
                : tier.label === 'curvature'
                  ? curvature
                  : tier.label === 'topology'
                    ? meshUniform.topology === 'delta' ? 'Δ' : meshUniform.topology === 'wye' ? 'Y' : '·'
                    : `${Math.round(82 + symmetryPct / 8)}%`;
            return (
              <div key={tier.label}>
                <dt>{tier.label}</dt>
                <dd>{value}<p className="you__stat-desc">{tier.description}</p></dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="you__sensory card" aria-label="Sensory settings">
        <h2 className="section-eyebrow">How things feel</h2>

        <label className="you__slider">
          <span className="you__slider-label">
            Motion <span className="you__slider-value">{Math.round(motionScale * 100)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={motionScale}
            onChange={(e) => setMotionScale(Number(e.target.value))}
            aria-label="Motion intensity"
          />
        </label>

        <label className="you__slider">
          <span className="you__slider-label">
            Sound <span className="you__slider-value">{Math.round(soundScale * 100)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={soundScale}
            onChange={(e) => setSoundScale(Number(e.target.value))}
            aria-label="Sound volume"
          />
        </label>

        <div className="you__select-row">
          <label className="you__select">
            <span>Contrast</span>
            <select
              value={contrastTarget}
              onChange={(e) => setContrastTarget(e.target.value as typeof contrastTarget)}
              aria-label="Contrast target"
            >
              <option value="AA">AA</option>
              <option value="AAA">AAA</option>
              <option value="APCA-60">APCA 60</option>
              <option value="APCA-75">APCA 75</option>
            </select>
          </label>

          <label className="you__select">
            <span>Breath</span>
            <select
              value={breathPattern}
              onChange={(e) => setBreathPattern(e.target.value as typeof breathPattern)}
              aria-label="Breath pattern"
            >
              <option value="4-4-6">4-4-6</option>
              <option value="5-5-5">5-5-5</option>
              <option value="4-7-8">4-7-8</option>
            </select>
          </label>
        </div>

        <label className="you__toggle">
          <input
            type="checkbox"
            checked={zeitgeber.tone}
            onChange={(e) => setZeitgeber({ tone: e.target.checked })}
          />
          <span>Play 863 Hz when breathing</span>
        </label>
      </section>

      <section className="you__hatch card" aria-label="Workshop hatch">
        <h2 className="section-eyebrow">Workshop hatch</h2>
        <p className="you__hatch-copy">
          The Sovereign Workbench — contracts, catalog, MCP consoles, energy dials. Grown-up tools
          wait on the other side of this door.
        </p>
        <div className="you__hatch-actions">
          <Button type="button" variant="primary" onClick={() => navigateTo('workshop')}>
            Open the hatch
          </Button>
        </div>
      </section>
    </main>
  );
}