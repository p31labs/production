/**
 * a2uiCatalog — declarative A2UI renderer.
 *
 * Maps an A2UI-style component spec `{ type, props, children }` onto real
 * rendered elements through a small SAFE registry. The registry resolves
 * against the canonical @p31ca/design-core COMPONENT_CATALOG (the trust
 * catalog) + the glass primitives — nothing is ever eval'd; unknown types
 * render as a neutral fallback chip.
 *
 * This proves "declarative UI as data; the design system as trust catalog."
 */
import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { COMPONENT_CATALOG } from '@p31ca/design-core/genui/catalog';

export interface A2uiNode {
  type: string;
  props?: Record<string, unknown>;
  children?: A2uiNode[];
}

interface CatalogEntry {
  name: string;
  cssClass: string;
  description: string;
}

const CATALOG_INDEX: Map<string, CatalogEntry> = (() => {
  const map = new Map<string, CatalogEntry>();
  const entries = COMPONENT_CATALOG as unknown as Array<Record<string, unknown>>;
  for (const e of entries) {
    const name = String(e.name ?? '');
    if (!name) continue;
    map.set(name.toLowerCase(), {
      name,
      cssClass: String(e.cssClass ?? ''),
      description: String(e.description ?? ''),
    });
  }
  return map;
})();

function catalogFor(name: string): CatalogEntry | undefined {
  return CATALOG_INDEX.get(name.toLowerCase());
}

const text = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

interface RegistryEntry {
  /** Catalog component name this spec type resolves to (null = layout primitive). */
  catalogName: string | null;
  render: (props: Record<string, unknown>, children: ReactNode[]) => ReactNode;
}

const REGISTRY: Record<string, RegistryEntry> = {
  grid: {
    catalogName: null,
    render: (props, children) => (
      <div
        className="a2ui-grid"
        data-spec="grid"
        data-catalog="layout"
        style={{ '--a2ui-cols': Math.max(1, Math.min(4, Math.round(num(props.columns, 2))) ) } as CSSProperties}
      >
        {children}
      </div>
    ),
  },
  stack: {
    catalogName: null,
    render: (props, children) => (
      <div className="a2ui-stack" data-spec="stack" data-catalog="layout">
        {children}
      </div>
    ),
  },
  row: {
    catalogName: null,
    render: (_props, children) => (
      <div className="a2ui-row" data-spec="row" data-catalog="layout">
        {children}
      </div>
    ),
  },
  card: {
    catalogName: 'Card',
    render: (props, children) => {
      const entry = catalogFor('Card');
      const title = text(props.title);
      return (
        <div
          className="glass-card a2ui-card"
          data-spec="card"
          data-catalog={entry?.name ?? 'Card'}
          data-catalog-class={entry?.cssClass ?? ''}
        >
          {title && <div className="a2ui-card__title">{title}</div>}
          {children}
        </div>
      );
    },
  },
  heading: {
    catalogName: null,
    render: (props) => {
      const level = Math.max(1, Math.min(4, Math.round(num(props.level, 2))));
      const Tag = `h${level}` as 'h2' | 'h3' | 'h4';
      return <Tag className="a2ui-heading" data-spec="heading">{text(props.text)}</Tag>;
    },
  },
  text: {
    catalogName: null,
    render: (props) => <p className="a2ui-text" data-spec="text">{text(props.text)}</p>,
  },
  metric: {
    catalogName: 'MetricBadge',
    render: (props) => {
      const entry = catalogFor('MetricBadge');
      const label = text(props.label);
      const value = props.value != null ? String(props.value) : '—';
      const delta = props.delta != null ? String(props.delta) : null;
      const up = delta !== null && !delta.startsWith('-');
      return (
        <div
          className="glass-card a2ui-metric"
          data-spec="metric"
          data-catalog={entry?.name ?? 'MetricBadge'}
          data-catalog-class={entry?.cssClass ?? ''}
        >
          <span className="a2ui-metric__label">{label}</span>
          <span className="a2ui-metric__value">{value}</span>
          {delta !== null && (
            <span className={`a2ui-metric__delta ${up ? 'a2ui-delta--up' : 'a2ui-delta--down'}`} aria-label={`delta ${delta}`}>
              {up ? '▲' : '▼'} {delta}
            </span>
          )}
        </div>
      );
    },
  },
  badge: {
    catalogName: 'Badge',
    render: (props) => {
      const entry = catalogFor('Badge');
      const tone = text(props.tone, 'neutral');
      return (
        <span
          className={`badge a2ui-badge a2ui-badge--${tone}`}
          data-spec="badge"
          data-catalog={entry?.name ?? 'Badge'}
          data-catalog-class={entry?.cssClass ?? ''}
        >
          {text(props.label, 'badge')}
        </span>
      );
    },
  },
  status: {
    catalogName: 'StatusBadge',
    render: (props) => {
      const entry = catalogFor('StatusBadge');
      const status = text(props.status, 'online');
      return (
        <span
          className={`badge a2ui-status a2ui-status--${status}`}
          data-spec="status"
          data-catalog={entry?.name ?? 'StatusBadge'}
          data-catalog-class={entry?.cssClass ?? ''}
        >
          <span className="status-dot" aria-hidden="true" />
          {text(props.label, status)}
        </span>
      );
    },
  },
  button: {
    catalogName: 'Button',
    render: (props) => {
      const entry = catalogFor('Button');
      const variant = text(props.variant, 'primary');
      const cls = variant === 'glass' || variant === 'secondary' ? 'btn-glass' : 'btn-primary';
      return (
        <button
          type="button"
          className={`btn ${cls}`}
          data-spec="button"
          data-catalog={entry?.name ?? 'Button'}
          data-catalog-class={entry?.cssClass ?? ''}
        >
          {text(props.label, 'Action')}
        </button>
      );
    },
  },
  list: {
    catalogName: null,
    render: (props, children) => {
      const items = Array.isArray(props.items) ? (props.items as Array<Record<string, unknown>>) : [];
      return (
        <ul className="a2ui-list" data-spec="list" data-catalog="layout">
          {items.map((it, i) => {
            const done = Boolean(it.done);
            return (
              <li key={i} className={`a2ui-list__item ${done ? 'done' : ''}`}>
                <span className="a2ui-list__mark" aria-hidden="true">{done ? '✓' : '○'}</span>
                <span>{text(it.label)}</span>
              </li>
            );
          })}
          {children.length > 0 && children}
        </ul>
      );
    },
  },
  progress: {
    catalogName: null,
    render: (props) => {
      const pct = Math.max(0, Math.min(100, num(props.value, 0)));
      return (
        <div
          className="a2ui-progress"
          data-spec="progress"
          data-catalog="layout"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="a2ui-progress__fill" style={{ width: `${pct}%` } as CSSProperties} />
        </div>
      );
    },
  },
  divider: {
    catalogName: null,
    render: () => <hr className="a2ui-divider" data-spec="divider" data-catalog="layout" />,
  },
};

