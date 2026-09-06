import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Palette, Type, Layers, Zap, Eye, Accessibility, LayoutTemplate, Bell, Box, Play, Terminal } from 'lucide-react';
import { GlassPanel, GlassCard, Topbar, BottomNav, SpoonDial } from '@p31/design-core/compositions';
import NotificationDemoPanel from './components/NotificationDemoPanel';
import McpConsole from './components/McpConsole';
import McpDocs from './components/McpDocs';
import AmbientStarfield from './components/AmbientStarfield';
import ThemePicker from './components/ThemePicker';
import StarfieldScrubber from './components/StarfieldScrubber';
import TokenExplorer from './components/TokenExplorer';
import RecipeBrowser from './components/RecipeBrowser';
import IntentPlayground from './components/IntentPlayground';

const COLORS = [
  { name: 'void', value: '#0A0A0F' },
  { name: 'surface', value: '#12121A' },
  { name: 'surface2', value: '#1C1C2A' },
  { name: 'quantum-cyan', value: '#00F0FF' },
  { name: 'quantum-violet', value: '#A78BFA' },
  { name: 'quantum-gold', value: '#FBBF24' },
  { name: 'quantum-green', value: '#34D399' },
  { name: 'quantum-red', value: '#FB7185' },
  { name: 'quantum-iris', value: '#818CF8' },
  { name: 'cloud', value: '#A1A1AA' },
];

const SPOON_LEVELS = [0, 1, 2, 3, 4, 5];
const SPOON_LABELS = ['Crisis', 'Minimal', 'Low', 'Moderate', 'High', 'Full'];

function ColorSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="text-center">
      <div
        className="w-20 h-20 rounded-xl border border-glass-border mb-2"
        style={{ background: value }}
      />
      <div className="text-xs font-medium">{name}</div>
      <div className="text-[11px] text-text-tertiary font-mono">{value}</div>
    </div>
  );
}

function SpoonDemo() {
  const [spoons, setSpoons] = useState(3);
  const motionDuration = spoons <= 1 ? '0ms' : spoons <= 2 ? '100ms' : spoons <= 3 ? '200ms' : '300ms';

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {SPOON_LEVELS.map(s => (
          <button
            key={s}
            onClick={() => setSpoons(s)}
            className="px-4 py-2 rounded-lg border-none cursor-pointer font-medium text-xs transition-all"
            style={{
              background: spoons === s ? 'var(--p31-accent)' : 'rgba(255,255,255,0.06)',
              color: spoons === s ? '#0a0e14' : 'var(--p31-text)',
              fontWeight: spoons === s ? 600 : 400,
              fontSize: 13,
              transition: `all ${motionDuration}`,
            }}
          >
            {s} — {SPOON_LABELS[s]}
          </button>
        ))}
      </div>
      <GlassPanel>
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl"
            style={{
              background: 'var(--p31-accent)',
              transition: `transform ${motionDuration} ease`,
              transform: spoons >= 3 ? 'rotate(360deg)' : 'rotate(0deg)',
            }}
          />
          <div>
            <div className="text-sm font-semibold">Motion: {motionDuration}</div>
            <div className="text-xs text-text-secondary">
              {spoons <= 1 ? 'Motion fully disabled (crisis/low)' : `Transitions at ${motionDuration}`}
            </div>
          </div>
        </div>
        {spoons === 0 && (
          <div className="mt-4 p-4 rounded-xl border border-accent-red/20 text-xs" style={{ background: 'rgba(251,113,133,0.1)' }}>
            Crisis mode: only breathing overlay + exit control
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

function TypographyDemo() {
  const samples = [
    { label: 'Display', style: { fontSize: 'var(--p31-type-display)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em' } },
    { label: 'H1', style: { fontSize: 'var(--p31-type-h1)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' } },
    { label: 'H2', style: { fontSize: 'var(--p31-type-h2)', fontWeight: 700, lineHeight: 1.2 } },
    { label: 'H3', style: { fontSize: 'var(--p31-type-h3)', fontWeight: 600, lineHeight: 1.3 } },
    { label: 'Body', style: { fontSize: 'var(--p31-type-body)', fontWeight: 400, lineHeight: 1.6 } },
    { label: 'Label', style: { fontSize: 'var(--p31-type-label)', fontWeight: 500, lineHeight: 1, letterSpacing: '0.05em', textTransform: 'uppercase' as const } },
    { label: 'Caption', style: { fontSize: 'var(--p31-type-caption)', fontWeight: 400, lineHeight: 1.5 } },
    { label: 'Code', style: { fontSize: 'var(--p31-type-label)', fontFamily: 'var(--p31-font-mono)', lineHeight: 1.6 } },
  ];

  return (
    <div className="flex flex-col gap-4">
      {samples.map(s => (
        <div key={s.label} className="flex items-baseline gap-4">
          <span className="text-[11px] text-text-tertiary w-20 font-mono">{s.label}</span>
          <span style={s.style}>The design system that breathes</span>
        </div>
      ))}
    </div>
  );
}

function GlassDemo() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { label: 'Glass Panel', cls: 'glass-panel' },
        { label: 'Glass Card', cls: 'glass-card' },
        { label: 'Glass Strong', cls: 'glass-strong' },
      ].map(g => (
        <div key={g.label} className={g.cls}>
          <div className="text-sm font-semibold mb-1">{g.label}</div>
          <div className="text-xs text-text-secondary">Class: <code className="font-mono text-[11px]">{g.cls}</code></div>
        </div>
      ))}
    </div>
  );
}

