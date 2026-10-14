import { useEffect, useState } from 'react'
import { Input, Select, EmptyState } from '@p31ca/design-core/canon-v2'
import type { LlmConfig, LlmConsoleMessage, LlmToolCall, ToolDef } from '@/types'
import { loadLlmConfig, saveLlmConfig, probeLlm, generateToolCalls, type LlmProbe } from '@/lib/llm'

interface LlmConsoleProps {
  serverName?: string
  tools: ToolDef[]
  /** Execute one suggested call; returns a one-line outcome for the transcript. */
  onRunCall: (call: LlmToolCall) => Promise<{ ok: boolean; detail: string }>
  /** Focus step 1 ("Pick a server") — the empty state teaches the next action. */
  onPickServer?: () => void
}

const HELPER_PLACE_OPTIONS = [
  { value: 'litellm', label: 'A helper on your own computer' },
  { value: 'hosted', label: 'A helper on the internet' },
  { value: 'disabled', label: 'Off' },
]

/**
 * LlmConsole — "Ask a helper to suggest things to try" (plan W3, was: LLM
 * Test Console). The user says what they want; a helper suggests test calls
 * and the console runs them for real against the picked server. An offline
 * helper shows "The helper isn't connected right now." — never a silent
 * failure.
 *
 * Canon v2: the helper placement is one canon Select (replacing three raw
 * radios), the settings fields are canon Inputs, and when no tool is picked
 * the prompt box yields to a real EmptyState ("No tools here yet.") instead
 * of a placeholder hiding inside an input.
 */
