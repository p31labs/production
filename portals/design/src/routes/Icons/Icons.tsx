import { useState } from 'react';
import { GlassPanel } from '@p31/design-core/compositions';
import { PageHeader } from '@p31/design-core/compositions';
import P31Icon, { ICON_NAMES, type IconName } from '../../components/icons/P31Icon';

export default function Icons() {
  const [toast, setToast] = useState<string | null>(null);

  const copy = (name: IconName) => {
    const snippet = `<P31Icon name="${name}" size={20} />`;
    navigator.clipboard?.writeText(snippet);
    setToast(snippet);
    window.setTimeout(() => setToast(null), 1600);
  };

  return (
    <>
      <PageHeader
        eyebrow="Icon system"
        title="Icons"
        lede="Inline, stroked SVGs — 1.8px strokes, round caps, currentColor. No lucide dependency, no font icons."
      />

      <section className="portal-section" aria-label="Gallery">
        <div className="icon-grid">
          {ICON_NAMES.map((name) => (
            <button key={name} className="icon-cell" onClick={() => copy(name)} aria-label={`Copy ${name} icon`}>
              <P31Icon name={name} size={22} />
              <span className="font-mono">{name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="portal-section" aria-label="Usage">
        <div className="section-head">
          <span className="section-eyebrow">Usage</span>
          <h2>Import</h2>
        </div>
        <GlassPanel strong>
          <pre className="code-line">{'import P31Icon, { type IconName } from "../icons/P31Icon"'}</pre>
          <pre className="code-line">{'<P31Icon name="sparkles" size={16} />  // inherits color via currentColor'}</pre>
        </GlassPanel>
      </section>

      {toast && <div className="portal-toast" role="status">Copied {toast}</div>}
    </>
  );
}