function SpacingDemo() {
  const levels = ['minimal', 'moderate', 'detailed', 'exhaustive'];
  const densities = [12, 16, 20, 24];

  return (
    <div className="flex flex-col gap-4">
      {levels.map((level, i) => (
        <div key={level} className="flex items-center gap-4">
          <span className="text-xs text-text-secondary w-20 font-mono">{level}</span>
          <div className="flex gap-4">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className="w-8 h-8 rounded-lg"
                style={{
                  background: 'rgba(0,240,255,0.15)',
                  border: '1px solid rgba(0,240,255,0.3)',
                }}
              />
            ))}
          </div>
          <span className="text-[11px] text-text-tertiary">gap: {densities[i]}px</span>
        </div>
      ))}
    </div>
  );
}

function WCAGDemo() {
  const checks = [
    { label: 'Touch targets', detail: '≥48×48px (WCAG 2.5.8)', icon: <Accessibility size={16} /> },
    { label: 'Contrast ratios', detail: '≥7:1 AAA (quantum-cyan on void)', icon: <Eye size={16} /> },
    { label: 'Focus indicators', detail: '2px accent outline, 2px offset', icon: <Zap size={16} /> },
    { label: 'Skip navigation', detail: '#main-content skip link', icon: <Layers size={16} /> },
    { label: 'Reduced motion', detail: '@media prefers-reduced-motion', icon: <Zap size={16} /> },
    { label: 'ARIA labels', detail: 'All icon buttons + SVGs', icon: <Accessibility size={16} /> },
    { label: 'Keyboard nav', detail: 'Tab order + Escape handlers', icon: <Zap size={16} /> },
  ];

  return (
    <div className="flex flex-col gap-2">
      {checks.map(c => (
        <div
          key={c.label}
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{
            background: 'rgba(52,211,153,0.06)',
            border: '1px solid rgba(52,211,153,0.15)',
          }}
        >
          <span style={{ color: 'var(--p31-accent-green)' }}>{c.icon}</span>
          <span className="text-sm font-medium">{c.label}</span>
          <span className="text-xs text-text-secondary ml-auto">{c.detail}</span>
        </div>
      ))}
    </div>
  );
}

