import { useMemo } from 'react';
import { COMPONENT_CATALOG } from '@p31ca/design-core/genui/catalog';
import adoption from '../../data/adoption.json';

/** AdoptionPage — the system telling its own story. The six-axis maturity
 *  model named the gap: strong substrate, thin adoption. This page is the fix —
 *  it renders the real consumption signal (which components are used where). */
export default function AdoptionPage() {
  const used = useMemo(() => new Set(adoption.components.map((c) => c.name)), []);
  const total = COMPONENT_CATALOG.length;
  const unused = useMemo(() => COMPONENT_CATALOG.filter((c) => !used.has(c.name)), [used]);
  const tierDist = useMemo(() => {
    const d: Record<string, number> = {};
    for (const c of COMPONENT_CATALOG) d[c.tier] = (d[c.tier] ?? 0) + 1;
    return d;
  }, []);

  return (
    <div className="surface" data-mcp-tool="adoptionSurface">
      <header className="surface-hero">
        <h1>Adoption</h1>
        <p>The system, used. Generated from the codebase — which components each surface actually imports.</p>
      </header>

      <div className="adoption-stats">
        <div className="stat"><span className="stat-value">{adoption.componentCount}/{total}</span><span className="stat-label">components consumed</span></div>
        <div className="stat"><span className="stat-value">{adoption.surfaces}</span><span className="stat-label">consuming surfaces</span></div>
        <div className="stat"><span className="stat-value">{unused.length}</span><span className="stat-label">not yet adopted</span></div>
      </div>

      <section aria-label="Consumed components">
        <h2>Most consumed</h2>
        <ul className="adoption-list">
          {adoption.components.map((c) => (
            <li key={c.name}>
              <a href={`/components/${c.name}`}><code>{c.name}</code></a>
              <span className="dim"> — {c.surfaceCount} surface{c.surfaceCount === 1 ? '' : 's'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Not yet adopted">
        <h2>Not yet adopted ({unused.length})</h2>
        {unused.length === 0 ? (
          <p>Every component is consumed. Full adoption.</p>
        ) : (
          <ul className="adoption-list">
            {unused.map((c) => (
              <li key={c.name}>
                <a href={`/components/${c.name}`}><code>{c.name}</code></a>
                <span className="dim"> — {c.tier}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Tier distribution">
        <h2>Tier distribution</h2>
        <ul className="adoption-list">
          {Object.entries(tierDist).map(([tier, n]) => (
            <li key={tier}><span className={`badge tier-${tier}`}>{tier}</span> <span className="dim">— {n}</span></li>
          ))}
        </ul>
      </section>

      <footer className="surface-footer">
        Source: <code>scripts/gen-adoption.mjs</code> → <code>src/data/adoption.json</code> (generated).
      </footer>
    </div>
  );
}