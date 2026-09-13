import {
  Button,
  GlassPanel,
  GlassCard,
  StatusBadge,
  MetricBadge,
  Topbar,
  BottomNav,
  Footer,
  SectionStrip,
  CommandPalette,
  Chameleon,
  PageHeader,
  SpoonDial,
  Starfield,
  CrisisOverlay,
} from '@p31/design-core/compositions';
import type { CatalogEntry } from '../data/catalog';

/**
 * Live preview renderers keyed by component name.
 * Every renderer is deterministic and side-effect free — no network,
 * no timers, no subscriptions — so cards can mount/unmount freely.
 * Interactive components render in a fixed "demo" state.
 *
 * Shared between grid mode (CatalogCard) and expanded brick detail (CatalogDetail).
 */
const LIVE_PREVIEWS: Record<string, () => React.ReactNode> = {
  Button: () => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
      <Button variant="primary" size="sm">Primary</Button>
      <Button variant="secondary" size="sm">Secondary</Button>
      <Button variant="ghost" size="sm">Ghost</Button>
    </div>
  ),

  GlassPanel: () => (
    <GlassPanel padding="sm">
      <span style={{ fontSize: 12 }}>Glass panel content</span>
    </GlassPanel>
  ),

  GlassCard: () => (
    <GlassCard>
      <span style={{ fontSize: 12 }}>Glass card</span>
    </GlassCard>
  ),

  StatusBadge: () => (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
      <StatusBadge status="online" label="Online" />
      <StatusBadge status="away" label="Away" />
    </div>
  ),

  MetricBadge: () => <MetricBadge value="124" label="tokens" />,

  Topbar: () => (
    <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
      <Topbar
        brand={<span style={{ fontWeight: 700, fontSize: 12 }}>P31</span>}
        right={<span style={{ fontSize: 10, opacity: 0.6 }}>v2.3.0</span>}
      />
    </div>
  ),

  BottomNav: () => (
    <div style={{ transform: 'scale(0.85)', transformOrigin: 'bottom center' }}>
      <BottomNav
        items={[
          { icon: <span>⌂</span>, label: 'Home', onClick: () => {} },
          { icon: <span>▤</span>, label: 'Docs', onClick: () => {} },
          { icon: <span>◆</span>, label: 'Lab', onClick: () => {} },
        ]}
        activeIndex={0}
      />
    </div>
  ),

  Footer: () => (
    <div style={{ transform: 'scale(0.7)', transformOrigin: 'top center' }}>
      <Footer
        brandLabel="P31 Labs"
        tagline="Sovereign, neuroinclusive interface."
        legalText="AGPL-3.0"
        columns={[
          { title: 'System', links: [{ label: 'Tokens', href: '#' }] },
          { title: 'Explore', links: [{ label: 'Brands', href: '#' }] },
        ]}
      />
    </div>
  ),

  SectionStrip: () => (
    <SectionStrip
      items={[
        { id: 'home', label: 'Home', active: true },
        { id: 'tokens', label: 'Tokens' },
        { id: 'brands', label: 'Brands' },
      ]}
      onSelect={() => {}}
    />
  ),

  CommandPalette: () => (
    <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center', width: 280, height: 160, overflow: 'hidden' }}>
      <CommandPalette
        open
        onClose={() => {}}
        items={[
          { id: 'tokens', label: 'Browse tokens', description: 'Color, type, spacing' },
          { id: 'components', label: 'Components', description: 'Gallery' },
        ]}
        onSelect={() => {}}
        placeholder="Search…"
      />
    </div>
  ),

  Chameleon: () => <Chameleon />,

  PageHeader: () => (
    <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%' }}>
      <PageHeader eyebrow="System" title="Design Tokens" lede="Single source of truth." />
    </div>
  ),

  SpoonDial: () => <SpoonDial level={3} onChange={() => {}} />,

  Starfield: () => (
    <div style={{ width: 180, height: 80, overflow: 'hidden', borderRadius: 8 }}>
      <Starfield spoons={3} />
    </div>
  ),

  CrisisOverlay: () => (
    <div style={{ position: 'relative', width: 200, height: 100, overflow: 'hidden', borderRadius: 8, background: 'var(--p31-void, #0a0a0f)' }}>
      <CrisisOverlay visible message="Rest." buttonLabel="Ready" onReady={() => {}} />
    </div>
  ),
};

export function PreviewRenderer({ component }: { component: CatalogEntry }) {
  const LivePreview = LIVE_PREVIEWS[component.name];
  if (!LivePreview) return null;
  return <LivePreview />;
}

export function hasLivePreview(name: string): boolean {
  return Boolean(LIVE_PREVIEWS[name]);
}