const TEMPLATES = [
  {
    id: 'template-developer-hub',
    name: 'Developer Hub Landing',
    icon: '🏰',
    description: 'Dark, high-contrast technical hub. Crown mark, product grid, agent mesh, research publications. 7 dense sections, glass cards with colored accent borders.',
    accent: '#00F0FF',
    route: 'https://p31ca.org',
    source: 'apps/p31ca/src/pages/index.astro',
  },
  {
    id: 'template-institutional',
    name: 'Institutional Landing',
    icon: '🌿',
    description: 'Clean nonprofit editorial. Emerald primary, trust signals (501c3, EIN, ORCID), pilot stats, testimonials. Mission-driven layout with progressive disclosure.',
    accent: '#34D399',
    route: 'https://phosphorus31.org',
    source: 'apps/phosphorus31/src/pages/index.astro',
  },
  {
    id: 'template-caregiver',
    name: 'Caregiver Companion',
    icon: '💬',
    description: 'Minimal distraction-free chat. Pre-cognitive action chips, zero-reading default, spoon-aware. Full viewport, no chrome. For neurodivergent caregivers under cognitive load.',
    accent: '#A78BFA',
    route: 'https://phos.p31ca.org/conversational',
    source: 'apps/phos/src/features/conversational/components/ConversationalSurface.tsx',
  },
];

function TemplateBrowser() {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const template = params.get('template');
    if (template) setSelected(template);
  }, []);

  const handleSelect = (id: string) => {
    setSelected(id);
    const url = new URL(window.location.href);
    url.searchParams.set('template', id);
    window.history.pushState({}, '', url.toString());
  };

  const handleCopyUrl = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('template', id);
    navigator.clipboard.writeText(url.toString()).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-6">
      {selected && (
        <div
          className="p-3 rounded-lg text-xs font-mono"
          style={{
            background: 'rgba(0,240,255,0.08)',
            border: '1px solid rgba(0,240,255,0.2)',
          }}
        >
          Selected: <strong>{selected}</strong> — copy this URL and send to your agent
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATES.map(t => {
          const isSelected = selected === t.id;
          return (
            <GlassCard key={t.id} className="cursor-pointer">
              <div className="text-3xl mb-3">{t.icon}</div>
              <h3 className="text-base font-semibold mb-2" style={{ color: t.accent }}>{t.name}</h3>
              <p className="text-xs text-text-secondary leading-relaxed mb-4">
                {t.description}
              </p>
              <div
                className="text-[10px] font-mono text-text-tertiary mb-4 p-2 rounded-md"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div>Source: {t.source}</div>
                <div className="mt-1">Live: <a href={t.route} target="_blank" rel="noopener noreferrer" style={{ color: t.accent }}>{t.route}</a></div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelect(t.id)}
                  className="flex-1 px-4 py-2 rounded-lg border-none cursor-pointer font-semibold text-xs transition-all"
                  style={{
                    background: isSelected ? t.accent : 'rgba(255,255,255,0.06)',
                    color: isSelected ? '#0A0A0F' : 'var(--p31-text)',
                  }}
                >
                  {isSelected ? '✓ Selected' : 'Select Template'}
                </button>
                <button
                  onClick={() => handleCopyUrl(t.id)}
                  title="Copy template URL"
                  className="px-3 py-2 rounded-lg border border-glass-border cursor-pointer bg-transparent text-text-tertiary text-xs transition-all"
                >
                  🔗
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
      <GlassPanel>
        <div className="font-semibold mb-2 text-sm">How It Works</div>
        <ol className="list-decimal list-inside text-xs text-text-secondary leading-relaxed space-y-1">
          <li>Browse templates and click <strong>Select Template</strong> on one you like.</li>
          <li>The URL updates to include <code className="font-mono bg-glass-bg px-1 py-0.5 rounded text-[11px]">?template=template-id</code>.</li>
          <li>Copy the URL and send it to your AI coding agent.</li>
          <li>The agent reads the matching <strong>DESIGN.md</strong> spec from <code className="font-mono bg-glass-bg px-1 py-0.5 rounded text-[11px]">docs/templates/</code>.</li>
          <li>The agent generates a new UI surface using P31-Q tokens + the template spec.</li>
        </ol>
      </GlassPanel>
    </div>
  );
}

function ColorGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {COLORS.map(c => <ColorSwatch key={c.name} name={c.name} value={c.value} />)}
    </div>
  );
}

