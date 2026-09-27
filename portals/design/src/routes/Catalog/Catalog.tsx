import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { StatusBadge, GlassPanel } from '@p31ca/design-core/compositions';
import { LiveExample } from '../../lib/livePreview';
import { fadeIn, slideUp, staggerChildren, press } from '../../lib/motionPresets';
import { SurfaceLayout, SurfaceHero, SurfaceSection, SurfaceGrid, SurfaceCard } from '../../lib/surface';
import {
  CATALOG_ENTRIES,
  CATEGORIES,
  SAFE_PROPS,
  codeFor,
  renderEntry,
  type CatalogEntry,
} from '../Marketplace/Marketplace';
import '../../surfaces/catalog.css';

const badgeStatus = (status: string) =>
  status === 'stable' ? 'online' : status === 'beta' ? 'busy' : 'offline';

/** Canonical catalog — every genui component grouped by category, rendered live. */
export default function Catalog() {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: CATALOG_ENTRIES.length };
    for (const e of CATALOG_ENTRIES) c[e.category] = (c[e.category] ?? 0) + 1;
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG_ENTRIES.filter((e) => {
      const catOk = category === 'all' || e.category === category;
      const qOk = !q || e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [category, query]);

  const groups = useMemo(() => {
    const g: Array<{ category: string; items: CatalogEntry[] }> = [];
    for (const cat of CATEGORIES) {
      if (cat === 'all') continue;
      const items = filtered.filter((e) => e.category === cat);
      if (items.length > 0) g.push({ category: cat, items });
    }
    return g;
  }, [filtered]);

  return (
    <section className="surface-panel active" data-mcp-tool="catalogSurface" data-mcp-state="ready">
      <SurfaceLayout>
        <SurfaceHero
          eyebrow="Canonical catalog"
          title="Catalog"
          lede={`${CATALOG_ENTRIES.length} components from @p31ca/design-core — rendered live, contract-tagged, import-ready.`}
        />

        <SurfaceSection title="Browse the catalog">
          <GlassPanel strong>
            <div className="meta-row qm-cat-toolbar">
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
                className="input qm-cat-search"
                placeholder="Search components…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search catalog"
              />
            </div>
          </GlassPanel>
        </SurfaceSection>

        <SurfaceSection title="Component registry">
          <div className="glass-tile">
            {filtered.length === 0 ? (
              <motion.div className="preview-box qm-empty" initial="hidden" animate="visible" variants={fadeIn}>
                <span className="preview-box__text">No components match &quot;{query}&quot;.</span>
              </motion.div>
            ) : (
              <motion.div
                className="qm-cat-groups"
                variants={staggerChildren(0.08)}
                initial="hidden"
                animate="visible"
              >
                {groups.map(({ category: cat, items }) => (
                  <motion.section
                    key={cat}
                    variants={slideUp}
                    className="qm-cat-group"
                    data-mcp-tool={`catalogGroup-${cat}`}
                    data-mcp-state="ready"
                  >
                    <div className="qm-cat-group-head">
                      <h2 className="qm-cat-group-title">{cat}</h2>
                      <span className="qm-cat-group-count">{items.length}</span>
                    </div>
                    <SurfaceGrid columns={3}>
                      <motion.div variants={staggerChildren(0.04)} style={{ display: 'contents' }}>
                        {items.map((e) => (
                          <SurfaceCard
                            key={e.name}
                            className="qm-cat-card"
                            motionProps={{ variants: slideUp }}
                            head={
                              <div className="surface-card-header">
                                <span className="surface-card-title surface-card-title--mono">{e.name}</span>
                                <StatusBadge status={badgeStatus(e.status)} label={e.status} />
                              </div>
                            }
                            body={
                              <>
                                <p className="surface-card-desc">{e.description}</p>
                                <LiveExample
                                  title="Live example"
                                  render={(props) => renderEntry(e, props)}
                                  initialProps={SAFE_PROPS[e.name] ?? {}}
                                  code={codeFor(e)}
                                />
                              </>
                            }
                            foot={<span className="qm-cat-import mono">{e.importPath}</span>}
                          />
                        ))}
                      </motion.div>
                    </SurfaceGrid>
                  </motion.section>
                ))}
              </motion.div>
            )}
          </div>
        </SurfaceSection>
      </SurfaceLayout>
    </section>
  );
}