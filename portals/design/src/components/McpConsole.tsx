import { useState } from 'react';
import { GlassPanel } from '@p31/design-core/compositions';

const MCP_URL = 'https://p31-design-mcp.trimtab-signal.workers.dev/mcp';

const TOOLS = [
  { name: 'list_tokens', description: 'List all P31 design tokens', args: { category: 'all' } },
  { name: 'resolve_token', description: 'Resolve a single token path', args: { path: 'color.accent.default' } },
  { name: 'search_tokens', description: 'Search tokens by keyword', args: { query: 'cyan' } },
  { name: 'list_components', description: 'List all components', args: {} },
  { name: 'get_component', description: 'Get component definition', args: { name: 'GlassPanel' } },
  { name: 'generate_component', description: 'Generate component code', args: { name: 'GlassPanel', framework: 'react' } },
  { name: 'list_recipes', description: 'List all CSS recipes', args: {} },
  { name: 'get_recipe', description: 'Get recipe CSS', args: { name: 'glass-panel' } },
  { name: 'convert_component', description: 'Convert between frameworks', args: { source: 'react', target: 'astro', code: '<div class="glass-panel">Hello</div>', componentName: 'Test' } },
  { name: 'audit_css', description: 'Audit CSS for compliance', args: { content: '.test { color: var(--p31-accent-red); }', strict: false } },
  { name: 'validate_parity', description: 'Validate component parity', args: { sourceContent: '<div class="glass-panel">A</div>', targetContent: '<div class="glass-panel">B</div>' } },
  { name: 'get_ui_principles', description: 'Get P31 UI principles', args: {} },
  { name: 'get_review_rules', description: 'Get automated review rules', args: {} },
];

function McpConsole() {
  const [selectedTool, setSelectedTool] = useState(TOOLS[0].name);
  const [args, setArgs] = useState(JSON.stringify(TOOLS[0].args, null, 2));
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCall = async () => {
    setLoading(true);
    setResult('');
    try {
      const parsedArgs = JSON.parse(args);
      const response = await fetch(MCP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: selectedTool, arguments: parsedArgs },
        }),
      });
      const data = await response.json();
      const text = data.result?.content?.[0]?.text || JSON.stringify(data, null, 2);
      setResult(text);
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (tool: typeof TOOLS[0]) => {
    setSelectedTool(tool.name);
    setArgs(JSON.stringify(tool.args, null, 2));
    setResult('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TOOLS.map(tool => (
          <button
            key={tool.name}
            onClick={() => handlePreset(tool)}
            className={`px-3 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${selectedTool === tool.name ? 'border-accent text-accent' : 'border-glass-border text-text-secondary'}`}
          >
            {tool.name}
          </button>
        ))}
      </div>
      <GlassPanel>
        <div className="text-sm font-semibold mb-2">{selectedTool}</div>
        <div className="text-xs text-text-secondary mb-3">{TOOLS.find(t => t.name === selectedTool)?.description}</div>
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
          <span className="text-[11px] text-text-tertiary font-mono">
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
