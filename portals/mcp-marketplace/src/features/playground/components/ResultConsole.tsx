import { useState } from 'react'
import { downloadText } from '@/lib/sessionLog'

interface ResultConsoleProps {
  result?: unknown
  error?: string
  latencyMs?: number
  endpoint?: string
  serverName?: string
  tool?: string
}

/**
 * ResultConsole — formatted JSON output with copy/download and a compact
 * readout of the invocation context (endpoint, latency, server, tool).
 */
export function ResultConsole({ result, error, latencyMs, endpoint, serverName, tool }: ResultConsoleProps) {
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const text = error
    ? `ERROR\n${error}`
    : result === undefined
      ? '— no result yet —'
      : JSON.stringify(result, null, 2)

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
    <div className="surface-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
        <div className="surface-card-title">Result</div>
        {error && <span className="chip" style={{ color: 'var(--p31-accent-red)' }}>error</span>}
        {!error && result !== undefined && <span className="chip" style={{ color: 'var(--p31-accent-green)' }}>ok</span>}
        {latencyMs !== undefined && <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>{latencyMs}ms</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--p31-space-2)' }}>
          <button type="button" className="btn-sm" onClick={() => setCollapsed(!collapsed)}>{collapsed ? 'expand' : 'collapse'}</button>
          <button type="button" className="btn-sm" onClick={() => void copy()}>{copied ? 'copied ✓' : 'copy'}</button>
          <button type="button" className="btn-sm" onClick={() => downloadText(`p31-mcp-${serverName ?? 'result'}-${tool ?? 'call'}.json`, text)}>download</button>
        </div>
      </div>

      {(serverName || tool || endpoint) && (
        <div style={{ display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap', margin: 'var(--p31-space-2) 0' }}>
          {serverName && <span className="chip" style={{ color: 'var(--p31-accent-violet)' }}>{serverName}</span>}
          {tool && <span className="chip" style={{ color: 'var(--p31-accent)' }}>{tool}</span>}
          {endpoint && <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>{endpoint}</span>}
        </div>
      )}

      {!collapsed && (
        <pre
          style={{
            marginTop: 'var(--p31-space-2)',
            maxHeight: 420,
            overflow: 'auto',
            background: 'var(--p31-surface2)',
            border: '1px solid var(--p31-glass-border)',
            borderRadius: 'var(--p31-radius-md)',
            padding: 'var(--p31-space-3)',
            fontFamily: 'var(--p31-font-mono)',
            fontSize: 'var(--p31-text-xs)',
            color: error ? 'var(--p31-accent-red)' : 'var(--p31-text-primary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {text}
        </pre>
      )}
    </div>
  )
}