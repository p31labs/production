import { useState } from 'react';
import { PageHeader } from '@p31/design-core/compositions';

const TOOLS = [
  { name: 'list_tokens_dtc', description: 'List all P31 design tokens in W3C DTCG format', args: {} },
  { name: 'get_component_metadata', description: 'Get structured metadata for a component', args: { name: 'GlassPanel' } },
  { name: 'resolve_brand', description: 'Resolve brand token set', args: { brand: 'p31ca' } },
  { name: 'validate_component', description: 'Validate a component against design rules', args: { name: 'GlassPanel' } },
];

const MCP_URL = 'https://p31-design-mcp.trimtab-signal.workers.dev/mcp';

export default function McpConsole() {
  const [selectedTool, setSelectedTool] = useState(TOOLS[0].name);
  const [args, setArgs] = useState(JSON.stringify(TOOLS[0].args, null, 2));
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCall = async () => {
    setLoading(true);
    setResult('');
    try {
      const response = await fetch(MCP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: selectedTool,
            arguments: JSON.parse(args),
          },
        }),
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(JSON.stringify({ error: String(error) }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live JSON-RPC"
        title="MCP Console"
        lede="Live JSON-RPC interface to the P31 Design System MCP server."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Tool</label>
            <select
              value={selectedTool}
              onChange={e => {
                setSelectedTool(e.target.value);
                const tool = TOOLS.find(t => t.name === e.target.value);
                if (tool) setArgs(JSON.stringify(tool.args, null, 2));
              }}
              className="w-full p-3 rounded-lg border border-glass-border bg-glass-bg text-text focus:border-accent focus:outline-none"
            >
              {TOOLS.map(tool => (
                <option key={tool.name} value={tool.name}>{tool.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Arguments (JSON)</label>
            <textarea
              value={args}
              onChange={e => setArgs(e.target.value)}
              className="w-full h-40 p-3 rounded-lg border border-glass-border bg-void text-text font-mono text-sm focus:border-accent focus:outline-none resize-none"
              spellCheck={false}
            />
          </div>

          <button
            onClick={handleCall}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-accent text-void font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Calling...' : 'Call MCP Tool'}
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Result</label>
          <pre className="w-full h-96 p-4 rounded-lg border border-glass-border bg-void text-text font-mono text-xs overflow-auto">
            {result || '// Result will appear here...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
