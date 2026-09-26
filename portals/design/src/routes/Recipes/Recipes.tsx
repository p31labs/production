import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  Button,
  GlassPanel,
  SpoonDial,
  StatusBadge,
  type StatusBadgeStatus,
} from '@p31ca/design-core/compositions';
import { SurfaceLayout, SurfaceHero, SurfaceSection, SurfaceGrid } from '../../lib/surface';
import { LiveExample } from '../../lib/livePreview';
import { slideUp, staggerChildren } from '../../lib/motionPresets';
import '../../surfaces/recipes.css';

interface Recipe {
  id: string;
  title: string;
  description: string;
  code: string;
  initialProps: Record<string, unknown>;
  render: (props: Record<string, unknown>) => ReactNode;
}

/** Eight forkable recipes. Code strings are the actual JSX that renders live. */
const RECIPES: Recipe[] = [
  {
    id: 'metric-card',
    title: 'Card-with-metric',
    description: 'A glass panel showing one hero metric — value, unit, label.',
    code: `<GlassPanel strong className="recipe-metric-card">
  <span className="recipe-metric-card__label">Daily glow</span>
  <span className="recipe-metric-card__value">128</span>
  <span className="recipe-metric-card__unit">LOVE</span>
</GlassPanel>`,
    initialProps: { title: 'Daily glow', value: '128', unit: 'LOVE' },
    render: (p) => (
      <GlassPanel strong className="recipe-metric-card">
        <span className="recipe-metric-card__label">{String(p.title)}</span>
        <span className="recipe-metric-card__value">{String(p.value)}</span>
        <span className="recipe-metric-card__unit">{String(p.unit)}</span>
      </GlassPanel>
    ),
  },
  {
    id: 'glass-panel',
    title: 'GlassPanel',
    description: 'Backdrop-blur panel above the void — the glassmorphism 2.0 host frame.',
    code: `<GlassPanel strong className="recipe-glass">
  <p className="recipe-glass__lead">Backdrop-blur panel above the void.</p>
  <p className="recipe-glass__sub">Glassmorphism 2.0 — clean host frame, chrome only.</p>
</GlassPanel>`,
    initialProps: { label: 'Backdrop-blur panel above the void.', strong: true },
    render: (p) => (
      <GlassPanel strong={Boolean(p.strong)} className="recipe-glass">
        <p className="recipe-glass__lead">{String(p.label)}</p>
        <p className="recipe-glass__sub">Glassmorphism 2.0 — clean host frame, chrome only.</p>
      </GlassPanel>
    ),
  },
  {
    id: 'status-badge',
    title: 'StatusBadge',
    description: 'Canon status pill with glow dot — online, away, busy, offline.',
    code: `<StatusBadge status="online" label="Live build" />`,
    initialProps: { status: 'online', label: 'Live build' },
    render: (p) => <StatusBadge status={p.status as StatusBadgeStatus} label={String(p.label)} />,
  },
  {
    id: 'spoon-dial',
    title: 'SpoonDial inline',
    description: 'Cognitive-load selector, 0–5. The calm floor is spoon-aware by design.',
    code: `<SpoonDial level={3} />`,
    initialProps: { level: 3 },
    render: (p) => <SpoonDial level={Number(p.level)} />,
  },
  {
    id: 'button-primary',
    title: 'ButtonPrimary',
    description: 'The primary action button — accent-filled, glow on hover.',
    code: `<Button variant="primary" size="md">
  Mint LOVE
</Button>`,
    initialProps: { label: 'Mint LOVE' },
    render: (p) => (
      <Button variant="primary" size="md">
        {String(p.label)}
      </Button>
    ),
  },
  {
    id: 'badge-with-dot',
    title: 'BadgeWithDot',
    description: 'Local status pill with a glowing dot — verified semantics at a glance.',
    code: `<span className="recipe-badge-dot">
  <span className="recipe-badge-dot__dot" aria-hidden="true" />
  Verified
</span>`,
    initialProps: { text: 'Verified', dot: true },
    render: (p) => (
      <span className="recipe-badge-dot">
        {Boolean(p.dot) && <span className="recipe-badge-dot__dot" aria-hidden="true" />}
        {String(p.text)}
      </span>
    ),
  },
  {
    id: 'table-strip',
    title: 'Table strip',
    description: 'Three-column strip for compact scoreboards. Toggle zebra striping.',
    code: `<div className="recipe-table">
  <div className="recipe-table__row recipe-table__row--head">
    <span>Metric</span>
    <span>Value</span>
    <span>Delta</span>
  </div>
  <div className="recipe-table__row">
    <span>Spoons</span>
    <span>4</span>
    <span>+1</span>
  </div>
  <div className="recipe-table__row">
    <span>LOVE</span>
    <span>128</span>
    <span>+32</span>
  </div>
  <div className="recipe-table__row">
    <span>Rituals</span>
    <span>3</span>
    <span>+1</span>
  </div>
</div>`,
    initialProps: { rows: 3, zebra: false },
    render: (p) => {
      const n = Math.max(0, Math.min(5, Number(p.rows)));
      const zebra = Boolean(p.zebra);
      const data: Array<[string, string, string]> = [
        ['Spoons', '4', '+1'],
        ['LOVE', '128', '+32'],
        ['Rituals', '3', '+1'],
        ['Mesh', '7', '+2'],
        ['Glow', '2', '0'],
      ];
      return (
        <div className={`recipe-table${zebra ? ' recipe-table--zebra' : ''}`}>
          <div className="recipe-table__row recipe-table__row--head">
            <span>Metric</span>
            <span>Value</span>
            <span>Delta</span>
          </div>
          {data.slice(0, n).map(([a, b, c]) => (
            <div className="recipe-table__row" key={a}>
              <span>{a}</span>
              <span>{b}</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: 'loading-tile',
    title: 'LoadingTile',
    description: 'Skeleton shimmer tile for async surfaces. Respects reduced motion.',
    code: `<div className="recipe-loading" role="status" aria-label="Loading">
  <span className="recipe-loading__bar" style={{ width: '88%' }} />
  <span className="recipe-loading__bar" style={{ width: '64%' }} />
  <span className="recipe-loading__bar" style={{ width: '76%' }} />
</div>`,
    initialProps: { bars: 3 },
    render: (p) => {
      const widths = ['88%', '64%', '76%', '52%', '70%'];
      const n = Math.max(0, Math.min(5, Number(p.bars)));
      return (
        <div className="recipe-loading" role="status" aria-label="Loading">
          {widths.slice(0, n).map((w, i) => (
            <span className="recipe-loading__bar" style={{ width: w }} key={i} />
          ))}
        </div>
      );
    },
  },
];

function copyText(text: string): void {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
  } else {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    copyText(recipe.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="recipe-card">
      <div className="recipe-card__head">
        <span className="recipe-card__id">{recipe.id}</span>
        <button
          type="button"
          className={`recipe-card__copy${copied ? ' recipe-card__copy--done' : ''}`}
          onClick={copy}
          aria-label={`Copy ${recipe.id} code`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <LiveExample
        title={recipe.title}
        description={recipe.description}
        render={recipe.render}
        initialProps={recipe.initialProps}
        code={recipe.code}
      />
    </div>
  );
}

/** Copy-paste recipe library — live render, code toggle, editable props. */
export default function Recipes() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RECIPES;
    return RECIPES.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <section className="surface-panel active" data-mcp-tool="recipesSurface" data-mcp-state="ready">
      <SurfaceLayout>
        <SurfaceHero
          eyebrow="Copy-paste library"
          title="Recipes"
          lede="Eight forkable recipes — live render, code toggle, editable props, one-click copy."
        />

        <SurfaceSection title="Library">
          <div className="recipes-search-wrap">
            <input
              className="input recipes-search"
              placeholder="Search 171 recipes… (e.g. glass, btn, topbar)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search recipes"
            />
            <span className="recipes-count">
              {filtered.length} / {RECIPES.length}
            </span>
          </div>

          <motion.div
            className="recipes-grid glass-tile"
            variants={staggerChildren(0.05)}
            initial="hidden"
            animate="visible"
          >
            <SurfaceGrid columns={3}>
              {filtered.map((r) => (
                <motion.div className="recipes-grid__item" variants={slideUp} key={r.id}>
                  <RecipeCard recipe={r} />
                </motion.div>
              ))}
            </SurfaceGrid>
          </motion.div>
        </SurfaceSection>
      </SurfaceLayout>
    </section>
  );
}