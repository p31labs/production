import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useMeshTetraNodes, edgeWeight } from '../hooks/useMeshTetraNodes';
import { useJitterbugStarfield } from '../hooks/useJitterbugStarfield';

type SandboxMode = 'vibe' | 'sandbox' | 'roblox' | 'spaceship';

interface SandboxPageProps {
  active: boolean;
}

const MODES: { key: SandboxMode; label: string; icon: string }[] = [
  { key: 'vibe', label: 'Vibe', icon: '✨' },
  { key: 'sandbox', label: 'Sandbox', icon: '🧪' },
  { key: 'roblox', label: 'Roblox', icon: '🎮' },
  { key: 'spaceship', label: 'Spaceship', icon: '🚀' },
];

type ApiStatus = 'idle' | 'generating' | 'deploying' | 'error';
const GENERATE_URL = 'https://vibe-generate.trimtab-signal.workers.dev/generate';
const APPS_URL = 'https://app-supervisor.trimtab-signal.workers.dev/apps/create';
const ROBLOX_URL = 'https://roblox-bridge.trimtab-signal.workers.dev';

/** Minimal P31Client — calls live Workers with error-safe JSON parsing */
class P31Client {
  config: { familyId?: string };
  constructor(cfg: { familyId?: string } = {}) { this.config = cfg; }
  async post(url: string, body: Record<string, unknown>): Promise<any> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Family-DID': this.config.familyId || 'p31:default' },
      body: JSON.stringify(body),
    });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) {
      const text = await res.text().catch(() => '');
      throw new Error(`API ${res.status}: ${text.slice(0, 120)}`);
    }
    return res.json();
  }
  async generate(prompt: string, vibeTags?: string[], ageGroup?: string) {
    const res = await this.post(GENERATE_URL, {
      prompt, formFactor: vibeTags?.[0], spoons: ageGroup === 'child' ? 2 : ageGroup === 'youth' ? 3 : 4,
    });
    return { html: res.html || '', css: res.css || '', js: res.js || '', auditScore: res.qualityScore ?? 0 };
  }
  async deploy(name: string, html: string, css: string, js: string) {
    const res = await this.post(APPS_URL, { name, html, css: css || '', js: js || '', creator: this.config.familyId || 'p31:default' });
    return { ok: res.ok, id: res.id, url: res.url };
  }
  async robloxTools() { const r = await fetch(`${ROBLOX_URL}/tools/list`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); return r.json(); }
  async robloxCall(tool: string, params: Record<string, unknown> = {}) { return this.post(`${ROBLOX_URL}/tools/call`, { tool, params }); }
}