const COMPONENTS = [
  { name: 'GlassPanel', desc: 'Glassmorphic elevated surface with backdrop blur.', tokens: 'glass-surface, glass-border', css: 'glass-panel' },
  { name: 'GlassCard', desc: 'Compact glassmorphic card with padding.', tokens: 'glass-surface, glass-border, glass-border-hover', css: 'glass-card' },
  { name: 'GlassStrong', desc: 'High-opacity glass with strong blur. Use for navbars.', tokens: 'glass-surface-strong, blur-strong', css: 'glass-strong' },
  { name: 'GlassSubtle', desc: 'Low-opacity glass with subtle blur.', tokens: 'glass-surface-subtle, blur-subtle', css: 'glass-subtle' },
  { name: 'Button', desc: 'Button with primary/secondary/ghost variants.', tokens: 'accent, void, shadow-glow', css: 'btn-primary / btn-secondary / btn-ghost' },
  { name: 'SpoonMeter', desc: 'Cognitive load indicator (0-5). localStorage persisted.', tokens: 'accent, text-tertiary', css: 'spoon-meter' },
  { name: 'SpoonDial', desc: 'Icon-mode spoon meter for compact header placement.', tokens: 'accent, text-tertiary, spoon-icon', css: 'spoon-dial' },
  { name: 'TetraGrid', desc: '4-column responsive grid for tetrahedral layouts.', tokens: '—', css: 'tetra-grid' },
  { name: 'HonestLabel', desc: 'Disclaimer badge for contested-science content.', tokens: 'font-mono, text-tertiary', css: 'honest-label' },
  { name: 'StatusBadge', desc: 'Live/Beta/Research status indicator.', tokens: 'green, cyan, violet', css: 'status-badge-live / -beta / -research' },
  { name: 'CrisisOverlay', desc: 'Full-screen breathing overlay at spoons=0.', tokens: 'bg', css: 'crisis-overlay' },
  { name: 'Starfield', desc: '3-layer parallax jitterbug cuboctahedron starfield.', tokens: '—', css: '#starfield' },
  { name: 'ThemeToggle', desc: 'Dark/light toggle with localStorage persistence.', tokens: 'bg, light-background', css: '#theme-toggle' },
  { name: 'CandyHeader', desc: 'Canonical candy-pill header bar with glass styling.', tokens: 'header-candy, crown-xs, spoon-icon', css: 'candy-header' },
  { name: 'Crown', desc: 'Animated tetrahedral crown brand glyph.', tokens: 'crown-xs, cyan, violet, gold, green, iris', css: 'crown' },
  { name: 'Card', desc: 'Generic glass card for content containers.', tokens: 'glass-surface, glass-border, radius-lg, shadow-glass', css: 'card' },
  { name: 'Topbar', desc: 'Portal top navigation bar with glass effect.', tokens: 'glass-surface, void, spacing-lg', css: 'topbar' },
  { name: 'BottomNav', desc: 'Fixed bottom tab navigation for mobile layouts.', tokens: 'glass-surface, void, spacing-sm', css: 'bottom-nav' },
  { name: 'Badge', desc: 'Compact status or metric badge with dot indicator.', tokens: 'glass-surface, glass-border, radius-full', css: 'badge' },
  { name: 'Toast', desc: 'Transient notification toast for feedback.', tokens: 'glass-surface, glass-border-strong, radius-md', css: 'toast' },
];