export function LlmConsole({ serverName, tools, onRunCall, onPickServer }: LlmConsoleProps) {
  const [config, setConfig] = useState<LlmConfig>(() => loadLlmConfig())
  const [probe, setProbe] = useState<LlmProbe | null>(null)
  const [probing, setProbing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [intent, setIntent] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<LlmConsoleMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  const runProbe = async (cfg: LlmConfig) => {
    setProbing(true)
    setProbe(null)
    const p = await probeLlm(cfg)
    setProbe(p)
    setProbing(false)
  }

  useEffect(() => {
    void runProbe(config)
    // Check again per helper mode/config change (settings save re-triggers).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.backend, config.litellmUrl, config.hostedBaseUrl])

  const update = (patch: Partial<LlmConfig>) => {
    const next = { ...config, ...patch }
    setConfig(next)
    saveLlmConfig(next)
  }

  const send = async () => {
    const text = intent.trim()
    if (!text || busy) return
    setError(null)
    setMessages((m) => [...m, { role: 'user', text, ts: Date.now() }])
    setIntent('')
    setBusy(true)
    const result = await generateToolCalls(config, text, tools)
    const calls = result.calls ?? []
    if (result.error || calls.length === 0) {
      setError(result.error ?? 'The helper could not answer. Try again.')
      setBusy(false)
      return
    }
    const outcomes: string[] = []
    for (const call of calls) {
      if (!tools.some((t) => t.name === call.tool)) {
        outcomes.push(`${call.tool}: skipped — this server does not have it`)
        continue
      }
      try {
        const res = await onRunCall(call)
        outcomes.push(`${call.tool}: ${res.ok ? 'worked' : 'failed'} — ${res.detail}`)
      } catch (e: unknown) {
        outcomes.push(`${call.tool}: failed — ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    setMessages((m) => [
      ...m,
      {
        role: 'assistant',
        text: `The helper tried ${calls.length} thing${calls.length === 1 ? '' : 's'}:\n${outcomes.join('\n')}`,
        calls,
        ts: Date.now(),
      },
    ])
    setBusy(false)
  }

  const available = probe?.reachable === true

  return (
    <div className="surface-panel" style={{ flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
        <div className="surface-card-title">Helper</div>
        {probing ? (
          <span className="chip" style={{ color: 'var(--p31-accent-gold)' }}>Checking the helper…</span>
        ) : available ? (
          <span className="chip" style={{ color: 'var(--p31-accent-green)' }}>The helper is ready.</span>
        ) : (
          <span className="chip" style={{ color: 'var(--p31-accent-red)' }}>The helper isn't connected right now.</span>
        )}
        {serverName && <span className="chip" style={{ color: 'var(--p31-accent-violet)' }}>{serverName}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--p31-space-2)' }}>
          <button type="button" className="btn-sm" onClick={() => setShowSettings(!showSettings)} aria-expanded={showSettings}>{showSettings ? 'close settings' : 'settings'}</button>
          <button type="button" className="btn-sm" onClick={() => void runProbe(config)}>↻ Check again</button>
        </div>
      </div>

      <div className="surface-card-desc">
        Ask a helper to suggest things to try.
      </div>

      {!available && !probing && (
        <div className="setup-err" role="alert">
          {config.backend === 'disabled'
            ? 'The helper is off. Turn it on in settings to use it.'
            : `The helper isn't connected right now — ${probe?.detail ?? 'no answer'}. Check settings.`}
        </div>
      )}

      {showSettings && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-2)', border: '1px solid var(--p31-glass-border)', borderRadius: 'var(--p31-radius-md)', padding: 'var(--p31-space-3)' }}>
          <div style={{ maxWidth: 360 }}>
            <Select
              label="Where the helper lives"
              options={HELPER_PLACE_OPTIONS}
              value={config.backend}
              onChange={(e) => update({ backend: e.target.value as LlmConfig['backend'] })}
            />
          </div>
          {config.backend === 'litellm' && (
            <div style={{ display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <Input value={config.litellmUrl} onChange={(e) => update({ litellmUrl: e.target.value })} placeholder="http://localhost:4001" aria-label="Helper address (on your computer)" />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Input value={config.litellmModel} onChange={(e) => update({ litellmModel: e.target.value })} placeholder="Model name" aria-label="Helper model" />
              </div>
            </div>
          )}
          {config.backend === 'hosted' && (
            <div style={{ display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <Input value={config.hostedBaseUrl} onChange={(e) => update({ hostedBaseUrl: e.target.value })} placeholder="https://api.openai.com/v1" aria-label="Helper address (on the internet)" />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <Input type="password" value={config.hostedApiKey} onChange={(e) => update({ hostedApiKey: e.target.value })} placeholder="Helper key" aria-label="Helper key" />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <Input value={config.hostedModel} onChange={(e) => update({ hostedModel: e.target.value })} placeholder="Model name" aria-label="Helper model" />
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div className="setup-err" role="alert">{error}</div>}

      {tools.length === 0 ? (
        <EmptyState
          title="No tools here yet."
          description="Pick a server and a tool on this page. Then the helper can suggest things to try."
          action={
            onPickServer ? (
              <button
                type="button"
                className="btn-sm"
                onClick={onPickServer}
                style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '8px 18px', borderRadius: 'var(--p31-radius-md)' }}
              >
                Pick a server
              </button>
            ) : undefined
          }
        />
      ) : (
        <div style={{ display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap', alignItems: 'start' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Input
              placeholder="Example: try a search with an empty box."
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void send() }}
              disabled={!available}
              aria-label="What should the helper try?"
            />
          </div>
          <button
            type="button"
            className="btn-sm"
            onClick={() => void send()}
            disabled={!available || busy || !intent.trim()}
            style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '8px 18px', borderRadius: 'var(--p31-radius-md)' }}
          >
            {busy ? 'Thinking…' : 'Suggest things to try'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-2)', maxHeight: 320, overflow: 'auto' }}>
        {messages.length === 0 && (
          <div className="surface-card-desc">Nothing yet. Everything the helper tries really runs.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)' }}>
            <span style={{ color: m.role === 'user' ? 'var(--p31-accent)' : 'var(--p31-accent-violet)', fontSize: 'var(--p31-text-xs)', fontWeight: 600 }}>
              {m.role === 'user' ? 'you' : 'helper'}
            </span>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--p31-text-secondary)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)', background: 'var(--p31-surface2)', borderRadius: 'var(--p31-radius-sm)', padding: 'var(--p31-space-2)' }}>
              {m.text}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}