export default function SandboxPage({ active }: SandboxPageProps) {
  const [mode, setMode] = useState<SandboxMode>('vibe');
  const [prompt, setPrompt] = useState('Build a star-catching game for my 6-year-old');
  const [vibeTags, setVibeTags] = useState('playful, sparkly');
  const [ageGroup, setAgeGroup] = useState('child');
  const [apiStatus, setApiStatus] = useState<ApiStatus>('idle');
  const [generatedCode, setGeneratedCode] = useState<{ html: string; css: string; js: string } | null>(null);
  const [auditScore, setAuditScore] = useState<number | null>(null);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>(['🧪 PHOS Sandbox ready. Select a mode above.']);
  const [robloxTools, setRobloxTools] = useState<any[]>([]);
  const [robloxOutput, setRobloxOutput] = useState<string[]>([]);
  const [sandboxCode, setSandboxCode] = useState(`// Sandbox mode — write HTML/CSS/JS\nconsole.log("Hello from sandbox!");\n`);
  const terminalRef = useRef<HTMLDivElement>(null);

  const client = useMemo(() => new P31Client({ familyId: 'p31:phos' }), []);

  useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [output, robloxOutput]);

  const append = useCallback((msg: string) => setOutput(p => [...p, msg].slice(-80)), []);

  // Spaceship mode data
  const spoons = useAppStore(s => s.spoons);
  const loveBalance = useAppStore(s => s.loveBalance);
  const { containerRef: starfieldRef } = useJitterbugStarfield({ spoons, connectionAudio: false, poetsMode: true });
  const { nodes, peers } = useMeshTetraNodes();
  const symmetry = useMemo(() => {
    const active = nodes.filter(n => n.spoons > 0 && n.role !== 'ghost').length;
    return Math.round((active / Math.max(1, nodes.length)) * 100);
  }, [nodes]);
  const curvature = useMemo(() => {
    const e: { a: number; b: number; weight: number }[] = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) e.push({ a: i, b: j, weight: edgeWeight(nodes[i], nodes[j]) });
    return e.length ? ((e.reduce((s, x) => s + x.weight, 0) / e.length) - 0.5) * 2 : 0;
  }, [nodes]);
  const activePeers = peers.filter(p => p.role !== 'ghost' && p.spoons > 0).length; const maxPeers = 4;
  const zoneColors = ['#FF6B8B', '#00F2FE', '#3B82F6', '#8B5CF6', '#475569'];
  const curvColor = curvature >= 0 ? '#10B981' : '#F43F5E';

  const handleGenerate = async () => {
    setApiStatus('generating');
    append(`✨ Generating: "${prompt.slice(0, 60)}..."`);
    try {
      const result = await client.generate(prompt, vibeTags.split(',').map(t => t.trim()), ageGroup);
      setGeneratedCode({ html: result.html, css: result.css, js: result.js });
      setAuditScore(result.auditScore);
      if (result.auditScore !== undefined) append(`📊 MARGE audit score: ${result.auditScore}`);
      append(`✅ Generated ${result.html.length}B HTML`);
      setApiStatus('idle');
    } catch (e: any) {
      append(`❌ Generate failed: ${e.message}`);
      setApiStatus('error');
    }
  };

  const handleDeploy = async () => {
    if (!generatedCode) return;
    setApiStatus('deploying');
    append('🚀 Deploying to app-supervisor...');
    try {
      const result = await client.deploy(prompt.slice(0, 30).replace(/\s+/g, '-'), generatedCode.html, generatedCode.css, generatedCode.js);
      setDeployedUrl(result.url);
      append(`✅ Live at: ${result.url}`);
      setApiStatus('idle');
    } catch (e: any) {
      append(`❌ Deploy failed: ${e.message}`);
      setApiStatus('error');
    }
  };

  const handleLoadRobloxTools = async () => {
    try {
      const r = await client.robloxTools();
      setRobloxTools(r.tools || []);
      append(`🔧 Loaded ${r.tools?.length || 0} Roblox tools`);
    } catch (e: any) {
      append(`❌ Roblox tools: ${e.message}`);
    }
  };

  const handleRobloxCall = async (tool: string, params: Record<string, unknown> = {}) => {
    setRobloxOutput(p => [...p, `> ${tool}(${JSON.stringify(params)})`].slice(-40));
    try {
      const r = await client.robloxCall(tool, params);
      const luau = r.generated_luau || JSON.stringify(r);
      setRobloxOutput(p => [...p, luau].slice(-40));
      append(`✅ ${tool} executed`);
    } catch (e: any) {
      setRobloxOutput(p => [...p, `❌ ${e.message}`].slice(-40));
    }
  };

  return (
    <div className={active ? 'page active' : 'page'} id="page-sandbox">
      {/* Mode strip */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {MODES.map(m => (
          <button
            key={m.key}
            className={`admin-tab${mode === m.key ? ' active' : ''}`}
            onClick={() => { setMode(m.key); if (m.key === 'roblox') handleLoadRobloxTools(); }}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <div className="sandbox-ide">
        {/* ── LEFT PANEL (mode-specific) ── */}
        <div className="panel glass sandbox-left">
          <div className="panel-header"><span>{mode === 'vibe' ? '✨ VIBE COMPOSER' : mode === 'roblox' ? '🎮 ROBLOX TOOLS' : mode === 'spaceship' ? '🚀 COCKPIT' : '🧪 SANDBOX'}</span></div>
          <div className="panel-body">

            {mode === 'vibe' && (
              <>
                <textarea className="sandbox-editor" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the app you want to build..." style={{ minHeight: '100px' }} />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input className="copilot-input" value={vibeTags} onChange={e => setVibeTags(e.target.value)} placeholder="Tags: playful, sparkly" style={{ flex: 1, minWidth: '100px' }} />
                  <select className="synth-select" value={ageGroup} onChange={e => setAgeGroup(e.target.value as any)} style={{ width: 'auto', minWidth: '80px' }}>
                    <option value="child">Child</option>
                    <option value="youth">Youth</option>
                    <option value="adult">Adult</option>
                  </select>
                </div>
                <button className="btn" onClick={handleGenerate} disabled={apiStatus !== 'idle'} style={{ width: '100%' }}>
                  {apiStatus === 'generating' ? '✨ Generating...' : '✨ Generate'}
                </button>
                {generatedCode && (
                  <button className="btn secondary" onClick={handleDeploy} disabled={apiStatus !== 'idle' || !generatedCode} style={{ width: '100%' }}>
                    {apiStatus === 'deploying' ? '🚀 Deploying...' : '🚀 Deploy to App Supervisor'}
                  </button>
                )}
                {deployedUrl && (
                  <div style={{ padding: '8px', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--p31-radius-sm)', fontSize: '10px', fontFamily: 'var(--p31-font-mono)' }}>
                    ✅ <a href={deployedUrl} target="_blank" rel="noopener" style={{ color: 'var(--p31-accent-green)' }}>{deployedUrl}</a>
                  </div>
                )}
                {auditScore !== null && (
                  <div className="setting-group" style={{ padding: '8px' }}>
                    <span style={{ fontSize: '10px', color: auditScore > 80 ? 'var(--p31-accent-green)' : 'var(--p31-accent-amber)' }}>
                      📊 MARGE Audit: {auditScore}/100
                    </span>
                  </div>
                )}
              </>
            )}

            {mode === 'roblox' && (
              <>
                {robloxTools.length === 0 ? (
                  <div style={{ padding: '12px', color: 'var(--p31-text-secondary)', fontSize: '10px' }}>Loading tools...</div>
                ) : (
                  robloxTools.map((t: any) => (
                    <div key={t.name} className="member-card" style={{ cursor: 'pointer' }} onClick={() => handleRobloxCall(t.name)}>
                      <div className="member-card-header"><span className="member-name" style={{ color: '#00F2FE', fontSize: '11px' }}>{t.name}</span></div>
                      <div className="member-app" style={{ fontSize: '9px' }}>{t.description}</div>
                    </div>
                  ))
                )}
              </>
            )}

            {mode === 'spaceship' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="stat-card" style={{ padding: '8px' }}>
                  <div className="stat-label">🥄 Spoons</div>
                  <div className="stat-value blue">{spoons}/5</div>
                </div>
                <div className="stat-card" style={{ padding: '8px' }}>
                  <div className="stat-label">❤️ LOVE Balance</div>
                  <div className="stat-value green">{loveBalance?.availableBalance ?? '—'}</div>
                </div>
                <div className="stat-card" style={{ padding: '8px' }}>
                  <div className="stat-label">🌐 Mesh Peers</div>
                  <div className="stat-value cyan">{activePeers}/{maxPeers}</div>
                </div>
                <div className="stat-card" style={{ padding: '8px' }}>
                  <div className="stat-label">📡 Symmetry</div>
                  <div className="stat-value" style={{ color: '#00F2FE' }}>{symmetry}%</div>
                </div>
                <div className="stat-card" style={{ padding: '8px' }}>
                  <div className="stat-label">📐 Curvature</div>
                  <div className="stat-value" style={{ color: curvColor }}>{curvature >= 0 ? '+' : ''}{curvature.toFixed(1)}</div>
                </div>
              </div>
            )}

            {mode === 'sandbox' && (
              <>
                <textarea className="sandbox-editor" value={sandboxCode} onChange={e => setSandboxCode(e.target.value)} spellCheck={false} />
                <button className="btn" onClick={() => {
                  append('> Running sandbox code');
                  const iframe = document.createElement('iframe');
                  iframe.sandbox.value = 'allow-scripts';
                  iframe.style.display = 'block';
                  iframe.style.width = '100%';
                  iframe.style.height = '100%';
                  iframe.style.border = 'none';
                  iframe.style.background = '#fff';
                  iframe.srcdoc = `<html><body><script>try{${sandboxCode}}catch(e){document.body.innerText='Error: '+e.message}<\/script></body></html>`;
                  // Find the viewport panel and append
                  const vp = document.querySelector('.sandbox-center > div[style]');
                  if (vp) { vp.innerHTML = ''; vp.appendChild(iframe); }
                  append('✅ Code rendered in sandbox');
                }} style={{ width: '100%' }}>▶ Run</button>
              </>
            )}
          </div>
        </div>

        {/* ── CENTER PANEL (preview/viewport) ── */}
        <div className="panel glass sandbox-center" style={{ border: '1px solid var(--glass-border)' }}>
          <div className="panel-header">
            <span>{mode === 'vibe' ? '🎮 PREVIEW' : mode === 'roblox' ? '📜 LUAU OUTPUT' : '🎮 VIEWPORT'}</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <div ref={starfieldRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
            {mode === 'vibe' && generatedCode ? (
              <iframe
                sandbox="allow-scripts"
                srcDoc={generatedCode.html}
                style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                title="Generated app preview"
              />
            ) : mode === 'roblox' ? (
              <div ref={terminalRef} className="sandbox-terminal-view">
                {robloxOutput.map((line, i) => <div key={i}>{line}</div>)}
                {robloxOutput.length === 0 && <div style={{ color: 'var(--p31-text-secondary)' }}>Select a tool on the left to generate Luau code.</div>}
              </div>
            ) : mode === 'spaceship' ? (
              <svg viewBox="0 0 300 260" style={{ width: '100%', height: '100%' }}>
                {/* Edge lines between zone vertices */}
                {[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]].map(([a,b]) => {
                  const pts = [{x:150,y:50},{x:60,y:180},{x:240,y:180},{x:150,y:140}];
                  return <line key={`e${a}${b}`} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y} stroke={curvColor} strokeOpacity={0.3} strokeWidth={1.5} />;
                })}
                {/* Zone vertices */}
                {[{x:150,y:50,l:'1'},{x:60,y:180,l:'2'},{x:240,y:180,l:'3'},{x:150,y:140,l:'C'}].map((p,i) => (
                  <g key={`z${i}`}>
                    <circle cx={p.x} cy={p.y} r={i<3 ? 18 : 12} fill={zoneColors[i]} opacity={0.7} />
                    <text x={p.x} y={p.y} textAnchor="middle" dy="4" fill="#fff" fontSize="10" fontWeight="700">{p.l}</text>
                    {i===3 && <circle cx={p.x} cy={p.y} r={14} fill="none" stroke="#F59E0B" strokeWidth={1} strokeDasharray="3,3" opacity={0.6} />}
                  </g>
                ))}
                {/* Metrics label */}
                <text x="150" y="240" textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="var(--p31-font-mono)">
                  K₄ Mesh · {symmetry}% Sym · {curvature >= 0 ? '+' : ''}{curvature.toFixed(1)} Curv · {activePeers}/{maxPeers} Peers
                </text>
              </svg>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--p31-text-secondary)', fontSize: '11px' }}>
                {mode === 'vibe' ? 'Generate code to see a live preview' : '⬡ Viewport Ready'}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL (terminal/controls) ── */}
        <div className="panel glass sandbox-right">
          <div className="panel-header"><span>⬛ TERMINAL</span></div>
          <div ref={terminalRef} className="sandbox-terminal-view">
            {output.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </div>

        {/* ── BOTTOM STRIP (status) ── */}
        <div className="panel glass sandbox-terminal">
          <div className="panel-header">
            <span>🔗 WORKERS</span>
            <span style={{ fontSize: '10px', color: 'var(--p31-accent-green)' }}>
              vibe-generate · app-supervisor · roblox-bridge
            </span>
          </div>
          <div style={{ padding: '6px 14px', fontSize: '9px', color: 'var(--p31-text-secondary)', fontFamily: 'var(--p31-font-mono)', display: 'flex', gap: '16px' }}>
            <span>vibe-generate.trimtab-signal.workers.dev</span>
            <span>app-supervisor.trimtab-signal.workers.dev</span>
            <span>roblox-bridge.trimtab-signal.workers.dev</span>
          </div>
        </div>
      </div>
    </div>
  );
}