/** Render an A2UI spec tree into React elements (safe allowlist registry). */
export function renderA2ui(tree: A2uiNode | null | undefined): ReactNode {
  if (!tree) return null;
  return renderNode(tree);
}

function renderNode(node: A2uiNode): ReactNode {
  const entry = REGISTRY[node.type];
  if (!entry) {
    return (
      <span className="a2ui-unknown" data-spec={node.type} title={`No safe registry entry for "${node.type}"`}>
        ? {node.type}
      </span>
    );
  }
  const children = Array.isArray(node.children) ? node.children.map((c, i) => <Fragment key={i}>{renderNode(c)}</Fragment>) : [];
  return entry.render(node.props ?? {}, children);
}

export interface ResolvedCatalogRef {
  type: string;
  catalog: string;
  cssClass: string;
}

/** Walk a spec tree and collect which trust-catalog components it resolves through. */
export function usedCatalogTypes(tree: A2uiNode | null | undefined): ResolvedCatalogRef[] {
  const seen = new Map<string, ResolvedCatalogRef>();
  if (!tree) return [];
  const walk = (n: A2uiNode) => {
    const entry = REGISTRY[n.type];
    if (entry?.catalogName) {
      const cat = catalogFor(entry.catalogName);
      if (cat) seen.set(n.type, { type: n.type, catalog: cat.name, cssClass: cat.cssClass });
    }
    for (const c of n.children ?? []) walk(c);
  };
  walk(tree);
  return [...seen.values()].sort((a, b) => a.type.localeCompare(b.type));
}

/* ──────────────────────────────────────────────────────────────────────────
   Deterministic intent → spec generation (honest, local, no backend).
   Same intent string always yields the same tree + the same data values.
   ──────────────────────────────────────────────────────────────────────── */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small seeded PRNG — deterministic pseudo-values from the intent text. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Map an intent string to an A2UI spec tree via keyword → layout heuristics. */
