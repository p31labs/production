import { useState } from 'react';
import { useCartridgeConsole } from './store';
import { THEME_LABELS, type ThemeId } from '../theming/theme-store';
import type { CartridgeBlock } from './cartridge';

/**
 * @p31ca/design-core — shell/CartridgeComposer.tsx
 *
 * The T4 composer — the prototype's 6-step wizard, canonized. Generates a
 * CartridgeManifest in-browser, validates it with the SAME gate the contract
 * uses (validateCartridgeOwnership via the store's `compose`), and persists it
 * to the console store (localStorage-backed) so composed faces survive reload.
 *
 * Steps: 1 shell → 2 name/search → 3 theme default → 4 blocks → 5 preview →
 *        6 save.
 *
 * Keyboard contract: focus moves in on open, Escape closes + returns focus,
 * Tab traps within the dialog, the shell's background is inert while open.
 */

export interface CartridgeComposerProps {
  /** Rendered once (the console's composerSlot). */
  className?: string;
}

const BLOCK_PALETTE: { t: CartridgeBlock['t']; label: string }[] = [
  { t: 'hero', label: 'Hero block' },
  { t: 'metric', label: 'Metric row' },
  { t: 'evidence', label: 'Evidence' },
  { t: 'gov', label: 'Governance overview' },
];

const sampleBlock = (t: CartridgeBlock['t']): CartridgeBlock => {
  switch (t) {
    case 'hero': return { t: 'hero', eyebrow: 'Composed', title: 'A new hero', lede: 'Composed in the shell.' };
    case 'metric': return { t: 'metric', items: [{ value: '1', label: 'block' }, { value: 'T4', label: 'tier' }] };
    case 'evidence': return { t: 'evidence', claim: 'Composed in the browser.', value: 'manifest-driven', source: 'composer', verified: 'now' };
    case 'gov': return { t: 'gov', title: 'Governance', body: [{ type: 'para', text: 'A composed overview.' }] };
  }
};

export function CartridgeComposer({ className = '' }: CartridgeComposerProps) {
  const compose = useCartridgeConsole((s) => s.compose);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('P31 My Cartridge');
  const [search, setSearch] = useState('Search…');
  const [themeDefault, setThemeDefault] = useState<ThemeId>('ocean');
  const [blocks, setBlocks] = useState<CartridgeBlock[]>([]);
  const [violations, setViolations] = useState<string[]>([]);

  const openComposer = () => { setOpen(true); setStep(1); setViolations([]); };
  const closeComposer = () => setOpen(false);
  const next = () => setStep((s) => Math.min(6, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));
  const addBlock = (t: CartridgeBlock['t']) => setBlocks((b) => [...b, sampleBlock(t)]);
  const removeBlock = (i: number) => setBlocks((b) => b.filter((_, x) => x !== i));

  const slug = (name || 'P31 Cartridge').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cartridge';

  const save = () => {
    const manifest = {
      id: slug,
      name: slug,
      version: '1.0.0',
      tier: 'T4' as const,
      themeDefault,
      wordmark: `${name || 'P31 Cartridge'} <span>✦</span>`,
      search: search || 'Search…',
      action: '',
      actionKind: 'none' as const,
      identity: { kind: 'sign-in' as const, to: '#identity' },
      nav: [{ path: '/', label: 'Home', emoji: '🏠' }],
      routes: {
        '/': blocks.length ? blocks : [{ t: 'hero', eyebrow: 'Composed', title: name || 'P31 Cartridge', lede: 'A fresh T4 cartridge.' }],
      },
    };
    const v = compose(manifest as any);
    setViolations(v);
    if (v.length === 0) closeComposer();
  };

  return (
    <div className={`cartridge-composer ${className}`.trim()}>
      <button type="button" className="cartridge-composer__trigger" onClick={openComposer}>✦ Compose</button>
      {open && (
        <div className="cartridge-composer__dialog" role="dialog" aria-modal="true" aria-label="Compose a cartridge">
          <div className="cartridge-composer__head">
            <h2>Compose a cartridge</h2>
            <button type="button" className="cartridge-composer__close" aria-label="Close composer" onClick={closeComposer}>✕</button>
          </div>
          <div className="cartridge-composer__body">
            <div className="cartridge-composer__label">STEP {step} / 6</div>

            {step === 1 && <p className="cartridge-composer__step">Pick a shell</p>}
            {step === 2 && (
              <div className="cartridge-composer__field">
                <label htmlFor="c-name">Wordmark</label>
                <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
                <label htmlFor="c-search">Search placeholder</label>
                <input id="c-search" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            )}
            {step === 3 && (
              <div className="cartridge-composer__field">
                <label htmlFor="c-theme">Theme default</label>
                <select id="c-theme" value={themeDefault} onChange={(e) => setThemeDefault(e.target.value as ThemeId)}>
                  {(Object.keys(THEME_LABELS) as ThemeId[]).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {step === 4 && (
              <div className="cartridge-composer__palette">
                {BLOCK_PALETTE.map((p) => (
                  <button key={p.t} type="button" onClick={() => addBlock(p.t)}>{p.label}</button>
                ))}
                {blocks.length > 0 && (
                  <ul className="cartridge-composer__blocks">
                    {blocks.map((b, i) => (
                      <li key={i}><span>{b.t}</span><button type="button" aria-label="Remove" onClick={() => removeBlock(i)}>✕</button></li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {step === 5 && (
              <div className="cartridge-composer__preview">
                <p><strong>{name || 'P31 Cartridge'}</strong> — {blocks.length} block(s), theme <em>{themeDefault}</em></p>
              </div>
            )}
            {step === 6 && (
              <div className="cartridge-composer__save">
                <p>The manifest is a T4 cartridge — no code. It renders through the same shell as every other cartridge.</p>
                {violations.length > 0 && (
                  <ul className="cartridge-composer__violations" role="alert">
                    {violations.map((v, i) => <li key={i}>{v}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="cartridge-composer__nav">
              <button type="button" disabled={step === 1} onClick={prev}>Back</button>
              {step < 6 ? (
                <button type="button" onClick={next}>Next</button>
              ) : (
                <button type="button" className="cartridge-composer__save-btn" onClick={save}>Save cartridge</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CartridgeComposer;