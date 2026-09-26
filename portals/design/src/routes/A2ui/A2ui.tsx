import { useMemo, useState } from 'react';
import { renderA2ui, usedCatalogTypes, generateA2ui, type A2uiNode } from '../../lib/a2uiCatalog';
import { SurfaceLayout, SurfaceHero, SurfaceSection } from '../../lib/surface';
import '../../surfaces/a2ui.css';

/** Seed intents — the "agent" pipeline is local + deterministic (no backend). */
const SEEDS = [
  'Build me a revenue dashboard with 4 metric tiles.',
  'Show system status badges for api, database, and gateway services.',
  'A care checklist with three tasks for today.',
];

const INITIAL_INTENT = SEEDS[0];

/**
 * A2ui — generative-UI demo: intent → declarative JSON → rendered surface.
 * The middle pane is editable JSON with live re-render on every edit.
 */
export default function A2ui() {
  const [intent, setIntent] = useState(INITIAL_INTENT);
  const [json, setJson] = useState(() => JSON.stringify(generateA2ui(INITIAL_INTENT), null, 2));
  const [tree, setTree] = useState<A2uiNode | null>(() => generateA2ui(INITIAL_INTENT));
  const [error, setError] = useState<string | null>(null);

  const generate = (from: string) => {
    const next = generateA2ui(from);
    setTree(next);
    setJson(JSON.stringify(next, null, 2));
    setError(null);
  };

  const handleJsonChange = (value: string) => {
    setJson(value);
    try {
      const parsed = JSON.parse(value) as A2uiNode;
      if (!parsed || typeof parsed.type !== 'string') throw new Error('missing root "type"');
      setTree(parsed);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'invalid JSON');
    }
  };

  const exportJson = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'a2ui-surface.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const legend = useMemo(() => usedCatalogTypes(tree), [tree]);

  return (
    <section className="surface-panel active" data-mcp-tool="a2uiSurface" data-mcp-state="ready">
      <SurfaceLayout>
        <SurfaceHero
          eyebrow="Generative UI"
          title="A2UI"
          lede="Agent intent → declarative JSON → rendered from the trust catalog. Every step below is local and deterministic — no backend, no model."
        />

        <SurfaceSection>
          <div className="a2ui-shell">
        <aside className="a2ui-pane a2ui-pane--intent" data-mcp-tool="a2uiIntentPane" data-mcp-state="ready">
          <div className="a2ui-pane__head">
            <span className="a2ui-pane__label">01 · Intent</span>
          </div>
          <label className="label-tiny" htmlFor="a2ui-intent">Describe the surface</label>
          <textarea
            id="a2ui-intent"
            className="a2ui-textarea a2ui-textarea--intent"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            spellCheck={false}
          />
          <button type="button" className="btn btn-primary a2ui-generate" onClick={() => generate(intent)}>
            Generate
          </button>
          <div className="a2ui-seeds" aria-label="Example intents">
            {SEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className="chip a2ui-seed"
                onClick={() => {
                  setIntent(s);
                  generate(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </aside>

        <div className="a2ui-pane a2ui-pane--json" data-mcp-tool="a2uiJsonPane" data-mcp-state="ready">
          <div className="a2ui-pane__head">
            <span className="a2ui-pane__label">02 · Declarative JSON</span>
            <button type="button" className="btn btn-glass a2ui-export" onClick={exportJson}>
              Export JSON
            </button>
          </div>
          <textarea
            className={`a2ui-textarea a2ui-textarea--json ${error ? 'is-error' : ''}`}
            value={json}
            onChange={(e) => handleJsonChange(e.target.value)}
            spellCheck={false}
            aria-label="Editable A2UI JSON — edits re-render the surface live"
          />
          {error && (
            <p className="a2ui-error" role="alert">
              {error} — keeping the last valid surface.
            </p>
          )}
        </div>

        <div className="a2ui-pane a2ui-pane--render" data-mcp-tool="a2uiRenderPane" data-mcp-state="ready">
          <div className="a2ui-pane__head">
            <span className="a2ui-pane__label">03 · Rendered surface</span>
            <span className="a2ui-trust-badge">trust catalog</span>
          </div>
          <div className="a2ui-stage">{renderA2ui(tree)}</div>
          {legend.length > 0 && (
            <div className="a2ui-legend">
              <span className="label-tiny">resolved from catalog</span>
              <div className="meta-row">
                {legend.map((l) => (
                  <span key={l.type} className="chip a2ui-legend__chip" title={l.catalog}>
                    {l.type} → {l.catalog}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
          </div>
        </SurfaceSection>
      </SurfaceLayout>
    </section>
  );
}