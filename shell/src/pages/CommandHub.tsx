import { useState, useMemo } from 'react';
import {
  SERVICES,
  CATEGORIES,
  CATEGORY_LABELS,
  type ServiceCategory,
  type Service,
} from '../data/serviceRegistry';
import GlassCard from '../components/ui/GlassCard';
import { useWorkerHealth } from '../hooks/useWorkerHealth';

const STATUS_DOT: Record<string, string> = {
  online: '🟢',
  degraded: '🟡',
  offline: '🔴',
  unknown: '⚪',
};

function ServiceCard({ service, status }: { service: Service; status: string }) {
  return (
    <GlassCard variant="default" className="hub-service-card" interactive onClick={service.action.onClick}>
      <div className="hub-card-header">
        <span className="hub-card-icon">{service.icon}</span>
        {service.toolCount != null && (
          <span className="hub-card-badge">{service.toolCount} tools</span>
        )}
        <span className="hub-card-status" aria-label={`Status: ${status}`}>{STATUS_DOT[status] ?? '⚪'}</span>
      </div>
      <h3 className="hub-card-name">{service.name}</h3>
      <p className="hub-card-desc">{service.description}</p>
      <span className="hub-card-action">{service.action.label} →</span>
    </GlassCard>
  );
}

export default function CommandHub() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | null>(null);
  const healthEntries = useWorkerHealth();

  const getStatus = (id: string): string => {
    const entry = Object.values(healthEntries).find(
      (h) => h.id === id || h.id.toLowerCase() === id.toLowerCase()
    );
    if (!entry) return 'unknown';
    if (entry.status === 'healthy') return 'online';
    if (entry.status === 'degraded') return 'degraded';
    return 'offline';
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SERVICES.filter((s) => {
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      const matchesCategory = !activeCategory || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<ServiceCategory, Service[]>();
    for (const s of filtered) {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    }
    return map;
  }, [filtered]);

  return (
    <div className="command-hub page-fill p31-ambient-bg">
      <header className="hub-header">
        <h1 className="hub-title">Command Hub</h1>
        <p className="hub-subtitle">{SERVICES.length} services across {CATEGORIES.length} categories</p>
        <input
          type="search"
          className="hub-search"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search services"
        />
        <div className="hub-filters" role="tablist" aria-label="Filter by category">
          <button
            type="button"
            className={`hub-filter-pill${activeCategory === null ? ' active' : ''}`}
            onClick={() => setActiveCategory(null)}
            role="tab"
            aria-selected={activeCategory === null}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`hub-filter-pill${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              role="tab"
              aria-selected={activeCategory === cat}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </header>

      <div className="hub-grid">
        {filtered.length === 0 && (
          <p className="hub-empty">No services match your search.</p>
        )}
        {Array.from(grouped.entries()).map(([cat, services]) => (
          <section key={cat} className="hub-category-section">
            <h2 className="hub-category-title">{CATEGORY_LABELS[cat]}</h2>
            <div className="hub-category-grid">
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} status={getStatus(s.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="hub-footer">
        {filtered.length} of {SERVICES.length} services
        {activeCategory && ` in ${CATEGORY_LABELS[activeCategory]}`}
      </footer>
    </div>
  );
}
