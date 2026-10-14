import { useState } from 'react'
import { downloadText } from '@/lib/sessionLog'

interface ResultConsoleProps {
  result?: unknown
  error?: string
  latencyMs?: number
  serverName?: string
  tool?: string
  /** The exact request body sent (shown behind Show technical details). */
  requestBody?: string
  /** The raw response body received (shown behind Show technical details). */
  responseBody?: string
}

/**
 * ResultConsole — the answer, plain first (plan W3). The exact request and
 * response live behind a closed "Show technical details" disclosure.
 */
export function ResultConsole({ result, error, latencyMs, serverName, tool, requestBody, responseBody }: ResultConsoleProps) {
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const renderedText = error
    ? `ERROR\n${error}`
    : result === undefined
      ? 'Nothing yet.'
      : JSON.stringify(result, null, 2)
  const requestText = requestBody ? prettyJson(requestBody) : 'Nothing was sent.'
  const responseText = responseBody ? prettyJson(responseBody) : 'Nothing came back.'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(renderedText)
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
        {error && <span className="chip" style={{ color: 'var(--p31-accent-red)' }}>Failed</span>}
        {!error && result !== undefined && <span className="chip" style={{ color: 'var(--p31-accent-green)' }}>Worked</span>}
        {latencyMs !== undefined && <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>{latencyMs}ms</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn-sm" onClick={() => setCollapsed(!collapsed)}>{collapsed ? 'Show answer' : 'Hide answer'}</button>
          <button type="button" className="btn-sm" onClick={() => void copy()}>{copied ? 'Copied ✓' : 'Copy'}</button>
          <button type="button" className="btn-sm" onClick={() => downloadText(`p31-mcp-${serverName ?? 'result'}-${tool ?? 'call'}.json`, renderedText)}>Download</button>
        </div>
      </div>

      {(serverName || tool) && (
        <div style={{ display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap', margin: 'var(--p31-space-2) 0' }}>
          {serverName && <span className="chip" style={{ color: 'var(--p31-accent-violet)' }}>{serverName}</span>}
          {tool && <span className="chip" style={{ color: 'var(--p31-accent)' }}>{tool}</span>}
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
          {renderedText}
        </pre>
      )}

      <details style={{ marginTop: 'var(--p31-space-2)' }}>
        <summary style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)', cursor: 'pointer' }}>Show technical details</summary>
        <pre style={{ marginTop: 'var(--p31-space-2)', maxHeight: 300, overflow: 'auto', background: 'var(--p31-surface2)', borderRadius: 'var(--p31-radius-sm)', padding: 'var(--p31-space-2)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)', color: 'var(--p31-text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {'▶ sent\n'}{requestText}{'\n\n◀ answer\n'}{responseText}
        </pre>
      </details>
    </div>
  )
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}