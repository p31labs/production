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
} from '@p31ca/design-core/compositions';
import type { CatalogEntry } from '../data/catalog';

/**
 * Live preview renderers keyed by component name.
 * Every renderer is deterministic and side-effect free — no network,
 * no timers, no subscriptions — so cards can mount/unmount freely.
 * Interactive components render in a fixed "demo" state.
 *
 * Shared between grid mode (CatalogCard) and expanded brick detail (CatalogDetail).
 * Layout is class-driven (see .pv-* utilities in index.css); no inline styles.
 */
const LIVE_PREVIEWS: Record<string, () => React.ReactNode> = {
  Button: () => (
    <div className="pv-row">
      <Button variant="primary" size="sm">Primary</Button>
      <Button variant="secondary" size="sm">Secondary</Button>
      <Button variant="ghost" size="sm">Ghost</Button>
    </div>
  ),

  GlassPanel: () => (
    <GlassPanel padding="sm">
      <span className="pv-label">Glass panel content</span>
    </GlassPanel>
  ),

  GlassCard: () => (
    <GlassCard>
      <span className="pv-label">Glass card</span>
    </GlassCard>
  ),

  StatusBadge: () => (
    <div className="pv-row">
      <StatusBadge status="online" label="Online" />
      <StatusBadge status="away" label="Away" />
    </div>
  ),

  MetricBadge: () => <MetricBadge value="124" label="tokens" />,

  Topbar: () => (
    <div className="pv-scale">
      <Topbar
        brand={<span className="pv-brand">P31</span>}
        right={<span className="pv-meta">v2.3.0</span>}
      />
    </div>
  ),

  BottomNav: () => (
    <div className="pv-scale-bottomsm">
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
    <div className="pv-scale-sv">
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
    <div className="pv-cmd">
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
    <div className="pv-wide">
      <PageHeader eyebrow="System" title="Design Tokens" lede="Single source of truth." />
    </div>
  ),

  SpoonDial: () => <SpoonDial level={3} onChange={() => {}} />,

  Starfield: () => (
    <div className="pv-starfield">
      <Starfield spoons={3} />
    </div>
  ),

  CrisisOverlay: () => (
    <div className="pv-crisis">
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