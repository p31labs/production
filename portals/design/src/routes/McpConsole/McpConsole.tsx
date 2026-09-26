import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { COMPONENT_CATALOG } from '@p31ca/design-core/genui/catalog';
import { PageHeader } from '@p31ca/design-core/compositions';
import { fadeIn, press, slideUp, staggerChildren } from '../../lib/motionPresets';
import { LiveExample } from '../../lib/livePreview';
import '../../surfaces/mcpconsole.css';

const MCP_URL = 'https://p31-design-mcp.trimtab-signal.workers.dev/mcp';
const LOG_LIMIT = 5;

interface CatalogEntry {
  name: string;
  description: string;
  cssClass: string;
  category: string;
  importPath: string;
  status: string;
  tokens: string[];
  variants: string[];
  accessibility: string[];
  aiGuidance: { useWhen: string[]; avoidWhen: string[]; examples: string[] };
  stories: { id: string; name: string; snippet: string }[];
}

const CATALOG = COMPONENT_CATALOG as unknown as CatalogEntry[];

interface Scored {
  entry: CatalogEntry;
  score: number;
  hits: string[];
  fields: string[];
}

interface RecResult {
  top: Scored;
  ranked: Scored[];
}

interface LogEntry {
  id: number;
  at: string;
  intent: string;
  name: string;
  score: number;
  remote: 'pending' | 'reachable' | 'unreachable';
}

const STOPWORDS = new Set([
  'i', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'for', 'in', 'on', 'with', 'is', 'are',
  'was', 'were', 'need', 'want', 'needs', 'wants', 'like', 'make', 'me', 'my', 'it', 'its',
  'this', 'that', 'show', 'shows', 'showing', 'give', 'gives', 'some', 'have', 'has', 'use',
  'using', 'build', 'create', 'please', 'then', 'your', 'about', 'into', 'just', 'can',
]);

const SAMPLE_INTENT = 'I need a card showing a metric with a delta.';

const SAMPLES = [
  SAMPLE_INTENT,
  'A button to submit a form.',
  'Navigation for a mobile app with five tabs.',
  'A dialog that traps focus and closes on Escape.',
];

const FIELD_WEIGHTS = {
  name: 3,
  description: 2,
  guidance: 1.5,
  category: 1.2,
  cssClass: 0.8,
  tokens: 0.5,
  accessibility: 0.5,
};

function splitCamel(name: string): string[] {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(' ');
}

function stem(term: string): string {
  return term.length > 3 && term.endsWith('s') ? term.slice(0, -1) : term;
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function scoreEntry(entry: CatalogEntry, terms: string[]): Scored {
  const fields: { label: keyof typeof FIELD_WEIGHTS; corpus: string[] }[] = [
    { label: 'name', corpus: [entry.name.toLowerCase(), ...splitCamel(entry.name)] },
    { label: 'description', corpus: tokenize(entry.description) },
    { label: 'guidance', corpus: tokenize([...entry.aiGuidance.useWhen, ...entry.aiGuidance.avoidWhen].join(' ')) },
    { label: 'category', corpus: tokenize(entry.category) },
    { label: 'cssClass', corpus: tokenize(entry.cssClass) },
    { label: 'tokens', corpus: tokenize(entry.tokens.join(' ')) },
    { label: 'accessibility', corpus: tokenize(entry.accessibility.join(' ')) },
  ];
  let score = 0;
  const hits: string[] = [];
  const matchedFields: string[] = [];
  for (const term of terms) {
    const st = stem(term);
    for (const { label, corpus } of fields) {
      if (corpus.some((c) => stem(c) === st)) {
        score += FIELD_WEIGHTS[label];
        if (!hits.includes(term)) hits.push(term);
        if (!matchedFields.includes(label)) matchedFields.push(label);
      }
    }
    if (term === entry.name.toLowerCase() || term === entry.cssClass.toLowerCase()) score += 0.8;
  }
  return { entry, score, hits, fields: matchedFields };
}

function tieBreak(a: CatalogEntry, b: CatalogEntry): number {
  if (a.status !== b.status) return a.status === 'stable' ? -1 : 1;
  if (a.importPath !== b.importPath) {
    if (a.importPath.includes('compositions')) return -1;
    if (b.importPath.includes('compositions')) return 1;
  }
  return a.name.length - b.name.length || a.name.localeCompare(b.name);
}

function recommend(input: string): RecResult {
  const terms = tokenize(input);
  const scored = CATALOG.map((entry) => scoreEntry(entry, terms))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || tieBreak(a.entry, b.entry));
  if (scored.length === 0) {
    const fallback = CATALOG.find((e) => e.name === 'GlassPanel') ?? CATALOG[0];
    const fb: Scored = { entry: fallback, score: 0, hits: [], fields: [] };
    return { top: fb, ranked: [fb] };
  }
  return { top: scored[0], ranked: scored.slice(0, 3) };
}

function codeFor(entry: CatalogEntry): string {
  return entry.stories[0]?.snippet ?? `<${entry.name} />`;
}