export function generateA2ui(intent: string): A2uiNode {
  const lower = intent.toLowerCase();
  const rand = mulberry32(hashString(intent));

  if (/(revenue|dashboard|kpi|metric|analytics|sales|stat)/.test(lower)) {
    const defs = [
      { label: 'Revenue', base: 128, suffix: 'k' },
      { label: 'Active Users', base: 2400, suffix: '' },
      { label: 'Conversion', base: 3.4, suffix: '%' },
      { label: 'Churn', base: 4.2, suffix: '%' },
    ];
    return {
      type: 'stack',
      props: { gap: 16 },
      children: [
        { type: 'heading', props: { text: 'Revenue dashboard', level: 2 } },
        {
          type: 'grid',
          props: { columns: 2 },
          children: defs.map((d) => {
            const v = Math.round(d.base * (0.8 + rand() * 0.6));
            const raw = (rand() * 0.2 - 0.03) * v;
            const sign = raw >= 0 ? '+' : '-';
            const magnitude = Math.max(1, Math.abs(Math.round(raw)));
            return {
              type: 'metric',
              props: { label: d.label, value: `${v}${d.suffix}`, delta: `${sign}${magnitude}${d.suffix}` },
            };
          }),
        },
        { type: 'divider', props: {} },
        { type: 'text', props: { text: 'Generated deterministically from the intent — no backend, no model.' } },
      ],
    };
  }

  if (/(status|health|service|system|monitor|uptime)/.test(lower)) {
    const services = [
      { name: 'api', state: 'online' },
      { name: 'database', state: 'online' },
      { name: 'gateway', state: 'online' },
      { name: 'auth', state: 'busy' },
      { name: 'queue', state: 'offline' },
    ];
    return {
      type: 'stack',
      props: { gap: 16 },
      children: [
        { type: 'heading', props: { text: 'System status', level: 2 } },
        {
          type: 'grid',
          props: { columns: 2 },
          children: services.map((s) => ({
            type: 'status',
            props: { status: s.state, label: `${s.name} ${s.state}` },
          })),
        },
        { type: 'divider', props: {} },
        { type: 'text', props: { text: 'Status nodes resolve through the Badge / StatusBadge catalog entries.' } },
      ],
    };
  }

  if (/(checklist|task|todo|care|routine|schedule|today)/.test(lower)) {
    const tasks = [
      { label: 'Take medication', done: true },
      { label: 'Morning walk — 20 min', done: true },
      { label: 'Sensory break', done: false },
    ];
    return {
      type: 'stack',
      props: { gap: 16 },
      children: [
        { type: 'heading', props: { text: "Today's checklist", level: 2 } },
        {
          type: 'card',
          props: { title: 'Care tasks' },
          children: [{ type: 'list', props: { items: tasks } }],
        },
        { type: 'progress', props: { value: 66 } },
        { type: 'text', props: { text: '2 of 3 complete — rendered as a Card + List + Progress trio.' } },
      ],
    };
  }

  if (/(form|login|auth|sign|create|onboard)/.test(lower)) {
    return {
      type: 'stack',
      props: { gap: 16 },
      children: [
        { type: 'heading', props: { text: 'Sign in', level: 2 } },
        {
          type: 'card',
          props: { title: 'Account' },
          children: [
            { type: 'text', props: { text: 'Email / password form sketch — Input lives in the catalog.' } },
            {
              type: 'row',
              props: {},
              children: [
                { type: 'button', props: { label: 'Sign in', variant: 'primary' } },
                { type: 'button', props: { label: 'Cancel', variant: 'glass' } },
              ],
            },
          ],
        },
        { type: 'divider', props: {} },
        { type: 'text', props: { text: 'Form fields map to Input; actions map to Button.' } },
      ],
    };
  }

  return {
    type: 'stack',
    props: { gap: 16 },
    children: [
      { type: 'heading', props: { text: 'Generated surface', level: 2 } },
      {
        type: 'grid',
        props: { columns: 2 },
        children: [
          {
            type: 'card',
            props: { title: 'Card A' },
            children: [{ type: 'text', props: { text: 'Unknown types render as a safe fallback chip — nothing is evaluated.' } }],
          },
          {
            type: 'card',
            props: { title: 'Card B' },
            children: [{ type: 'text', props: { text: 'Layout families: grid, stack, row, list — over the glass primitives.' } }],
          },
        ],
      },
      { type: 'divider', props: {} },
      { type: 'text', props: { text: 'Default intent → two-card grid. Try "revenue", "status", or "checklist".' } },
    ],
  };
}

export default renderA2ui;