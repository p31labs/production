import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  Button,
  GlassPanel,
  GlassCard,
  StatusBadge,
  MetricBadge,
  Topbar,
  BottomNav,
  SectionStrip,
  PageHeader,
  Footer,
  SpoonDial,
  Chameleon,
  Badge,
  Card,
  Checkbox,
  Crown,
  CandyHeader,
  Dropdown,
} from '@p31ca/design-core/compositions';
import { COMPONENT_CATALOG } from '@p31ca/design-core/genui/catalog';
import { LiveExample } from '../../lib/livePreview';
import { fadeIn, slideUp, staggerChildren, press } from '../../lib/motionPresets';
import { SurfaceLayout, SurfaceHero, SurfaceSection, SurfaceGrid } from '../../lib/surface';
import { spoonCostFor, lovePrice, type ShopItem } from '../../data/marketplace';
import MarketplaceCard from '../../components/MarketplaceCard';
import P31Icon from '../../components/icons/P31Icon';
import '../../surfaces/marketplace.css';

interface RawEntry {
  name: string;
  description: string;
  category?: string;
  status?: 'stable' | 'beta' | 'deprecated';
  importPath?: string;
  source?: 'canonical' | 'generated';
  tokens?: string[];
  variants?: string[];
  slots?: string[];
  accessibility?: string[];
  cssClass?: string;
  version?: string;
  stories?: Array<{ name: string; snippet: string }>;
}

export interface CatalogEntry {
  name: string;
  description: string;
  category: string;
  status: 'stable' | 'beta' | 'deprecated';
  importPath: string;
  source: 'canonical' | 'generated';
  tokens: string[];
  variants: string[];
  slots: string[];
  a11y: string[];
  cssClass: string;
  version: string;
  snippet: string;
}

export type RenderProps = Record<string, unknown>;