function ComponentCatalog() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {COMPONENTS.map(c => (
        <GlassCard key={c.name}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{c.name}</h3>
            <code className="text-[10px] font-mono text-accent bg-glass-bg px-1.5 py-0.5 rounded">{c.css}</code>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">{c.desc}</p>
          <div className="text-[10px] font-mono text-text-tertiary">Tokens: {c.tokens}</div>
        </GlassCard>
      ))}
    </div>
  );
}

const PLAYGROUND_PRESETS: Record<string, string> = {
  hero: '{"component":"Hero","children":[{"component":"Label","properties":{"text":"501(c)(3) Nonprofit","variant":"badge"}},{"component":"Heading","properties":{"text":"Sovereign Care","level":1}},{"component":"Text","properties":{"text":"Open-source assistive technology.","variant":"subtitle"}},{"component":"ButtonRow","properties":{"buttons":[{"label":"Enter PHOS","href":"https://phos.p31ca.org","variant":"primary"},{"label":"Research","variant":"ghost"}]}},{"component":"StatRow","properties":{"stats":[{"value":"—","label":"Families"},{"value":"—","label":"LOVE"},{"value":"—","label":"Apps"}]}}]}',
  tetra: '{"component":"TetraGrid","children":[{"component":"GlassCard","properties":{"title":"Quantum Core","description":"SIC-POVM d=2","color":"accent"}},{"component":"GlassCard","properties":{"title":"Care Economy","description":"LOVE Ledger","color":"violet"}},{"component":"GlassCard","properties":{"title":"Research","description":"22 Papers","color":"gold"}},{"component":"GlassCard","properties":{"title":"Impact","description":"18 Families","color":"green"}}]}',
  cards: '{"component":"Section","properties":{"variant":"grid"},"children":[{"component":"Heading","properties":{"text":"Research Papers","level":2}},{"component":"Text","properties":{"text":"Open-access publications.","variant":"description"}},{"component":"Grid","properties":{"columns":3},"children":[{"component":"GlassCard","properties":{"title":"K4","description":"Graph theory","color":"accent"}},{"component":"GlassCard","properties":{"title":"SIC-POVM","description":"Posner geometry","color":"violet"}},{"component":"GlassCard","properties":{"title":"Spoon-Aware UI","description":"Design framework","color":"gold"}}]}]}',
  cta: '{"component":"CTABlock","properties":{"heading":"Support Sovereign Care","description":"P31 Labs is community-funded.","buttons":[{"label":"Donate","href":"#","variant":"primary"},{"label":"GitHub","href":"https://github.com/p31labs","variant":"secondary"},{"label":"Discord","href":"https://discord.gg/uYW5rTCuZ","variant":"ghost"}]}}',
};

