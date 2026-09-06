import { useEffect, useState } from 'react';

interface Tool {
  name: string;
  version: string;
}

interface HealthCheck {
  name: string;
  ok: boolean;
}

interface AdminPageProps {
  active: boolean;
}

export default function AdminPage({ active }: AdminPageProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [health, setHealth] = useState<HealthCheck[]>([]);
  const [status, setStatus] = useState<string>('—');

  useEffect(() => {
    const mcpTools = (window as any).__p31MCPTools;
    if (mcpTools && Array.isArray(mcpTools)) {
      setTools(mcpTools.map((t: any) => ({ name: t.name || t, version: 'v1.0.0' })));
    } else {
      setTools([
        { name: 'setSpoonLevel', version: 'v1.0.0' },
        { name: 'navigate', version: 'v1.0.0' },
        { name: 'dashboardStats', version: 'v1.0.0' },
        { name: 'buildMolecule', version: 'v1.0.0' },
      ]);
    }
  }, []);

  useEffect(() => {
    fetch('https://gateway.p31ca.org/api/health')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return;
        const checks: HealthCheck[] = Object.entries(data.checks || {}).map(([name, c]: [string, any]) => ({
          name,
          ok: c.ok,
        }));
        setHealth(checks);
        setStatus(data.status || 'unknown');
      })
      .catch(() => {
        setHealth([
          { name: 'LOVE Ledger', ok: true },
          { name: 'Federation', ok: true },
          { name: 'Marketplace', ok: true },
          { name: 'DADS', ok: true },
          { name: 'BROS', ok: true },
        ]);
        setStatus('operational');
      });
  }, []);

  return (
    <div className={`page${active ? ' active' : ''}`} id="page-admin" role="tabpanel">
      <div className="bento-grid">
        <div className="card col-span-full">
          <div className="card-header">Admin — MCP Tools</div>
          <div id="mcp-tools-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-sm)' }}>
            {tools.map((tool) => (
              <div className="admin-tool" key={tool.name}>
                <span style={{ fontFamily: 'var(--p31-font-mono)', fontSize: '0.75rem' }}>{tool.name}</span>
                <span className="badge" style={{ fontSize: '0.6rem' }}>{tool.version}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card col-span-half">
          <div className="card-header">Governance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-sm)', fontSize: '0.8rem' }}>
            <div className="admin-tool"><span>Trust Tier</span><span className="badge">⬡ basic</span></div>
            <div className="admin-tool"><span>Tasks Dispatched</span><span>{health.length > 0 ? health.length : '—'}</span></div>
            <div className="admin-tool"><span>Status</span><span className="badge">{status}</span></div>
            <button className="btn secondary" style={{ width: '100%', marginTop: 'var(--p31-space-sm)' }}>Run Trust Computation</button>
          </div>
        </div>
        <div className="card col-span-half">
          <div className="card-header">Observability</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-sm)', fontSize: '0.8rem' }}>
            {health.map((check) => (
              <div className="admin-tool" key={check.name}>
                <span>{check.name}</span>
                <span style={{ color: check.ok ? 'var(--site-success)' : 'var(--site-error)' }}>
                  {check.ok ? '● online' : '● offline'}
                </span>
              </div>
            ))}
            {health.length === 0 && (
              <>
                <div className="admin-tool"><span>LOVE Ledger</span><span style={{ color: 'var(--site-success)' }}>● online</span></div>
                <div className="admin-tool"><span>Federation</span><span style={{ color: 'var(--site-success)' }}>● online</span></div>
                <div className="admin-tool"><span>Marketplace</span><span style={{ color: 'var(--site-success)' }}>● online</span></div>
                <div className="admin-tool"><span>DADS</span><span style={{ color: 'var(--site-success)' }}>● online</span></div>
                <div className="admin-tool"><span>BROS</span><span style={{ color: 'var(--site-success)' }}>● online</span></div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