function remoteNote(remote: 'idle' | 'pending' | 'reachable' | 'unreachable'): { text: string; tone: string } {
  switch (remote) {
    case 'reachable':
      return { text: 'remote MCP reachable — recommendation from local canon', tone: 'mc-remote--ok' };
    case 'unreachable':
      return { text: 'remote MCP unreachable — local canon', tone: 'mc-remote--err' };
    case 'pending':
      return { text: 'probing remote MCP…', tone: '' };
    default:
      return { text: 'source: local canon', tone: '' };
  }
}

async function probeRemote(): Promise<'reachable' | 'unreachable'> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return 'unreachable';
    const data = (await res.json()) as { result?: { tools?: unknown[] } };
    return Array.isArray(data.result?.tools) && data.result.tools.length > 0 ? 'reachable' : 'unreachable';
  } catch {
    return 'unreachable';
  }
}

function demoByCategory(entry: CatalogEntry): ReactNode {
  switch (entry.category) {
    case 'action':
      return <button type="button" className="btn btn-primary">{entry.name}</button>;
    case 'feedback':
      return <span className="badge badge-spark">{entry.name}</span>;
    case 'navigation':
      return <div className="mc-demo__nav"><span className="chip active">{entry.name}</span></div>;
    case 'accessibility':
      return (
        <div className="spoon-dial" role="img" aria-label="Spoon dial demo">
          {[0, 1, 2, 3].map((n) => (
            <span key={n} className="spoon-dot active" />
          ))}
        </div>
      );
    case 'ambient':
      return <div className="mc-demo__ambient">{entry.name} ambient surface</div>;
    default:
      return <div className="glass-panel mc-demo__surface">{entry.name} — {entry.category} surface</div>;
  }
}

function demoFor(entry: CatalogEntry): ReactNode {
  switch (entry.name) {
    case 'MetricBadge':
      return (
        <div className="mc-demo__metric">
          <span className="mc-demo__metric-label">uptime</span>
          <strong className="mc-demo__metric-value">99.9%</strong>
          <span className="mc-demo__metric-delta">▲ 0.4 this week</span>
        </div>
      );
    case 'Button':
      return <button type="button" className="btn btn-primary">Primary action</button>;
    case 'Badge':
    case 'StatusBadge':
      return <span className="badge badge-spark">online</span>;
    case 'GlassPanel':
    case 'GlassCard':
    case 'GlassStrong':
    case 'GlassSubtle':
    case 'Card':
      return <div className="glass-panel mc-demo__surface">{entry.name} — elevated glass surface</div>;
    case 'SpoonDial':
    case 'SpoonMeter':
      return (
        <div className="spoon-dial" role="img" aria-label="Spoon dial demo">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= 3 ? 'spoon-dot active' : 'spoon-dot'} />
          ))}
        </div>
      );
    case 'Input':
    case 'Select':
    case 'Checkbox':
    case 'RadioGroup':
      return <div className="mc-demo__field">{entry.name}</div>;
    case 'CommandPalette':
      return <div className="mc-demo__cmdk">⌘K — search commands…</div>;
    case 'Starfield':
    case 'Chameleon':
      return <div className="mc-demo__ambient">{entry.name} ambient surface</div>;
    case 'CrisisOverlay':
      return <div className="mc-demo__crisis">Pause. Breathe. You ran low on spoons.</div>;
    case 'Topbar':
      return (
        <div className="mc-demo__topbar">
          <strong>P31</strong>
          <span className="mc-demo__topbar-tabs">Tokens · Recipes · Brands</span>
        </div>
      );
    case 'Footer':
      return <div className="mc-demo__footer">P31 Labs — sovereign, neuroinclusive interface foundation.</div>;
    case 'Tooltip':
      return (
        <div className="mc-demo__tooltip">
          <button type="button" className="btn btn-glass">Hover me</button>
          <span className="mc-demo__tip">More context lives here.</span>
        </div>
      );
    case 'Modal':
    case 'Dropdown':
      return (
        <div className="glass-panel mc-demo__surface">
          <button type="button" className="btn btn-glass">{entry.name} trigger</button>
        </div>
      );
    case 'SectionStrip':
    case 'BottomNav':
      return (
        <div className="mc-demo__nav">
          <span className="chip active">Tokens</span>
          <span className="chip">Recipes</span>
          <span className="chip">Brands</span>
        </div>
      );
    case 'PageHeader':
      return (
        <div className="mc-demo__header">
          <span className="mono" style={{ color: 'var(--p31-accent)', fontSize: 11 }}>SYSTEM</span>
          <h3>{entry.name}</h3>
        </div>
      );
    default:
      return demoByCategory(entry);
  }
}

