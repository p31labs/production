import { useState } from 'react'

/**
 * InstallTab — tabbed install configs for one server (D-1):
 * Claude Code, Claude Desktop, VS Code, and raw JSON — each with a copy button.
 */
export function InstallTab({ id, endpoint, name }: { id: string; endpoint: string; name: string }) {
  const [tab, setTab] = useState<'claude-code' | 'claude-desktop' | 'vscode' | 'raw'>('claude-code')
  const [copied, setCopied] = useState(false)

  const configs: Record<typeof tab, { label: string; file: string; json: Record<string, unknown> }> = {
    'claude-code': {
      label: 'Claude Code',
      file: '.mcp.json',
      json: { mcpServers: { [id]: { type: 'http', url: endpoint } } },
    },
    'claude-desktop': {
      label: 'Claude Desktop',
      file: 'claude_desktop_config.json',
      json: { mcpServers: { [id]: { type: 'http', url: endpoint } } },
    },
    vscode: {
      label: 'VS Code',
      file: '.vscode/mcp.json',
      json: { servers: { [id]: { type: 'http', url: endpoint } } },
    },
    raw: {
      label: 'Raw JSON',
      file: `${id}.json`,
      json: { name, url: endpoint },
    },
  }

  const active = configs[tab]
  const text = JSON.stringify(active.json, null, 2)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="surface-panel" style={{ flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
      <div className="surface-card-title">Install</div>
      <div className="surface-card-desc">Add {name} to your app. Copy the settings below.</div>

      <div style={{ display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
        {(Object.keys(configs) as Array<typeof tab>).map((k) => (
          <button
            key={k}
            type="button"
            className="btn-sm"
            onClick={() => setTab(k)}
            style={
              tab === k
                ? { background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '8px 14px', borderRadius: 'var(--p31-radius-md)' }
                : { padding: '8px 14px', borderRadius: 'var(--p31-radius-md)' }
            }
          >
            {configs[k].label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
        <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>
          {active.file}
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <button type="button" className="btn-sm" onClick={() => void copy()}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </div>

      <pre
        style={{
          margin: 0,
          background: 'var(--p31-surface2)',
          border: '1px solid var(--p31-glass-border)',
          borderRadius: 'var(--p31-radius-md)',
          padding: 'var(--p31-space-3)',
          fontFamily: 'var(--p31-font-mono)',
          fontSize: 'var(--p31-text-xs)',
          color: 'var(--p31-text-primary)',
          overflow: 'auto',
          maxHeight: 320,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </pre>
    </div>
  )
}