/** The real package specifier is @p31ca/design-core; the genui catalog emits @p31/… */
function normalizeImport(path: string): string {
  return path.replace(/^@p31\//, '@p31ca/').replace(/\/generated$/, '');
}

const CATEGORY_ORDER = ['surface', 'navigation', 'action', 'feedback', 'accessibility', 'ambient'];

/** The full 33-entry genui canon, normalized and import-resolvable. */
export const CATALOG_ENTRIES: CatalogEntry[] = (COMPONENT_CATALOG as unknown as RawEntry[]).map((e) => ({
  name: e.name,
  description: e.description,
  category: e.category ?? 'surface',
  status: e.status ?? 'stable',
  importPath: normalizeImport(e.importPath ?? '@p31ca/design-core/generated'),
  source: e.source ?? 'canonical',
  tokens: e.tokens ?? [],
  variants: e.variants ?? [],
  slots: e.slots ?? [],
  a11y: e.accessibility ?? [],
  cssClass: e.cssClass ?? '',
  version: e.version ?? '3.0.0',
  snippet: (e.stories ?? [])[0]?.snippet ?? `<${e.name} />`,
}));

export const CATEGORIES = [
  'all',
  ...CATEGORY_ORDER.filter((c) => CATALOG_ENTRIES.some((e) => e.category === c)),
];

export const ENTRY_BY_NAME = new Map(CATALOG_ENTRIES.map((e) => [e.name, e]));

export function entryOf(name: string): CatalogEntry {
  return ENTRY_BY_NAME.get(name) ?? CATALOG_ENTRIES[0];
}

/** Deterministic LOVE + spoon pricing (shared formula with data/marketplace). */
function toShopItem(e: CatalogEntry): ShopItem {
  const spoon = spoonCostFor(e.category);
  return {
    name: e.name,
    description: e.description,
    category: e.category,
    status: e.status,
    importPath: e.importPath,
    source: e.source,
    spoonCost: spoon,
    lovePrice: lovePrice(e.name, spoon, e.category),
    tokens: e.tokens,
    variants: e.variants,
    slots: e.slots,
    states: e.variants.length > 0 ? [...e.variants] : ['default'],
    a11y: e.a11y,
    cssClass: e.cssClass,
  };
}

/** Curated shop line-up: 16 canon pieces spanning every category (all stable/beta). */
const CURATED_NAMES = [
  'Button',
  'GlassPanel',
  'GlassCard',
  'StatusBadge',
  'MetricBadge',
  'Topbar',
  'BottomNav',
  'PageHeader',
  'SectionStrip',
  'SpoonDial',
  'Footer',
  'Chameleon',
  'Starfield',
  'CommandPalette',
  'Badge',
  'SpoonMeter',
];

export const SHOP_ITEMS: ShopItem[] = CURATED_NAMES
  .map((n) => ENTRY_BY_NAME.get(n))
  .filter((e): e is CatalogEntry => Boolean(e))
  .map(toShopItem);

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * The safe-render registry — compositions that are side-effect-free enough to
 * mount inside a LiveExample (no focus steal, no rAF loop, no store writes).
 * Everything else falls back to a live token-preview tile.
 */
const SAFE_RENDERERS: Record<string, (p: RenderProps) => ReactNode> = {
  Button: (p) => (
    <div className="catalog-preview-row">
      <Button
        variant={oneOf(p.variant, ['primary', 'secondary', 'ghost'] as const, 'primary')}
        size={oneOf(p.size, ['sm', 'md', 'lg'] as const, 'md')}
      >
        {String(p.label ?? 'Save changes')}
      </Button>
    </div>
  ),
  GlassPanel: (p) => (
    <GlassPanel strong={Boolean(p.strong)} className="qm-preview-fill">
      <span className="preview-box__text">
        {String(p.text ?? 'Glassmorphism 2.0 — clean host frame, chrome only.')}
      </span>
    </GlassPanel>
  ),
  GlassCard: (p) => (
    <GlassCard strong={Boolean(p.strong)} className="qm-preview-fill">
      <span className="preview-box__text">{String(p.text ?? 'Elevated tile above the void.')}</span>
    </GlassCard>
  ),
  StatusBadge: (p) => (
    <div className="catalog-preview-row">
      <StatusBadge
        status={oneOf(p.status, ['online', 'offline', 'busy', 'away'] as const, 'online')}
        label={String(p.label ?? 'Live')}
      />
      <StatusBadge status="busy" label="Crisis" />
      <StatusBadge status="away" label="Away" />
    </div>
  ),
  MetricBadge: (p) => (
    <div className="catalog-preview-row">
      <MetricBadge value={String(p.value ?? 124)} label={String(p.label ?? 'tokens')} />
      <MetricBadge value="17" label="components" />
    </div>
  ),
  SectionStrip: () => (
    <SectionStrip
      items={[
        { id: '/tokens', label: 'Tokens', active: true },
        { id: '/components', label: 'Components' },
        { id: '/glass', label: 'Glass Lab' },
      ]}
      onSelect={() => undefined}
    />
  ),
  PageHeader: (p) => (
    <div className="qm-preview-fill">
      <PageHeader
        eyebrow={String(p.eyebrow ?? 'System')}
        title={String(p.title ?? 'Design Tokens')}
        lede={String(p.lede ?? 'Single source of truth.')}
      />
    </div>
  ),
  Footer: (p) => (
    <Footer
      brandLabel={String(p.brandLabel ?? 'P31 Labs')}
      tagline="Sovereign, neuroinclusive interface foundation."
      columns={[
        { title: 'System', links: [{ label: 'Tokens', href: '/tokens' }, { label: 'Components', href: '/components' }] },
        { title: 'Explore', links: [{ label: 'Glass Lab', href: '/glass' }, { label: 'Brands', href: '/brands' }] },
      ]}
    />
  ),
  SpoonDial: (p) => <SpoonDial level={Number(p.level ?? 3)} onChange={() => undefined} />,
  Topbar: () => (
    <div className="qm-preview-fill">
      <Topbar
        brand={<span className="qm-preview-brand">P31</span>}
        right={<StatusBadge status="online" label="Live" />}
      />
    </div>
  ),
  BottomNav: () => (
    <BottomNav
      items={[
        { icon: <span aria-hidden="true">⌂</span>, label: 'Home', active: true },
        { icon: <span aria-hidden="true">◆</span>, label: 'Tokens' },
        { icon: <span aria-hidden="true">▤</span>, label: 'Glass' },
      ]}
      activeIndex={0}
    />
  ),
  Chameleon: () => <Chameleon />,
  Badge: (p) => (
    <div className="catalog-preview-row">
      <Badge tone={oneOf(p.tone, ['success', 'warning', 'error', 'info', 'neutral'] as const, 'success')}>
        {String(p.label ?? 'online')}
      </Badge>
      <Badge tone="info">beta</Badge>
      <Badge tone="neutral">stable</Badge>
    </div>
  ),
  Card: (p) => (
    <div className="qm-preview-fill">
      <Card
        padding={oneOf(p.padding, ['sm', 'md', 'lg'] as const, 'md')}
        interactive={Boolean(p.interactive)}
        title={String(p.title ?? 'Glass card')}
        description={String(p.description ?? 'Elevated surface with an optional interactive affordance.')}
      >
        <span className="preview-box__text">{String(p.text ?? 'A card body — tokens, glass, and a quiet frame.')}</span>
      </Card>
    </div>
  ),
  Checkbox: (p) => (
    <div className="catalog-preview-row">
      <Checkbox
        label={String(p.label ?? 'Subscribe to care digests')}
        checked={Boolean(p.checked)}
        indeterminate={Boolean(p.indeterminate)}
      />
    </div>
  ),
  Crown: (p) => (
    <div className="catalog-preview-row">
      <Crown label={String(p.label ?? 'P31')} />
    </div>
  ),
  CandyHeader: (p) => (
    <div className="qm-preview-fill">
      <CandyHeader
        eyebrow={String(p.eyebrow ?? 'System')}
        title={String(p.title ?? 'Candy Header')}
        lede={String(p.lede ?? 'A candy-rounded glass header for the sovereign stack.')}
      />
    </div>
  ),
  Dropdown: (p) => (
    <div className="catalog-preview-row">
      <Dropdown
        label={String(p.label ?? 'Action')}
        ariaLabel={String(p.label ?? 'Action')}
        value="save"
        options={[
          { value: 'save', label: 'Save' },
          { value: 'duplicate', label: 'Duplicate' },
          { value: 'delete', label: 'Delete' },
        ]}
      />
    </div>
  ),
};

/** Editable props exposed by the LiveExample control strip for safe renders. */
export const SAFE_PROPS: Record<string, RenderProps> = {
  Button: { label: 'Save changes', variant: 'primary' },
  GlassPanel: { strong: true, text: 'Glassmorphism 2.0 — clean host frame, chrome only.' },
  GlassCard: { strong: true, text: 'Elevated tile above the void.' },
  StatusBadge: { status: 'online', label: 'Live' },
  MetricBadge: { value: '124', label: 'tokens' },
  PageHeader: { eyebrow: 'System', title: 'Design Tokens', lede: 'Single source of truth for color, type, space, and motion.' },
  Footer: { brandLabel: 'P31 Labs' },
  SpoonDial: { level: 3 },
  Badge: { tone: 'success', label: 'online' },
  Card: { padding: 'md', interactive: true, title: 'Glass card', description: 'Elevated surface with an optional interactive affordance.', text: 'A card body — tokens, glass, and a quiet frame.' },
  Checkbox: { label: 'Subscribe to care digests', checked: true, indeterminate: false },
  Crown: { label: 'P31' },
  CandyHeader: { eyebrow: 'System', title: 'Candy Header', lede: 'A candy-rounded glass header for the sovereign stack.' },
  Dropdown: { label: 'Action' },
};

/** Token-preview tile — themed "no live preview" state for components without
 *  a safe render. Distinct per component: its name, its cssClass applied to a
 *  swatch surface, and its own token chips (not a shared 3-dot pattern). */
export function TokenPreviewTile({ name, cssClass, tokens }: { name: string; cssClass: string; tokens: string[] }) {
  return (
    <div className="qm-token-tile" data-mcp-tool={`tokenPreview-${name.toLowerCase()}`} data-mcp-state="ready">
      <span className="qm-token-tile__mono">{name}</span>
      <span className="qm-token-tile__tag">no live preview</span>
      {tokens.length > 0 && (
        <div className="meta-row qm-token-tile__chips">
          {tokens.slice(0, 4).map((t) => (
            <span key={t} className="chip chip--micro">
              {t}
            </span>
          ))}
        </div>
      )}
      <span className="qm-token-tile__cssname">{cssClass || name.toLowerCase()}</span>
    </div>
  );
}

/** Render a catalog entry live: safe registry if available, else the token tile. */
export function renderEntry(e: CatalogEntry, props: RenderProps = {}): ReactNode {
  const r = SAFE_RENDERERS[e.name];
  if (r) return r(props);
  return <TokenPreviewTile name={e.name} cssClass={e.cssClass} tokens={e.tokens} />;
}

/** import + canonical JSX snippet for the code toggle. */
export function codeFor(e: CatalogEntry): string {
  return `import { ${e.name} } from '${e.importPath}'\n\n${e.snippet}`;
}

export default function Marketplace() {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: SHOP_ITEMS.length };
    for (const it of SHOP_ITEMS) c[it.category] = (c[it.category] ?? 0) + 1;
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SHOP_ITEMS.filter((it) => {
      const catOk = category === 'all' || it.category === category;
      const qOk = !q || it.name.toLowerCase().includes(q) || it.description.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [category, query]);

  const toggle = (name: string) => setExpanded((id) => (id === name ? null : name));

  return (
    <section className="surface-panel active" data-mcp-tool="marketplaceSurface" data-mcp-state="ready">
      <SurfaceLayout>
        <SurfaceHero
          eyebrow="Design shop"
          title="Marketplace"
          lede={`Curated from the ${CATALOG_ENTRIES.length}-entry canon — ${SHOP_ITEMS.length} pieces, contract-tagged, spoon-priced, LOVE-priced.`}
        />

        <SurfaceSection title="Browse the shop">
          <GlassPanel strong>
            <div className="meta-row qm-shop-toolbar">
              {CATEGORIES.map((c) => (
                <motion.button
                  key={c}
                  type="button"
                  className={`chip ${category === c ? 'active' : ''}`}
                  onClick={() => setCategory(c)}
                  initial="rest"
                  animate="rest"
                  whileTap="pressed"
                  variants={press}
                >
                  {c} <span className="qm-count">({counts[c] ?? 0})</span>
                </motion.button>
              ))}
              <input
                className="input qm-shop-search"
                placeholder="Search the shop…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search marketplace"
              />
            </div>
          </GlassPanel>
        </SurfaceSection>

        <SurfaceSection title="Curated shop">
          <div className="glass-tile">
            {filtered.length === 0 ? (
              <motion.div className="preview-box qm-empty" initial="hidden" animate="visible" variants={fadeIn}>
                <span className="preview-box__text">No items match &quot;{query}&quot;.</span>
              </motion.div>
            ) : (
              <SurfaceGrid columns={3} className="surface-grid--tiles">
                <motion.div
                  variants={staggerChildren(0.06)}
                  initial="hidden"
                  animate="visible"
                  aria-label="Marketplace"
                  style={{ display: 'contents' }}
                >
                  {filtered.map((item) => (
                    <motion.div key={item.name} variants={slideUp}>
                      <div
                        className="qm-shop-tile"
                        data-mcp-tool={`shopCell-${item.name.toLowerCase()}`}
                        data-mcp-state="ready"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          toggle(item.name);
                        }}
                      >
                        <MarketplaceCard item={item} />
                        <button
                          type="button"
                          className="qm-shop-tile__toggle"
                          aria-expanded={expanded === item.name}
                          onClick={() => toggle(item.name)}
                        >
                          {expanded === item.name ? 'Hide live preview' : 'Live preview'}
                        </button>
                        {expanded === item.name && (
                          <div className="qm-shop-tile__preview">
                            <LiveExample
                              title={`${item.name} — live`}
                              description={item.description}
                              render={(props) => renderEntry(entryOf(item.name), props)}
                              initialProps={SAFE_PROPS[item.name] ?? {}}
                              code={codeFor(entryOf(item.name))}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </SurfaceGrid>
            )}
          </div>
        </SurfaceSection>

        <SurfaceSection title="Beyond the portal">
          <div className="glass-tile">
            <SurfaceGrid columns={3} className="surface-grid--tiles">
              <a href="https://mcp.p31ca.org" target="_blank" rel="noopener noreferrer" className="surface-card">
                <div className="surface-card-header">
                  <span className="surface-card-icon" style={{ background: 'var(--p31-accent-dim)' }}>
                    <P31Icon name="terminal" size={20} />
                  </span>
                  <StatusBadge status="online" label="LIVE" />
                </div>
                <h3 className="surface-card-title">MCP marketplace</h3>
                <p className="surface-card-desc">Hosted P31 MCP tools with x402 payment — head to mcp.p31ca.org.</p>
              </a>
            </SurfaceGrid>
          </div>
        </SurfaceSection>
      </SurfaceLayout>
    </section>
  );
}