export default function McpConsole() {
  const [intent, setIntent] = useState(SAMPLE_INTENT);
  const [rec, setRec] = useState<RecResult | null>(null);
  const [runId, setRunId] = useState(0);
  const [remote, setRemote] = useState<'idle' | 'pending' | 'reachable' | 'unreachable'>('idle');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);

  const demo = useMemo(() => (rec ? demoFor(rec.top.entry) : null), [rec]);

  const run = async () => {
    const trimmed = intent.trim();
    if (!trimmed) return;
    const result = recommend(trimmed);
    const id = Date.now();
    setRunId((r) => r + 1);
    setRec(result);
    setRemote('pending');
    const entry: LogEntry = {
      id,
      at: new Date().toLocaleTimeString(),
      intent: trimmed,
      name: result.top.entry.name,
      score: result.top.score,
      remote: 'pending',
    };
    setLog((l) => [entry, ...l].slice(0, LOG_LIMIT));
    const state = await probeRemote();
    setRemote(state);
    setLog((l) => l.map((e) => (e.id === id ? { ...e, remote: state } : e)));
  };

  const copy = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const note = remoteNote(remote);

  return (
    <div className="surface-panel active mc-page" data-mcp-tool="mcpConsoleSurface" data-mcp-state="ready">
      <PageHeader
        eyebrow="Agent-native · GenUI"
        title="MCP Console"
        lede="Describe the component you want — the console matches your intent against the 70-entry canon catalog, recommends the best fit, and hands you live code."
      />

      <motion.div className="mc-flow" initial="hidden" animate="visible" variants={staggerChildren(0.08)}>
        <motion.div className="mc-step" variants={slideUp}>
          <div className="mc-step__head">
            <span className="mc-step__num">01</span>
            <span className="mc-step__title">Intent</span>
          </div>
          <div className="mc-intent-row">
            <input
              className="mc-intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && run()}
              placeholder="I need a card showing a metric with a delta."
              aria-label="Describe the component you need"
            />
            <motion.button
              type="button"
              className="btn btn-primary mc-run"
              initial="rest"
              whileTap="pressed"
              variants={press}
              onClick={run}
              disabled={!intent.trim()}
            >
              Recommend
            </motion.button>
          </div>
          <div className="mc-samples" role="group" aria-label="Example intents">
            {SAMPLES.map((s) => (
              <button
                key={s}
                type="button"
                className="mc-sample"
                onClick={() => setIntent(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </motion.div>

        {rec && (
          <motion.div
            key={`rec-${runId}`}
            className="mc-step"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <div className="mc-step__head">
              <span className="mc-step__num">02</span>
              <span className="mc-step__title">Recommendation</span>
            </div>
            <div className="mc-rec__head">
              <span className="mc-rec__name">{rec.top.entry.name}</span>
              <span className="mc-rec__score">score {rec.top.score.toFixed(1)}</span>
            </div>
            <p className="mc-rec__why">
              {rec.top.hits.length > 0
                ? `Matched keyword${rec.top.hits.length === 1 ? '' : 's'} across ${rec.top.fields.join(', ')}.`
                : 'No keyword matched — fell back to the reference surface.'}
            </p>
            <div className="mc-hits">
              {rec.top.hits.map((h) => (
                <span key={h} className="mc-hit">{h}</span>
              ))}
            </div>
            {rec.ranked.length > 1 && (
              <div className="mc-also">
                <span>also considered</span>
                {rec.ranked.slice(1).map((r) => (
                  <span key={r.entry.name} className="mc-also__entry">
                    {r.entry.name} · {r.score.toFixed(1)}
                  </span>
                ))}
              </div>
            )}
            <div className="mc-step__head">
              <span className={`mc-remote ${note.tone}`}>{note.text}</span>
            </div>
          </motion.div>
        )}

        {rec && demo && (
          <motion.div
            key={`gen-${runId}`}
            className="mc-step"
            initial="hidden"
            animate="visible"
            variants={slideUp}
          >
            <div className="mc-step__head">
              <span className="mc-step__num">03</span>
              <span className="mc-step__title">Generated code</span>
            </div>
            <div className="mc-gen">
              <LiveExample title={`${rec.top.entry.name} preview`} render={() => demo} code={codeFor(rec.top.entry)} />
              <div className="mc-code-row">
                <pre className="mc-code"><code>{codeFor(rec.top.entry)}</code></pre>
                <motion.button
                  type="button"
                  className="btn btn-glass mc-copy"
                  initial="rest"
                  whileTap="pressed"
                  variants={press}
                  onClick={() => copy(codeFor(rec.top.entry))}
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div className="mc-log" variants={slideUp} aria-label="Recent recommendations">
          <span className="mc-log__head">console — last {LOG_LIMIT}</span>
          {log.length === 0 ? (
            <span className="mc-log__empty">No interactions yet — run an intent above.</span>
          ) : (
            log.map((e) => (
              <span key={e.id} className="mc-log__line">
                {e.at} · <strong>{e.name}</strong> · score {e.score.toFixed(1)} · {e.remote === 'unreachable' ? 'local canon' : e.remote === 'reachable' ? 'remote+local' : '…'} · “{e.intent}”
              </span>
            ))
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}