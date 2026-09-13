import {
  Button,
  StatusBadge,
  MetricBadge,
  SpoonDial,
  GlassCard,
  GlassPanel,
  Topbar,
} from '@p31/design-core/compositions';
import { useState } from 'react';
import { useSpoonsStore } from '../../lib/useSpoonsStore';
import { PageHeader } from '@p31/design-core/compositions';
import P31Icon from '../icons/P31Icon';

const CATALOG: { name: string; tag: string; group: string; desc: string }[] = [
  { name: 'Topbar', tag: 'Chrome', group: 'Layout', desc: 'Glass command bar with brand, status, and adaptive controls.' },
  { name: 'BottomNav', tag: 'Chrome', group: 'Layout', desc: 'Mobile-first fixed navigation with active state.' },
  { name: 'SectionStrip', tag: 'Chrome', group: 'Layout', desc: 'Desktop pill navigation row.' },
  { name: 'SpoonDial', tag: 'Spoon ladder', group: 'Neuroinclusion', desc: '0–5 cognitive load dial; 0 triggers crisis mode.' },
  { name: 'CrisisOverlay', tag: 'Crisis', group: 'Neuroinclusion', desc: 'Full-screen rest state — animation stillness at 0 spoons.' },
  { name: 'Chameleon', tag: 'Theming', group: 'Tokens', desc: 'Brand × world × age × sensory swaps without reload.' },
  { name: 'Button', tag: 'Input', group: 'Actions', desc: 'Primary / secondary / ghost with sm–lg sizes.' },
  { name: 'GlassCard', tag: 'Surface', group: 'Glass 2.0', desc: 'Backdrop-blur elevated card for content tiles.' },
  { name: 'GlassPanel', tag: 'Surface', group: 'Glass 2.0', desc: 'Workbench-grade glass container.' },
  { name: 'StatusBadge', tag: 'Status', group: 'Feedback', desc: 'Online / offline / busy / away with status dot.' },
  { name: 'MetricBadge', tag: 'Status', group: 'Feedback', desc: 'Compact live value + label readout.' },
  { name: 'CommandPalette', tag: 'Navigation', group: 'Layout', desc: '⌘K search across sections and routes.' },
];

export default function Components() {
  const spoons = useSpoonsStore((s) => s.spoons);
  const setSpoons = useSpoonsStore((s) => s.setSpoons);
  const [toast, setToast] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText('@p31/design-core/compositions');
    setToast(true);
    window.setTimeout(() => setToast(false), 1800);
  };

  return (
    <>
      <PageHeader
        eyebrow="Canonical catalog"
        title="Components"
        lede="Live primitives from @p31/design-core — every one rendered with its canonical composition and recipes CSS."
      >
        <Button variant="secondary" size="md" onClick={copy}>
          <P31Icon name="tokens" size={15} />
          Copy package
        </Button>
      </PageHeader>

      <section className="catalog-grid" aria-label="Component catalog">
        {CATALOG.map((c) => (
          <div key={c.name} className="component-card">
            <div className="component-card-head">
              <span className="component-card-name font-mono">{c.name}</span>
              <StatusBadge status={c.tag === 'Crisis' ? 'busy' : c.group === 'Neuroinclusion' ? 'online' : 'online'} label={c.tag} />
            </div>
            <p className="component-card-desc">{c.desc}</p>
            <span className="component-card-group">{c.group}</span>
          </div>
        ))}
      </section>

      <section className="portal-section" aria-label="Live examples">
        <div className="section-head">
          <span className="section-eyebrow">Live</span>
          <h2>Canonical compositions</h2>
          <p>These are the actual building blocks powering this portal — no mocked previews.</p>
        </div>
        <div className="example-stack">
          <GlassPanel strong> 
            <div className="example-row">
              <StatusBadge status="online" />
              <StatusBadge status="offline" label="Idle" />
              <StatusBadge status="busy" label="Crisis" />
              <StatusBadge status="away" label="Away" />
            </div>
            <div className="example-row">
              <MetricBadge value="124" label="tokens" icon={<span className="status-dot" />} />
              <MetricBadge value="5" label="worlds" icon={<span className="status-dot offline" />} />
            </div>
          </GlassPanel>

          <GlassPanel strong>
            <div className="example-row">
              <SpoonDial level={spoons} onChange={setSpoons} />
            </div>
            <p className="example-hint">Spoon level: {spoons} · 0 rests the whole portal.</p>
          </GlassPanel>

          <GlassPanel strong>
            <div className="example-row">
              <Button variant="primary" size="sm">Primary</Button>
              <Button variant="secondary" size="md">Secondary</Button>
              <Button variant="ghost" size="lg">Ghost</Button>
            </div>
          </GlassPanel>

          <GlassCard strong>
            <div className="component-card">
              <div className="component-card-head">
                <span className="component-card-name font-mono">GlassCard</span>
                <StatusBadge status="online" label="Surface" />
              </div>
              <p className="component-card-desc">
                Cards are the default tile above the void — border, blur, and a glow that follows the accent.
              </p>
            </div>
          </GlassCard>

          <GlassPanel strong>
            <div className="topbar-replica" aria-hidden="true">
              <Topbar
                brand={<span style={{ color: 'var(--p31-accent)', fontWeight: 800 }}>P31</span>}
                right={
                  <>
                    <StatusBadge status="online" />
                    <MetricBadge value="124" label="tokens" />
                  </>
                }
              />
            </div>
          </GlassPanel>
        </div>
      </section>

      <section className="portal-section" aria-label="Installation">
        <div className="section-head">
          <span className="section-eyebrow">Install</span>
          <h2>Import path</h2>
        </div>
        <GlassPanel strong>
          <pre className="code-line">import {'{ Topbar, BottomNav, Button, GlassCard, StatusBadge }'} from '@p31/design-core/compositions'</pre>
          <pre className="code-line">import '@p31/design-core/css/all.css'</pre>
        </GlassPanel>
      </section>

      {toast && <div className="portal-toast" role="status">Copied @p31/design-core/compositions</div>}
    </>
  );
}