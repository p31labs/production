import { useState } from 'react';

interface BondingPageProps {
  active: boolean;
  sovereignEnabled: boolean;
  onMintLove: (type: string, meta?: Record<string, unknown>) => Promise<boolean>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const ATOMS = ['H', 'C', 'N', 'O', 'P', 'Ca', 'S', 'Fe'];
const VALENCES: Record<string, number> = { H: 1, C: 4, N: 3, O: 2, P: 5, Ca: 2, S: 2, Fe: 3 };
const WEIGHTS: Record<string, number> = { H: 1, C: 4, N: 5, O: 3, P: 8, Ca: 10, S: 6, Fe: 12 };

export default function BondingPage({ active, sovereignEnabled, onMintLove, showToast }: BondingPageProps) {
  const [molecule, setMolecule] = useState<string[]>([]);

  const selectAtom = (atom: string) => {
    setMolecule((prev) => [...prev, atom]);
  };

  const clearMolecule = () => {
    setMolecule([]);
  };

  const submitMolecule = () => {
    if (molecule.length === 0) {
      showToast('Empty molecule!', 'error');
      return;
    }
    const counts: Record<string, number> = {};
    molecule.forEach((a) => { counts[a] = (counts[a] || 0) + 1; });
    const formula = Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([a, c]) => `${a}${c > 1 ? c : ''}`)
      .join('');
    const score = molecule.reduce((s, a) => s + WEIGHTS[a], 0);
    const totalV = molecule.reduce((s, a) => s + VALENCES[a], 0);
    const stable = totalV % 2 === 0;
    const valid = stable;
    const msg = valid ? `Stable ${formula}` : `Unstable ${formula}`;

    if (valid && sovereignEnabled) {
      onMintLove('MOLECULE_COMPLETE', { formula, score });
      showToast(`✅ ${msg} +${score} LOVE`, 'success');
    } else {
      showToast(valid ? `✅ ${msg}` : `❌ ${msg}`, valid ? 'success' : 'error');
    }
    setMolecule([]);
  };

  return (
    <div className={`page${active ? ' active' : ''}`} id="page-bonding" role="tabpanel">
      <div className="bento-grid">
        <div className="card col-span-full">
          <div className="card-header">BONDING: Synthesizer</div>
          <div className="molecule-display" id="ui-molecule">
            {molecule.length ? molecule.join('') : '-'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--p31-space-sm)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--site-text-dim)' }}>Select atoms to build stable compounds.</div>
            <div style={{ display: 'flex', gap: 'var(--p31-space-sm)' }}>
              <button className="btn secondary" onClick={clearMolecule}>Clear</button>
              <button className="btn" onClick={submitMolecule}>Synthesize</button>
            </div>
          </div>
          <div className="atom-palette">
            {ATOMS.map((atom) => (
              <button
                key={atom}
                className={`atom-btn${molecule.includes(atom) ? ' selected' : ''}`}
                onClick={() => selectAtom(atom)}
                style={{
                  color: atom === 'P' ? 'var(--site-accent-alt)' : undefined,
                  borderColor: atom === 'P' ? 'rgba(167,139,250,0.4)' : undefined,
                }}
              >
                {atom}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
