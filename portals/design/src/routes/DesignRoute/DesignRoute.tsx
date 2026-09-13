import { useMemo, useState } from 'react';
import { TOKEN_MAP, TOKENS_DATA } from '@p31/design-core/mcp/data';
import { GlassPanel, GlassCard, PageHeader } from '@p31/design-core/compositions';
import TokenExplorer from '../../components/TokenExplorer';
import { NAV_SECTIONS, type NavSection } from '../../lib/nav';

export default function DesignRoute() {
  const [activeTab, setActiveTab] = useState<'tokens' | 'components' | 'icons'>('tokens');

  const tokenGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const key of Object.keys(TOKEN_MAP)) {
      const g = key.split('-')[0] || 'other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(key);
    }
    return groups;
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <PageHeader
        eyebrow="Design System"
        title="P31 Design Route"
        lede="Token reference, component catalog, and icon registry. A focused view of the design system spec."
      >
        <span className="text-xs" style={{ color: 'var(--p31-text-muted)' }}>{Object.keys(TOKEN_MAP).length} tokens</span>
      </PageHeader>

      <div className="flex gap-2 mb-6" role="tablist" aria-label="Design sections">
        {[
          { id: 'tokens', label: 'Tokens' },
          { id: 'components', label: 'Components' },
          { id: 'icons', label: 'Icons' },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className="btn btn-ghost text-sm"
            style={{
              borderBottom: activeTab === tab.id ? '2px solid var(--p31-accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--p31-accent)' : 'var(--p31-text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'tokens' && (
        <GlassPanel>
          <div className="text-sm font-semibold mb-3">Token Explorer</div>
          <TokenExplorer />
        </GlassPanel>
      )}

      {activeTab === 'components' && (
        <GlassPanel>
          <div className="text-sm font-semibold mb-3">Component Catalog</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NAV_SECTIONS.map((section: NavSection) => (
              <GlassCard key={section.path}>
                <div className="text-sm font-semibold" style={{ color: 'var(--p31-accent)' }}>{section.label}</div>
                <div className="text-xs" style={{ color: 'var(--p31-text-muted)' }}>{section.path}</div>
              </GlassCard>
            ))}
          </div>
        </GlassPanel>
      )}

      {activeTab === 'icons' && (
        <GlassPanel>
          <div className="text-sm font-semibold mb-3">Icon Registry</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {['k4-tetrahedron', 'molecule', 'signal', 'mesh-node', 'spoon', 'p31-wordmark', 'love-heart', '863hz-resonance', 'sovereign-crown', 'prism-fold', 'nebula-burst', 'comet-orb'].map((id) => (
              <GlassCard key={id}>
                <div className="text-sm font-semibold">{id}</div>
              </GlassCard>
            ))}
          </div>
        </GlassPanel>
      )}

      <GlassPanel>
        <div className="text-sm font-semibold mb-3">Token Groups</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(tokenGroups).map(([group, keys]) => (
            <div key={group} className="text-sm">
              <div className="font-semibold" style={{ color: 'var(--p31-accent)' }}>{group}</div>
              <div className="text-xs" style={{ color: 'var(--p31-text-muted)' }}>{keys.length} tokens</div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
