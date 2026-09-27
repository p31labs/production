import { useState } from 'react';
import {
  Button,
  StatusBadge,
  MetricBadge,
  SpoonDial,
  GlassCard,
  GlassPanel,
  Topbar,
  PageHeader,
} from '@p31ca/design-core/compositions';
import { useQpjStore } from '../../store/useQpjStore';

const CATALOG: { name: string; tag: string; group: string; desc: string }[] = [
  { name: 'Topbar', tag: 'Chrome', group: 'Layout', desc: 'Glass command bar with brand, status, and adaptive controls.' },
  { name: 'BottomNav', tag: 'Chrome', group: 'Layout', desc: 'Mobile-first fixed navigation with active state.' },
  { name: 'SectionStrip', tag: 'Chrome', group: 'Layout', desc: 'Desktop pill navigation row.' },
  { name: 'SpoonDial', tag: 'Spoon ladder', group: 'Neuroinclusion', desc: '0–5 cognitive load dial; 0 triggers rest mode.' },
  { name: 'CrisisOverlay', tag: 'Crisis', group: 'Neuroinclusion', desc: 'Full-screen rest state — animation stillness at 0 spoons.' },
  { name: 'Chameleon', tag: 'Theming', group: 'Tokens', desc: 'Brand × world × age × sensory swaps without reload.' },
  { name: 'Button', tag: 'Input', group: 'Actions', desc: 'Primary / secondary / ghost with sm–lg sizes.' },
  { name: 'GlassCard', tag: 'Surface', group: 'Glass 2.0', desc: 'Backdrop-blur elevated card for content tiles.' },
  { name: 'GlassPanel', tag: 'Surface', group: 'Glass 2.0', desc: 'Workbench-grade glass container.' },
  { name: 'StatusBadge', tag: 'Status', group: 'Feedback', desc: 'Online / offline / busy / away with status dot.' },
  { name: 'MetricBadge', tag: 'Status', group: 'Feedback', desc: 'Compact live value + label readout.' },
  { name: 'CommandPalette', tag: 'Navigation', group: 'Layout', desc: '⌘K search across sections and routes.' },
];

export function ComponentCatalog() {
  const spoons = useQpjStore((s) => s.spoons);
  const setSpoons = useQpjStore((s) => s.setSpoons);
  const showToast = useQpjStore((s) => s.showToast);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText('@p31ca/design-core/compositions');
    setCopied(true);
    showToast('Copied the import path', 'success');
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="catalog">
      <div className="catalog__toolbar">
        <PageHeader
          eyebrow="Canonical catalog"
          title="Components"
          lede="Live primitives from @p31ca/design-core — every one rendered with its canonical composition and recipes CSS."
        />
        <Button variant="secondary" size="md" onClick={copy}>
          <span aria-hidden="true">⎘</span> Copy package
        </Button>
      </div>

      <section className="catalog-grid" aria-label="Component catalog">
        {CATALOG.map((c) => (
          <div key={c.name} className="component-card">
            <div className="component-card-head">
              <span className="component-card-name mono">{c.name}</span>
              <StatusBadge status="online" label={c.tag} />
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
              <MetricBadge value="124" label="tokens" />
              <MetricBadge value="5" label="worlds" />
            </div>
          </GlassPanel>

          <GlassPanel strong>
            <div className="example-row">
              <SpoonDial level={spoons} onChange={setSpoons} />
            </div>
            <p className="example-hint">
              Spoon level: {spoons} · 0 rests the whole portal.
            </p>
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
                <span className="component-card-name mono">GlassCard</span>
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
                brand={<span className="catalog__brand">P31</span>}
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

      {copied && (
        <p className="catalog__copied" role="status">
          Copied @p31ca/design-core/compositions
        </p>
      )}
    </div>
  );
}