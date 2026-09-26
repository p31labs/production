import { useMemo, useState, type ReactNode } from 'react';
import {
  Button,
  GlassCard,
  GlassPanel,
  StatusBadge,
  MetricBadge,
  SpoonDial,
} from '@p31ca/design-core/compositions';
import { COMPONENT_CATALOG } from '@p31ca/design-core/genui/catalog';
import { useThemeStore, THEME_TOKENS, type ThemeId } from '@p31ca/design-core/theming/theme-store';
import { LiveExample } from '../../lib/livePreview';
import IntentPlayground from '../../components/IntentPlayground';
import { useNotifStore, type NotifKind } from '../../lib/useNotifStore';
import { motion } from 'motion/react';
import { slideUp, staggerChildren } from '../../lib/motionPresets';
import { SurfaceLayout, SurfaceHero, SurfaceSection, SurfaceGrid } from '../../lib/surface';
import '../../surfaces/playground.css';

interface CatalogEntry {
  name: string;
  description: string;
  status?: string;
  tokens?: string[];
  category?: string;
}

const CATALOG = COMPONENT_CATALOG as unknown as CatalogEntry[];

const STABLE_PICKS = ['Button', 'GlassCard', 'GlassPanel', 'StatusBadge', 'MetricBadge', 'SpoonDial'] as const;
type PickName = (typeof STABLE_PICKS)[number];

const TABS = [
  { id: 'lab', label: 'Live components' },
  { id: 'intent', label: 'Intent DSL' },
  { id: 'star', label: 'Lab' },
] as const;
type Tab = (typeof TABS)[number]['id'];

type PropsMap = Record<string, unknown>;
type Lab = {
  initialProps: PropsMap;
  render: (p: PropsMap) => ReactNode;
  code: (p: PropsMap) => string;
};

const LAB_ENTRIES: Record<PickName, Lab> = {
  Button: {
    initialProps: { label: 'Affirm', variant: 'primary', size: 'md', disabled: false },
    render: (p) => (
      <Button
        variant={String(p.variant) as 'primary' | 'secondary' | 'ghost'}
        size={String(p.size) as 'sm' | 'md' | 'lg'}
        disabled={Boolean(p.disabled)}
      >
        {String(p.label)}
      </Button>
    ),
    code: (p) =>
      `import { Button } from '@p31ca/design-core/compositions'\n\n<Button variant="${String(p.variant)}" size="${String(p.size)}"${p.disabled ? ' disabled' : ''}>{String(p.label)}</Button>`,
  },
  GlassCard: {
    initialProps: { label: 'GlassCard tile', strong: true },
    render: (p) => <GlassCard strong={Boolean(p.strong)}>{String(p.label)}</GlassCard>,
    code: (p) =>
      `import { GlassCard } from '@p31ca/design-core/compositions'\n\n<GlassCard${p.strong ? ' strong' : ''}>{String(p.label)}</GlassCard>`,
  },
  GlassPanel: {
    initialProps: { label: 'Elevated panel', padding: 'md', strong: false },
    render: (p) => (
      <GlassPanel padding={String(p.padding) as 'sm' | 'md' | 'lg'} strong={Boolean(p.strong)}>
        {String(p.label)}
      </GlassPanel>
    ),
    code: (p) =>
      `import { GlassPanel } from '@p31ca/design-core/compositions'\n\n<GlassPanel padding="${String(p.padding)}"${p.strong ? ' strong' : ''}>{String(p.label)}</GlassPanel>`,
  },
  StatusBadge: {
    initialProps: { status: 'online', label: 'Online' },
    render: (p) => (
      <StatusBadge status={String(p.status) as 'online' | 'offline' | 'busy' | 'away'} label={String(p.label)} />
    ),
    code: (p) =>
      `import { StatusBadge } from '@p31ca/design-core/compositions'\n\n<StatusBadge status="${String(p.status)}" label="${String(p.label)}" />`,
  },
  MetricBadge: {
    initialProps: { value: '124', label: 'tokens' },
    render: (p) => <MetricBadge value={String(p.value)} label={String(p.label)} />,
    code: (p) =>
      `import { MetricBadge } from '@p31ca/design-core/compositions'\n\n<MetricBadge value="${String(p.value)}" label="${String(p.label)}" />`,
  },
  SpoonDial: {
    initialProps: { level: 3 },
    render: (p) => <SpoonDial level={Number(p.level)} onChange={() => {}} />,
    code: (p) =>
      `import { SpoonDial } from '@p31ca/design-core/compositions'\n\n<SpoonDial level={${Number(p.level)}} onChange={setSpoons} />`,
  },
};