function A2UINode({ node }: { node: any }) {
  if (!node || !node.component) return null;
  const COLS: Record<string, string> = { accent: 'var(--p31-accent)', violet: 'var(--p31-accent-violet)', gold: 'var(--p31-accent-gold)', green: 'var(--p31-accent-green)', red: 'var(--p31-accent-red)' };

  switch (node.component) {
    case 'Hero':
      return (
        <section className="text-center p-8">
          {node.children?.map((c: any, i: number) => <A2UINode key={i} node={c} />)}
        </section>
      );
    case 'Heading': {
      const level = node.properties?.level || 2;
      const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
      return <Tag className="font-bold mb-3" style={{ color: 'var(--p31-text)' }}>{node.properties?.text}</Tag>;
    }
    case 'Text': {
      const v = node.properties?.variant;
      const cls = v === 'subtitle' ? 'text-text-secondary text-center max-w-2xl mx-auto mb-6' : v === 'description' ? 'text-text-secondary text-center max-w-2xl mx-auto mb-5' : 'text-text-secondary';
      return <p className={cls}>{node.properties?.text}</p>;
    }
    case 'Label':
      return <span className="glass-subtle inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-xs font-medium">{node.properties?.text}</span>;
    case 'ButtonRow':
      return (
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {(node.properties?.buttons || []).map((b: any, i: number) => (
            <a key={i} href={b.href || '#'} className={`btn-${b.variant === 'secondary' ? 'secondary' : b.variant === 'ghost' ? 'ghost' : 'primary'}`}>
              {b.label}
            </a>
          ))}
        </div>
      );
    case 'StatRow':
      return (
        <div className="flex flex-wrap gap-4 justify-center pt-5 border-t border-glass-border">
          {(node.properties?.stats || []).map((s: any, i: number) => (
            <div key={i} className="glass-subtle p-3 text-center min-w-[80px]">
              <div className="text-xl font-bold" style={{ color: 'var(--p31-text)' }}>{s.value}</div>
              <div className="text-[10px] text-text-tertiary uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      );
    case 'TetraGrid':
      return <div className="tetra-grid">{node.children?.map((c: any, i: number) => <A2UINode key={i} node={c} />)}</div>;
    case 'Grid':
      return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${node.properties?.columns || 3}, 1fr)`, gap: 12 }}>{node.children?.map((c: any, i: number) => <A2UINode key={i} node={c} />)}</div>;
    case 'GlassCard': {
      const color = node.properties?.color || 'accent';
      return (
        <div className="glass-card" style={{ borderLeft: `2px solid ${COLS[color] || COLS.accent}` }}>
          {node.properties?.title && <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--p31-text)' }}>{node.properties.title}</h3>}
          {node.properties?.description && <p className="text-xs text-text-secondary leading-relaxed">{node.properties.description}</p>}
        </div>
      );
    }
    case 'Section':
      return <section className="p-6 max-w-6xl mx-auto">{node.children?.map((c: any, i: number) => <A2UINode key={i} node={c} />)}</section>;
    case 'CTABlock':
      return (
        <div className="glass-strong p-10 text-center max-w-2xl mx-auto rounded-2xl">
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--p31-text)' }}>{node.properties?.heading}</h2>
          {node.properties?.description && <p className="text-text-secondary mb-5">{node.properties.description}</p>}
          <div className="flex flex-wrap gap-3 justify-center">
            {(node.properties?.buttons || []).map((b: any, i: number) => (
              <a key={i} href={b.href || '#'} className={`btn-${b.variant === 'secondary' ? 'secondary' : b.variant === 'ghost' ? 'ghost' : 'primary'}`}>{b.label}</a>
            ))}
          </div>
        </div>
      );
    default:
      return <div className="text-text-tertiary text-xs font-mono">?{node.component}</div>;
  }
}

function LayoutPlayground() {
  const [json, setJson] = useState(PLAYGROUND_PRESETS.hero);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get('playground');
    if (preset && PLAYGROUND_PRESETS[preset]) {
      setJson(PLAYGROUND_PRESETS[preset]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJson(e.target.value);
    setError('');
  };

  let parsed: any = null;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Invalid JSON');
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(PLAYGROUND_PRESETS).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setJson(val)}
            className="px-3 py-1.5 rounded-lg border border-glass-border cursor-pointer text-xs transition-all bg-transparent text-text-secondary hover:border-accent hover:text-accent"
          >
            {key === 'hero' ? 'Hero' : key === 'tetra' ? 'Tetra Grid' : key === 'cards' ? 'Card Grid' : 'CTA Block'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <textarea
          value={json}
          onChange={handleChange}
          className="w-full h-80 p-4 rounded-xl font-mono text-xs resize-y"
          style={{
            background: 'var(--p31-surface)',
            color: 'var(--p31-text)',
            border: '1px solid var(--p31-glass-border)',
          }}
          spellCheck={false}
        />
        <div
          className="p-4 rounded-xl min-h-[320px] overflow-auto"
          style={{ background: 'var(--p31-surface)', border: '1px solid var(--p31-glass-border)' }}
        >
          {error && <div className="text-xs font-mono" style={{ color: 'var(--p31-accent-red)' }}>Error: {error}</div>}
          {!error && parsed && <A2UINode node={parsed} />}
        </div>
      </div>
    </div>
  );
}

const ICONS = [
  { id: 'k4-tetrahedron', family: 'regular', name: 'K4 Tetrahedron' },
  { id: 'molecule', family: 'regular', name: 'Molecule' },
  { id: 'signal', family: 'regular', name: 'Signal' },
  { id: 'mesh-node', family: 'regular', name: 'Mesh Node' },
  { id: 'spoon', family: 'regular', name: 'Spoon' },
  { id: 'p31-wordmark', family: 'regular', name: 'P31 Wordmark' },
  { id: 'love-heart', family: 'regular', name: 'LOVE Heart' },
  { id: '863hz-resonance', family: 'regular', name: '863 Hz Resonance' },
  { id: 'sovereign-crown', family: 'advanced', name: 'Sovereign Crown' },
  { id: 'prism-fold', family: 'advanced', name: 'Prism Fold' },
  { id: 'nebula-burst', family: 'advanced', name: 'Nebula Burst' },
  { id: 'comet-orb', family: 'advanced', name: 'Comet Orb' },
];

function IconGallery() {
  const [filter, setFilter] = useState<'all' | 'regular' | 'advanced'>('all');
  const filtered = filter === 'all' ? ICONS : ICONS.filter(i => i.family === filter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(['all', 'regular', 'advanced'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${filter === f ? 'border-accent text-accent' : 'border-glass-border text-text-secondary'}`}
          >
            {f === 'all' ? 'All' : f === 'regular' ? 'Regular' : 'Advanced'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filtered.map(icon => (
          <GlassCard key={icon.id}>
            <div className="text-lg font-semibold mb-1" style={{ color: 'var(--p31-text)' }}>{icon.name}</div>
            <div className="text-[10px] font-mono text-text-tertiary uppercase tracking-wider">{icon.family}</div>
            <div className="text-xs text-text-secondary mt-2">Animated SVG with {icon.family === 'advanced' ? '6-color palette' : '3-color palette'}</div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

const sections = [
  { id: 'colors', label: 'Colors', eyebrow: '01 — Color', title: 'Nine ramps. One truth per pixel.', blurb: 'Every color is a spoken commitment: what it means is what it does. No decoration, only signal.', icon: <Palette size={16} />, component: <ColorGrid /> },
  { id: 'typography', label: 'Typography', eyebrow: '02 — Typography', title: 'Three voices. One rhythm — ×1.25, always.', blurb: 'Plus Jakarta Sans carries the voice. Fira Code carries the proof.', icon: <Type size={16} />, component: <TypographyDemo /> },
  { id: 'spoons', label: 'Spoons', eyebrow: '03 — Spoons', title: 'Energy is the input. Respect is the output.', blurb: 'The same button, six times, six truths. Motion, blur and decoration all scale with cognitive load.', icon: <Zap size={16} />, component: <SpoonDemo /> },
  { id: 'glass', label: 'Glass', eyebrow: '04 — Glass', title: 'Surfaces you can see stars through.', blurb: 'Three tiers of the same membrane over the living jitterbug background.', icon: <Layers size={16} />, component: <GlassDemo /> },
  { id: 'components', label: 'Components', eyebrow: '05 — Components', title: 'Twelve primitives. Zero hardcodes.', blurb: 'Every value below traces to a token above. Nothing here is a magic number.', icon: <Box size={16} />, component: <ComponentCatalog /> },
  { id: 'tokens', label: 'Tokens', eyebrow: '06 — Tokens', title: 'Search the single source of truth.', blurb: 'All 124 CSS custom properties — color, spacing, radius, type, blur, shadow — searchable and resolvable.', icon: <Palette size={16} />, component: <TokenExplorer /> },
  { id: 'recipes', label: 'Recipes', eyebrow: '07 — Recipes', title: '171 classes. Live CSS.', blurb: 'Framework-agnostic recipe classes — browse them, see their source, use them anywhere.', icon: <Layers size={16} />, component: <RecipeBrowser /> },
  { id: 'intent', label: 'Intent DSL', eyebrow: '08 — Intent', title: 'Design as a reasoning problem.', blurb: 'Write an intent, run the Opus gates live. WCAG-AAA, spoon ladder, touch targets and LOVE semantics are enforced.', icon: <Terminal size={16} />, component: <IntentPlayground /> },
  { id: 'playground', label: 'Playground', eyebrow: '09 — A2UI', title: 'Paste JSON. See it live.', blurb: 'The A2UI playground renders declarative UI against P31 glass components.', icon: <Play size={16} />, component: <LayoutPlayground /> },
  { id: 'templates', label: 'Templates', eyebrow: '10 — Templates', title: 'Canonical page templates.', blurb: 'Select a template, copy the URL, and hand it to your agent.', icon: <LayoutTemplate size={16} />, component: <TemplateBrowser /> },
  { id: 'icons', label: 'Icons', eyebrow: '11 — Icons', title: 'Animated sovereign glyphs.', blurb: '12 animated SVGs — regular and advanced families.', icon: <LayoutTemplate size={16} />, component: <IconGallery /> },
  { id: 'mcp', label: 'MCP Console', eyebrow: '12 — MCP', title: 'Agents speak design fluently.', blurb: 'A live JSON-RPC console against the P31 design MCP server.', icon: <Terminal size={16} />, component: <McpConsole /> },
];

export default function App() {
  const [spoons, setSpoons] = useState(3);

  useEffect(() => {
    document.documentElement.setAttribute('data-spoons', String(spoons));
  }, [spoons]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <AmbientStarfield spoons={spoons} />
      <div className="portal-shell">
        <Topbar
          brand={<><span className="text-accent">Ⓟ</span> 31 Design</>}
          center={
            <div className="flex items-center gap-3">
              <div className="badge"><span className="heartbeat">💎</span> <strong>—</strong> LOVE</div>
              <div className="badge badge-success">⬡ Design System</div>
            </div>
          }
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThemePicker />
              <SpoonDial value={spoons} onChange={setSpoons} min={0} max={5} />
            </div>
          }
        />

        <nav className="section-strip" aria-label="Design system sections">
          {sections.map(s => (
            <button key={s.id} onClick={() => scrollTo(s.id)} className="section-tab">
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1" id="main-content">
          <div className="portal-main">
            <section className="hero" aria-labelledby="hero-h1">
              <span className="hero-eyebrow">P31 Labs · Sovereign design system</span>
              <h1 id="hero-h1">The design system that breathes.</h1>
              <p className="hero-lede">Physics-derived tokens. Spoon-aware motion. Glass you can see stars through. Sovereign by default.</p>
              <div className="hero-ctas">
                <button className="btn btn-primary" onClick={() => scrollTo('colors')}>Explore the worlds</button>
                <button className="btn btn-secondary" onClick={() => scrollTo('mcp')}>MCP for agents</button>
              </div>
              <StarfieldScrubber />
            </section>

            {sections.map(s => (
              <section key={s.id} id={s.id} className="portal-section" aria-labelledby={`${s.id}-h2`}>
                <div className="section-head">
                  <span className="section-eyebrow">{s.eyebrow}</span>
                  <h2 id={`${s.id}-h2`}>{s.title}</h2>
                  <p>{s.blurb}</p>
                </div>
                {s.component}
              </section>
            ))}

            <footer style={{ textAlign: 'center', padding: '48px 0 24px', fontFamily: "'Fira Code', monospace", fontSize: 11, color: 'var(--p31-text-tertiary)', borderTop: '1px solid var(--p31-glass-border)' }}>
              P31 Labs · AGPL-3.0 · The cage holds. 863 Hz. K₄ is planar. β₂ = 1. 🔺
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}
