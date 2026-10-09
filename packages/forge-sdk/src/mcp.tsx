import React, { useState, useEffect } from 'react';

export function MCPToolPanel() {
  const [tools, setTools] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fallback = [
      { name: 'membrane_status', description: 'Get Membrane system status', server: 'Membrane', category: 'system', price: 'free' },
      { name: 'membrane_deploy', description: 'Start a deploy verification', server: 'Membrane', category: 'deploy', price: 'free' },
      { name: 'membrane_dora', description: 'Get DORA metrics', server: 'Membrane', category: 'metrics', price: 'free' },
      { name: 'membrane_achievements', description: 'List achievements', server: 'Membrane', category: 'gamification', price: 'free' },
      { name: 'oasis_status', description: 'Get Oasis system status', server: 'Oasis CLI', category: 'system', price: 'free' },
      { name: 'phos_deploy', description: 'Deploy a surface to PHOS', server: 'PHOS Forge', category: 'deploy', price: '0.05' },
      { name: 'cog_spoon_meter', description: 'Cognitive load estimation', server: 'Cognitive Prosthetic', category: 'cognitive', price: 'free' },
      { name: 'marge_audit', description: 'Run design compliance audit', server: 'MARGE', category: 'audit', price: 'free' },
      { name: 'bob_audit', description: 'Run structural audit', server: 'BOB', category: 'audit', price: 'free' },
      { name: 'love_balance', description: 'Get LOVE balance', server: 'LOVE Ledger', category: 'economy', price: 'free' },
    ];
    setTools(fallback);
    setLoading(false);
  }, []);

  const categories = [...new Set(tools.map(t => t.category))];
  const filtered = tools.filter(t =>
    (t.name.toLowerCase().includes(filter.toLowerCase()) || t.description.toLowerCase().includes(filter.toLowerCase())) &&
    (!selectedCategory || t.category === selectedCategory)
  );

  const executeTool = async (tool: any) => {
    try {
      const res = await fetch('https://x402-gateway.trimtab-signal.workers.dev/call', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: tool.name, params: {} }),
      });
      const data = await res.json();
      console.log(`[MCP] ${tool.name} result:`, data);
    } catch (e) {
      console.error(`[MCP] ${tool.name} failed:`, e);
    }
  };

  return (
    <div className="h-full flex flex-col p-2" style={{ background: '#0A0A0F' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold opacity-60">MCP Tools</span>
        <span className="text-[10px] opacity-30">{tools.length} tools</span>
      </div>

      <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
        placeholder="Search tools..." className="w-full px-2 py-1 rounded text-xs mb-2"
        style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: 'none', outline: 'none' }} />

      <div className="flex flex-wrap gap-1 mb-2">
        <button onClick={() => setSelectedCategory(null)}
          className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: !selectedCategory ? '#00ffcc' : 'rgba(255,255,255,0.08)', color: !selectedCategory ? '#000' : '#888' }}>All</button>
        {categories.map(c => (
          <button key={c} onClick={() => setSelectedCategory(c)}
            className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: selectedCategory === c ? '#00ffcc' : 'rgba(255,255,255,0.08)', color: selectedCategory === c ? '#000' : '#888' }}>{c}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5">
        {loading ? <div className="text-xs opacity-30 text-center py-4">Loading...</div>
          : filtered.length === 0 ? <div className="text-xs opacity-30 text-center py-4">No tools match</div>
          : filtered.map(tool => (
            <button key={tool.name} onClick={() => executeTool(tool)}
              className="w-full text-left px-2 py-1 rounded flex items-center justify-between group"
              style={{ background: 'rgba(255,255,255,0.08)', opacity: 0.85 }}>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono truncate">{tool.name}</div>
                <div className="text-[9px] opacity-30 truncate">{tool.description.slice(0, 50)}</div>
              </div>
              <span className="text-[8px] opacity-20 shrink-0 ml-2">{tool.server}</span>
            </button>
          ))}
      </div>
    </div>
  );
}

export default MCPToolPanel;
