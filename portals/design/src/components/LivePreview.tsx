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
  PageHeader,
  SpoonDial,
  Chameleon,
} from '@p31/design-core/compositions';

type Renderer = () => React.ReactElement;

/**
 * Deterministic, side-effect-free live previews keyed by contract name.
 * Compositions with global side effects (focus steal, synchronous
 * data-spoons writes, perpetual rAF loops) are rendered as local,
 * token-styled mocks so the catalog never fights the real shell.
 */
const PREVIEWS: Record<string, Renderer> = {
  Button: () => (
    <div className="catalog-preview-row">
      <Button variant="primary" size="sm">Primary</Button>
      <Button variant="secondary" size="md">Secondary</Button>
      <Button variant="ghost" size="lg">Ghost</Button>
    </div>
  ),

  GlassPanel: () => (
    <GlassPanel strong className="catalog-preview-max">
      <span className="catalog-preview-text">Glassmorphism 2.0 — clean host frame, chrome only.</span>
    </GlassPanel>
  ),

  GlassCard: () => (
    <GlassCard strong className="catalog-preview-max">
      <div className="catalog-preview-text">
        <strong style={{ color: 'var(--p31-text)' }}>GlassCard</strong>
        <div className="catalog-preview-text--muted">Backdrop-blur tile above the void.</div>
      </div>
    </GlassCard>
  ),

  Topbar: () => (
    <div className="catalog-preview-max">
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
  ),

  BottomNav: () => (
    <BottomNav
      items={[
        { icon: <span aria-hidden="true">⌂</span>, label: 'Home' },
        { icon: <span aria-hidden="true">◆</span>, label: 'Tokens' },
        { icon: <span aria-hidden="true">▤</span>, label: 'Glass' },
      ]}
      activeIndex={0}
    />
  ),

  SectionStrip: () => (
    <SectionStrip
      items={[
        { id: '/tokens', label: 'Tokens' },
        { id: '/components', label: 'Components' },
        { id: '/glass', label: 'Glass Lab' },
      ]}
      onSelect={() => {}}
    />
  ),

  PageHeader: () => (
    <div className="catalog-preview-max">
      <PageHeader eyebrow="System" title="Design Tokens" lede="Single source of truth." />
    </div>
  ),

  Footer: () => (
    <Footer
      columns={[
        { title: 'System', links: [{ label: 'Tokens', href: '/tokens' }] },
        { title: 'Explore', links: [{ label: 'Glass Lab', href: '/glass' }] },
      ]}
    />
  ),

  StatusBadge: () => (
    <div className="catalog-preview-row">
      <StatusBadge status="online" label="Live" />
      <StatusBadge status="away" label="Away" />
      <StatusBadge status="busy" label="Crisis" />
    </div>
  ),

  MetricBadge: () => (
    <div className="catalog-preview-row">
      <MetricBadge value="124" label="tokens" />
      <MetricBadge value="17" label="components" />
    </div>
  ),

  SpoonDial: () => <SpoonDial level={3} onChange={() => {}} />,

  Chameleon: () => <Chameleon />,

  CommandPalette: () => (
    <div className="catalog-preview-max">
      <div className="catalog-preview-cmdk">
        <span className="catalog-preview-search" aria-hidden="true">⌕</span>
        <input
          value="Search components, tokens…"
          readOnly
          aria-label="Command palette placeholder search"
          className="catalog-preview-cmdk-input"
        />
      </div>
    </div>
  ),

  Starfield: () => (
    <div className="catalog-preview-starfield" aria-hidden="true">
      <span className="catalog-preview-starfield__core" />
    </div>
  ),

  CrisisOverlay: () => (
    <div className="catalog-preview-crisis" role="alert">
      <span className="catalog-preview-crisis__bar" aria-hidden="true" />
      <strong className="catalog-preview-crisis__title">Critical System State</strong>
      <p className="catalog-preview-crisis__text">The simulation boundaries have degraded. Immediate realignment required.</p>
      <div className="catalog-preview-row">
        <span className="catalog-preview-crisis__btn">Realign</span>
        <span className="catalog-preview-crisis__btn catalog-preview-crisis__btn--ghost">Dismiss</span>
      </div>
    </div>
  ),

  ScreenReaderBlock: () => (
    <div className="catalog-preview-text--muted">aria-live region — contracts the announce state.</div>
  ),

  MotionGuard: () => (
    <div className="catalog-preview-text--muted">One switch. Every transition becomes an instant cut.</div>
  ),
};

export function LivePreview({ name }: { name: string }) {
  const render = PREVIEWS[name];
  if (!render) {
    return (
      <div className="catalog-preview-fallback">
        <span>{name}</span>
        <span className="catalog-preview-text--muted">no live renderer</span>
      </div>
    );
  }
  return render();
}