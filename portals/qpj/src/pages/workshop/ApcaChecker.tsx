import { useMemo, useState } from 'react';
import { calcApcaContrast, gradeApca } from './apca';
import { BRAND } from '../../lib/brand';

const PRESETS: Array<{ label: string; bg: string; fg: string }> = [
  { label: `${BRAND.sub} body`, bg: 'oklch(0.98 0.005 80)', fg: 'oklch(0.22 0.01 60)' },
  { label: 'Muted caption', bg: 'oklch(0.98 0.005 80)', fg: 'oklch(0.48 0.015 60)' },
  { label: 'Workshop dark', bg: 'oklch(0.15 0.014 75)', fg: 'oklch(0.92 0.012 80)' },
  { label: 'Accent on cream', bg: 'oklch(0.98 0.005 80)', fg: 'oklch(0.62 0.09 200)' },
  { label: 'Danger on cream', bg: 'oklch(0.98 0.005 80)', fg: 'oklch(0.58 0.14 25)' },
];

export function ApcaChecker() {
  const [bg, setBg] = useState(PRESETS[0].bg);
  const [fg, setFg] = useState(PRESETS[0].fg);

  const result = useMemo(() => {
    try {
      return { ok: true as const, ...gradeApca(calcApcaContrast(bg, fg)) };
    } catch (err) {
      return {
        ok: false as const,
        message: err instanceof Error ? err.message : 'Parse error',
      };
    }
  }, [bg, fg]);

  return (
    <div className="apca">
      <p className="wbench__lede">
        Unusual — does the text read against that ground? Backed by APCA, not an eyeball.
      </p>
      <div className="apca__inputs">
        <label className="apca__field">
          <span>Background</span>
          <input
            className="input"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            spellCheck={false}
          />
        </label>
        <label className="apca__field">
          <span>Foreground</span>
          <input
            className="input"
            value={fg}
            onChange={(e) => setFg(e.target.value)}
            spellCheck={false}
          />
        </label>
        <div className="apca__swatches">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="apca__preset"
              onClick={() => {
                setBg(p.bg);
                setFg(p.fg);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="apca__preview" style={{ background: bg, color: fg }}>
        <span className="apca__preview-large">Large text 24px</span>
        <span className="apca__preview-body">
          Body text 16px — the quick brown fox jumps over the lazy dog.
        </span>
        <span className="apca__preview-small">Small print 12px — read it or don't, your call.</span>
      </div>

      <div
        className={`apca__verdict apca__verdict--${result.ok ? result.grade : 'fail'}`}
        aria-live="polite"
      >
        {result.ok ? (
          <>
            <span className="apca__lc">{result.absLc.toFixed(1)} Lc</span>
            <span className="apca__polarity">{result.polarity}</span>
            <span className="apca__grade">{result.grade.replace(/-/g, ' ')}</span>
            <span className="apca__note">{result.note}</span>
          </>
        ) : (
          <span className="apca__note">Couldn't parse: {result.message}</span>
        )}
      </div>
    </div>
  );
}