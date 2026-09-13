import { useState } from 'react';
import { GlassPanel, GlassCard } from '@p31/design-core/compositions';

const ENDPOINTS = {
  local: 'npx @p31/design-core mcp',
  remote: 'https://p31-design-mcp.trimtab-signal.workers.dev/mcp',
};

const AGENTS = [
  {
    name: 'Claude Code',
    cmd: `claude mcp add p31-design -- ${ENDPOINTS.local}`,
    note: 'Spawns the stdio server locally. Best for development.',
  },
  {
    name: 'Cursor',
    cmd: `# ~/.cursor/mcp.json\n{\n  "mcpServers": {\n    "p31-design": {\n      "url": "${ENDPOINTS.remote}"\n    }\n  }\n}`,
    note: 'Remote HTTP endpoint. No local install needed.',
  },
  {
    name: 'GitHub Copilot',
    cmd: `# .github/copilot-instructions.md\n@p31/design-system provides tokens, components, and recipes via MCP.\nRemote endpoint: ${ENDPOINTS.remote}`,
    note: 'Add to repo instructions for context-aware suggestions.',
  },
  {
    name: 'Gemini CLI',
    cmd: `gemini mcp add p31-design --url ${ENDPOINTS.remote}`,
    note: 'Remote HTTP endpoint. Supports JSON-RPC 2.0.',
  },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      className="text-xs font-mono p-4 rounded-xl overflow-x-auto"
      style={{ background: 'var(--p31-surface)', color: 'var(--p31-text)', border: '1px solid var(--p31-glass-border)' }}
    >
      {children}
    </pre>
  );
}

function McpDocs() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <GlassPanel>
        <div className="text-lg font-semibold mb-2">P31 Design System MCP Server</div>
        <p className="text-sm text-text-secondary leading-relaxed mb-4">
          The P31 Design System exposes 13 MCP tools that AI agents can query to get design tokens,
          component definitions, CSS recipes, and framework conversions. Two deployment modes:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl" style={{ background: 'color-mix(in srgb, var(--p31-accent) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--p31-accent) 15%, transparent)' }}>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--p31-accent)' }}>Local (stdio)</div>
            <div className="text-xs text-text-secondary mb-2">For Claude Code, Cursor, Gemini CLI running locally</div>
            <CodeBlock>{ENDPOINTS.local}</CodeBlock>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'color-mix(in srgb, var(--p31-accent-violet) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--p31-accent-violet) 15%, transparent)' }}>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--p31-accent-violet)' }}>Remote (HTTP)</div>
            <div className="text-xs text-text-secondary mb-2">For any MCP-compatible agent over the network</div>
            <CodeBlock>{ENDPOINTS.remote}</CodeBlock>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div className="text-lg font-semibold mb-4">Agent Setup</div>
        <div className="flex flex-col gap-4">
          {AGENTS.map(agent => (
            <GlassCard key={agent.name}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{agent.name}</h3>
                <button
                  onClick={() => copy(agent.cmd, agent.name)}
                  className="px-2 py-1 rounded border border-glass-border cursor-pointer bg-transparent text-text-tertiary text-xs transition-all"
                >
                  {copied === agent.name ? 'Copied' : 'Copy'}
                </button>
              </div>
              <CodeBlock>{agent.cmd}</CodeBlock>
              <div className="text-xs text-text-secondary mt-2">{agent.note}</div>
            </GlassCard>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel>
        <div className="text-lg font-semibold mb-2">Available Tools (13)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            ['list_tokens', 'List all design tokens by category'],
            ['resolve_token', 'Resolve a token path to CSS variable + value'],
            ['search_tokens', 'Search tokens by keyword'],
            ['list_components', 'List all 20 P31 components'],
            ['get_component', 'Get full component definition (props, slots, variants)'],
            ['generate_component', 'Generate React/Astro/HTML/WebComponent code'],
            ['list_recipes', 'List all 164 CSS recipe classes'],
            ['get_recipe', 'Get CSS source for a specific recipe'],
            ['convert_component', 'Convert between React ↔ Astro ↔ HTML'],
            ['audit_css', 'Audit CSS/HTML for design system compliance'],
            ['validate_parity', 'Validate parity between two component versions'],
            ['get_ui_principles', 'Get 10 P31 UI/UX design principles'],
            ['get_review_rules', 'Get 8 automated review rules'],
          ].map(([name, desc]) => (
            <div key={name} className="p-3 rounded-lg" style={{ background: 'var(--p31-glass-bg)', border: '1px solid var(--p31-glass-border)' }}>
              <div className="text-xs font-mono font-semibold mb-1" style={{ color: 'var(--p31-accent)' }}>{name}</div>
              <div className="text-[11px] text-text-secondary">{desc}</div>
            </div>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel>
        <div className="text-lg font-semibold mb-2">Example Prompts</div>
        <div className="flex flex-col gap-2">
          {[
            '"List all color tokens and their values"',
            '"Generate a GlassPanel component in React"',
            '"Convert this React button to Astro: <button className=\'btn btn-primary\'>Click</button>"',
            '"Audit this CSS for hardcoded colors: .card { color: var(--p31-text); background: var(--p31-accent-red); }"',
            '"What are the P31 UI principles?"',
            '"Get the CSS for the glass-panel recipe"',
            '"Validate parity between these two components..."',
          ].map((prompt, i) => (
            <div key={i} className="text-xs text-text-secondary p-2 rounded" style={{ background: 'var(--p31-glass-bg)' }}>
              {prompt}
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}

export default McpDocs;
