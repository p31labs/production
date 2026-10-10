import { Component, type ReactNode, type ComponentType } from 'react';
import * as Compositions from '@p31ca/design-core/compositions';
import { COMPONENT_CATALOG } from '@p31ca/design-core/genui/catalog';

type CatalogComponent = (typeof COMPONENT_CATALOG)[number];

/** ErrorBoundary — a live render that throws is a finding, not a page crash. */
class RenderBoundary extends Component<{ name: string; children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="warning" role="alert">
          ⚠️ {this.props.name} failed to render live — a component finding, not a page failure:
          <code>{this.state.error}</code>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface ComponentPageProps {
  name: string;
}

/** ComponentPage — the fixed 9-section spine, rendered from the catalog + the
 *  live composition. Order is load-bearing (zeroheight): readers learn the page
 *  once and reuse the mental map across every component. */
export default function ComponentPage({ name }: ComponentPageProps) {
  const entry = COMPONENT_CATALOG.find((c) => c.name === name);
  if (!entry) {
    return (
      <div className="warning" role="alert">
        ⚠️ Component “{name}” not in the catalog — a registry finding, not a page failure.
      </div>
    );
  }

  const Live = (Compositions as unknown as Record<string, ComponentType<any> | undefined>)[entry.name];
  const props = (entry.props ?? {}) as Record<string, { type?: string; default?: unknown; description?: string; required?: boolean }>;

  return (
    <article className="surface" data-mcp-tool="componentPage" data-component={entry.cssClass}>
      {/* ① Name + purpose */}
      <header className="surface-hero">
        <h1>{entry.name}</h1>
        <code className="component-class">{entry.cssClass}</code>
        <p>{entry.description}</p>
        <span className={`badge tier-${entry.tier}`}>{entry.tier}</span>
        <span className="badge">{entry.status}</span>
      </header>

      {/* ② When to use / when not */}
      <section aria-label="Usage">
        <h2>Usage</h2>
        {(entry.aiGuidance?.useWhen ?? []).length > 0 && (
          <>
            <h3>When to use</h3>
            <ul>{entry.aiGuidance!.useWhen!.map((u) => <li key={u}>{u}</li>)}</ul>
          </>
        )}
        {(entry.aiGuidance?.avoidWhen ?? []).length > 0 && (
          <>
            <h3>When not to use</h3>
            <ul>{entry.aiGuidance!.avoidWhen!.map((u) => <li key={u}>{u}</li>)}</ul>
          </>
        )}
      </section>

      {/* ③ Live render */}
      <section aria-label="Live preview">
        <h2>Live</h2>
        <div className="component-live">
          <RenderBoundary name={entry.name}>
            {Live ? <Live /> : <em>No composition export for {entry.name}.</em>}
          </RenderBoundary>
        </div>
      </section>

      {/* ⑤ Props */}
      {Object.keys(props).length > 0 && (
        <section aria-label="Props">
          <h2>Props</h2>
          <table className="props-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Default</th></tr>
            </thead>
            <tbody>
              {Object.entries(props).map(([k, v]) => (
                <tr key={k}>
                  <td><code>{k}</code></td>
                  <td>{v.type ?? '—'}</td>
                  <td>{v.default != null ? String(v.default) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ⑥ Tokens consumed */}
      {(entry.tokens ?? []).length > 0 && (
        <section aria-label="Tokens">
          <h2>Tokens</h2>
          <ul>{entry.tokens!.map((t) => <li key={t}><code>{t}</code></li>)}</ul>
        </section>
      )}

      {/* ⑦ Accessibility */}
      {(entry.accessibility ?? []).length > 0 && (
        <section aria-label="Accessibility">
          <h2>Accessibility</h2>
          <ul>{entry.accessibility!.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>
      )}

      {/* ⑨ Where to next */}
      <footer className="surface-footer">
        <a href="/components">Back to the catalog →</a>
        {' · '}
        source: <code>{entry.importPath ?? '@p31ca/design-core/compositions'}</code>
      </footer>
    </article>
  );
}

export type { CatalogComponent };