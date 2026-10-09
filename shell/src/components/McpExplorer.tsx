import { useState } from 'react';
import { useShellStore } from '../store/useShellStore';
import { MCP_ENDPOINTS, fetchMCPTools, callMCPTool, McpEndpoint } from '../lib/mcpRegistry';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function McpExplorer() {
  const open = useShellStore((s) => s.mcpOpen);
  const setOpen = useShellStore((s) => s.setMcpOpen);
  const [server, setServer] = useState(MCP_ENDPOINTS[0].id);
  const [tools, setTools] = useState<Array<{ name: string; description: string }> | null>(null);
  const [tool, setTool] = useState('');
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const { panelRef } = useFocusTrap(open, () => setOpen(false));

  const ep = MCP_ENDPOINTS.find((e) => e.id === server);

  const load = async () => { setLoading(true); const t = await fetchMCPTools(server); setTools(t); setLoading(false); };
  const call = async () => {
    if (!tool) return;
    setLoading(true);
    try { const r = await callMCPTool(server, tool); setResult(r); } catch (e: any) { setResult({ error: e.message }); }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="akinator-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} role="dialog" aria-modal="true" aria-labelledby="mcp-explorer-title">
      <div className="akinator-panel" ref={panelRef}>
        <div className="akinator-header">
          <span className="akinator-avatar">🔌</span>
          <h3 className="akinator-title" id="mcp-explorer-title">MCP Explorer</h3>
          <button type="button" className="akinator-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>
        <div className="akinator-body" style={{ gap: 'var(--p31-space-tiny)' }}>
          <select value={server} onChange={(e) => { setServer(e.target.value); setTools(null); setTool(''); }} className="akinator-search-input" style={{ width: '100%' }}>
            {MCP_ENDPOINTS.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          {ep && <p className="akinator-candidates-hint">{ep.description}</p>}
          <button type="button" className="btn primary" onClick={load} disabled={loading} style={{ alignSelf: 'flex-start', padding: '4px 14px' }}>Fetch Tools</button>
          {tools && (
            <div className="akinator-question-card">
              <select value={tool} onChange={(e) => setTool(e.target.value)} className="akinator-search-input" style={{ width: '100%' }}>
                <option value="">— {tools.length} tools —</option>
                {tools.map((t) => <option key={t.name} value={t.name}>{t.name} — {t.description}</option>)}
              </select>
              <button type="button" className="btn primary" onClick={call} disabled={!tool || loading} style={{ marginTop: 8, padding: '4px 14px' }}>Call</button>
              {result != null && <pre style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', overflow: 'auto', maxHeight: 150 }}>{JSON.stringify(result, null, 2)}</pre>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