/** Local, honest keyword heuristic over the stable catalog (no backend). */
function recommend(query: string, entries: CatalogEntry[]): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = entries.map((e) => {
    let score = 0;
    const name = e.name.toLowerCase();
    const desc = (e.description ?? '').toLowerCase();
    for (const t of tokens) {
      if (name === t) score += 3;
      else if (name.includes(t)) score += 2;
      if (desc.includes(t)) score += 1;
    }
    return { e, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.e);
}

/** Playground — live catalog sandbox + Intent→component recommender + Intent DSL gates. */
export default function Playground() {
  const [tab, setTab] = useState<Tab>('lab');
  const [query, setQuery] = useState('');
  const [pinned, setPinned] = useState<PickName | null>(null);

  const stableEntries = useMemo(
    () => CATALOG.filter((e) => e.status === 'stable' && (STABLE_PICKS as readonly string[]).includes(e.name)),
    []
  );

  const suggestions = useMemo(() => recommend(query, stableEntries), [query, stableEntries]);

  const ordered = useMemo<PickName[]>(() => {
    const cells = STABLE_PICKS.filter((n) => stableEntries.some((e) => e.name === n));
    if (!pinned) return cells;
    return [pinned, ...cells.filter((n) => n !== pinned)];
  }, [stableEntries, pinned]);

  return (
    <section className="surface-panel active" data-mcp-tool="playgroundSurface" data-mcp-state="ready">
      <SurfaceLayout>
        <SurfaceHero
          eyebrow="Experiment"
          title="Playground"
          lede="Drive live compositions by props — or write Intent DSL and run the Opus QA gates in the browser."
        />

        <SurfaceSection title="Mode">
          <div className="glass-tile">
            <div className="meta-row" role="tablist" aria-label="Playground sections">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`chip ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </SurfaceSection>

        {tab === 'intent' ? (
          <SurfaceSection title="Intent DSL">
            <IntentPlayground />
          </SurfaceSection>
        ) : tab === 'star' ? (
          <SurfaceSection title="Lab">
            <LabPanel />
          </SurfaceSection>
        ) : (
          <>
            <SurfaceSection title="Intent → component">
              <div className="playground-intent" data-mcp-tool="intentRecommender" data-mcp-state="ready">
                <div className="meta-row">
                  <h5 className="label-tiny" style={{ margin: 0 }}>
                    Intent → component
                  </h5>
                  <span className="chip">{stableEntries.length} stable → live</span>
                </div>
                <input
                  className="intent-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. &quot;status badge for telemetry&quot; or &quot;button&quot;…"
                  aria-label="Recommend a component from your intent"
                />
                <div className="intent-results" aria-live="polite">
                  {suggestions.length === 0 ? (
                    <p className="intent-hint">
                      Type a phrase — the recommender keyword-matches component name + description.
                    </p>
                  ) : (
                    suggestions.map((s) => (
                      <motion.button
                        key={s.name}
                        type="button"
                        className={`intent-chip ${pinned === s.name ? 'active' : ''}`}
                        variants={slideUp}
                        initial="hidden"
                        animate="visible"
                        onClick={() => setPinned(s.name as PickName)}
                      >
                        {s.name}
                      </motion.button>
                    ))
                  )}
                  {pinned && (
                    <motion.button
                      type="button"
                      className="intent-chip intent-chip--reset"
                      variants={slideUp}
                      initial="hidden"
                      animate="visible"
                      onClick={() => setPinned(null)}
                    >
                      Show all
                    </motion.button>
                  )}
                </div>
              </div>
            </SurfaceSection>

            <SurfaceSection title="Live lab">
              <div className="glass-tile">
                <SurfaceGrid columns={3}>
                  <motion.div
                    variants={staggerChildren(0.06)}
                    initial="hidden"
                    animate="visible"
                    style={{ display: 'contents' }}
                  >
                    {ordered.map((name) => {
                      const entry = stableEntries.find((e) => e.name === name);
                      const lab = LAB_ENTRIES[name];
                      if (!entry) return null;
                      return (
                        <motion.div
                          key={name}
                          className="playground-grid__cell"
                          variants={slideUp}
                          data-pinned={pinned === name ? 'true' : undefined}
                        >
                          <LiveExample
                            title={name}
                            description={entry.description}
                            initialProps={lab.initialProps}
                            code={lab.code(lab.initialProps)}
                            render={lab.render}
                          />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </SurfaceGrid>
              </div>
            </SurfaceSection>
          </>
        )}
      </SurfaceLayout>
    </section>
  );
}
/** LabPanel — the experimental "Lab" tab: notification system demo, starfield
 *  brightness control, and quick-fire theme switching. */
const NOTIF_SCENARIOS: { kind: NotifKind; title: string; body: string }[] = [
  { kind: 'info', title: 'Sync in progress', body: 'Pulling the latest ledger head…' },
  { kind: 'success', title: 'Saved', body: 'Your token edits persist to localStorage.' },
  { kind: 'milestone', title: 'Quantum Material', body: 'First 100 components shipped.' },
  { kind: 'error', title: 'RPC timeout', body: 'Allocator returned 504 — retry in Settings.' },
];

const LAB_THEMES: { id: ThemeId; label: string }[] = [
  { id: 'garden', label: 'Garden' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'zen', label: 'Zen' },
  { id: 'volt', label: 'Volt' },
];

function LabPanel() {
  const notify = useNotifStore((s) => s.notify);
  const setTheme = useThemeStore((s) => s.setTheme);
  const applyTheme = useThemeStore((s) => s.applyTheme);
  const [brightness, setBrightness] = useState(1.6);
  const [paused, setPaused] = useState(false);

  const onBrightness = (v: number) => {
    setBrightness(v);
    document.documentElement.style.setProperty('--star-brightness', String(v));
  };

  const onPause = (next: boolean) => {
    setPaused(next);
    document.documentElement.setAttribute('data-spoons', next ? '0' : '3');
    if (next) notify({ kind: 'info', title: 'Starfield paused', body: 'Calm floor — spoons at 0.' });
  };

  return (
    <div className="lab-panel" data-mcp-tool="labPanel" data-mcp-state="ready">
      <div className="glass-tile">
        <h4 className="label-tiny" style={{ margin: 0 }}>Notification system</h4>
        <div className="lab-row">
          {NOTIF_SCENARIOS.map((n) => (
            <button
              key={n.kind}
              type="button"
              className="chip"
              onClick={() => notify({ kind: n.kind, title: n.title, body: n.body })}
            >
              {n.kind}
            </button>
          ))}
        </div>
        <p className="intent-hint">Each button fires a toast with a severity-timed lifetime (error stays longest).</p>
      </div>

      <div className="glass-tile">
        <h4 className="label-tiny" style={{ margin: 0 }}>Starfield</h4>
        <label className="lab-slider">
          <span>Brightness — {brightness.toFixed(1)}×</span>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.1}
            value={brightness}
            onChange={(e) => onBrightness(Number(e.target.value))}
            aria-label="Starfield brightness"
          />
        </label>
        <button type="button" className="chip" onClick={() => onPause(!paused)} aria-pressed={paused}>
          {paused ? 'Resume starfield' : 'Pause starfield'}
        </button>
      </div>

      <div className="glass-tile">
        <h4 className="label-tiny" style={{ margin: 0 }}>Theme quick-fire (Chameleon)</h4>
        <div className="lab-row">
          {LAB_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="chip"
              style={{ borderColor: THEME_TOKENS[t.id]?.['--p31-accent'] ?? undefined }}
              onClick={() => {
                setTheme(t.id);
                applyTheme();
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
