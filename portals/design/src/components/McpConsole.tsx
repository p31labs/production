import { useEffect, useState } from 'react';
import { GlassPanel } from '@p31ca/design-core/compositions';

const MCP_URL = 'https://p31-design-mcp.trimtab-signal.workers.dev/mcp';

type ToolSpec = { name: string; description?: string; inputSchema?: Record<string, unknown> };

// Parse a Streamable-HTTP MCP response (JSON body or SSE `data:` frames).
function parseMcpBody(text: string): any {
  const lines = text.split('\n');
  const dataLines = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
  if (dataLines.length > 0) {
    try { return JSON.parse(dataLines.join('')); } catch { return JSON.parse(dataLines[0] ?? 'null'); }
  }
  return JSON.parse(text);
}

function McpConsole() {
  const [TOOLS, setTOOLS] = useState<ToolSpec[]>([]);
  const [toolsError, setToolsError] = useState('');
  const [selectedTool, setSelectedTool] = useState('');
  const [args, setArgs] = useState('{}');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  // Discovery: the tool surface comes from the canonical worker, never a hardcoded list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(MCP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
        });
        const data = parseMcpBody(await res.text());
        const tools: ToolSpec[] = data?.result?.tools ?? [];
        if (cancelled) return;
        setTOOLS(tools);
        if (tools.length > 0) {
          setSelectedTool(tools[0].name);
          setArgs('{}');
        }
      } catch (e) {
        if (!cancelled) setToolsError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCall = async () => {
    setLoading(true);
    setResult('');
    try {
      const parsedArgs = JSON.parse(args);
      const response = await fetch(MCP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: selectedTool, arguments: parsedArgs },
        }),
      });
      const data = parseMcpBody(await response.text());
      const text = data.result?.content?.[0]?.text || JSON.stringify(data, null, 2);
      setResult(text);
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (tool: ToolSpec) => {
    setSelectedTool(tool.name);
    setArgs('{}');
    setResult('');
  };

  return (
    <div className="flex flex-col gap-4">
      {toolsError && (
        <div className="text-xs text-tertiary font-mono">Tool discovery failed: {toolsError}</div>
      )}
      {!toolsError && TOOLS.length === 0 && (
        <div className="text-xs text-tertiary font-mono">Discovering tools from {MCP_URL}…</div>
      )}
      <div className="flex flex-wrap gap-2">
        {TOOLS.map(tool => (
          <button
            key={tool.name}
            onClick={() => handlePreset(tool)}
            className={`px-3 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${selectedTool === tool.name ? 'border-accent text-accent' : 'border-glass-border text-secondary'}`}
          >
            {tool.name}
          </button>
        ))}
      </div>
      <GlassPanel>
        <div className="text-sm font-semibold mb-2">{selectedTool}</div>
        <div className="text-xs text-secondary mb-3">{TOOLS.find(t => t.name === selectedTool)?.description}</div>
        <textarea
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          className="w-full h-40 p-4 rounded-xl font-mono text-xs resize-y"
          style={{
            background: 'var(--p31-surface)',
            color: 'var(--p31-text)',
            border: '1px solid var(--p31-glass-border)',
          }}
          spellCheck={false}
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleCall}
            disabled={loading}
            className="px-4 py-2 rounded-lg border-none cursor-pointer font-semibold text-xs transition-all"
            style={{
              background: 'var(--p31-accent)',
              color: 'var(--p31-void)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Calling...' : 'Call Tool'}
          </button>
          <span className="text-[11px] text-tertiary font-mono">
            Endpoint: {MCP_URL}
          </span>
        </div>
      </GlassPanel>
      {result && (
        <GlassPanel>
          <div className="text-sm font-semibold mb-2">Result</div>
          <pre className="text-xs font-mono whitespace-pre-wrap break-words" style={{ color: 'var(--p31-text-secondary)' }}>
            {result}
          </pre>
        </GlassPanel>
      )}
    </div>
  );
}

export default McpConsole;
