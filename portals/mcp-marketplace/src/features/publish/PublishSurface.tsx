import { useState } from 'react'
import { PageHeaderV2, Wizard, Input, Textarea } from '@p31ca/design-core/canon-v2'
import { registerServer, manifestToPayload, type RegisterPayload, type P31McpManifest } from '@/lib/registryClient'
import { humanError } from '@/lib/humanErrors'
import type { ServerSummary } from '@/types'

const MANIFEST_TEMPLATE: P31McpManifest = {
  manifestVersion: 1,
  name: 'my-server',
  description: 'What my server does.',
  url: 'https://example.com',
  category: 'infra',
  tags: [],
  author: 'You',
  tools: [{ name: 'list_things', description: 'Lists things.', inputSchema: { type: 'object', properties: { q: { type: 'string', description: 'query' } } } }],
}

const WIZARD_STEPS = [
  { id: 'what', title: 'What is it?' },
  { id: 'where', title: 'Where does it live?' },
  { id: 'check', title: 'Check and send' },
]

/**
 * Publish — a 3-step wizard (plan W3), one question group per screen:
 *   1 "What is it?"  → name + one-line description
 *   2 "Where does it live?" → a server address, or a .p31-mcp.json file
 *   3 "Check and send" → preview + submit
 *
 * Canon v2: the Wizard pattern — "Step N of M", one question group per
 * step, back/next (finish on the last step). Fields are canon
 * Input/Textarea on the control contract. The old redundant "1 What is
 * it?" chip row is retired — the Wizard indicator is the step chrome.
 */
export function PublishSurface() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState<string>('infra')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ServerSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)

  const [manifest, setManifest] = useState<P31McpManifest | null>(null)
  const [manifestErrors, setManifestErrors] = useState<string[]>([])
  const [manifestError, setManifestError] = useState<string | null>(null)

  const onManifestFile = async (file: File | undefined) => {
    setManifestError(null)
    setManifestErrors([])
    if (!file) return
    try {
      const text = await file.text()
      let doc: unknown
      try {
        doc = JSON.parse(text)
      } catch (e: unknown) {
        setManifestErrors([`That file is not readable JSON. ${e instanceof Error ? e.message : String(e)}`])
        setManifest(null)
        return
      }
      const m = doc as P31McpManifest
      const { errors } = manifestToPayload(m)
      if (errors.length > 0) {
        setManifestErrors(errors)
        setManifest(null)
        return
      }
      setManifestErrors([])
      setManifest(m)
      // Prefill the wizard from the file.
      setName(m.name.trim())
      setDescription(m.description.trim())
      setUrl(m.url.trim())
      setCategory(m.category ?? 'infra')
    } catch (e: unknown) {
      setManifestErrors([`We could not read that file. ${e instanceof Error ? e.message : String(e)}`])
      setManifest(null)
    }
  }

  const deriveId = (n: string) => (n.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')) || 'unnamed'

  const submit = async () => {
    setBusy(true)
    setResult(null)
    setError(null)
    const payload: RegisterPayload = {
      id: deriveId(name),
      name: name.trim(),
      endpoint: url.trim(),
      category,
      description: description.trim(),
      tags: [],
      author: '',
    }
    const res = await registerServer(payload)
    setBusy(false)
    if (res.error) setError(humanError(res.error))
    else if (res.server) setResult(res.server)
  }

  const goNext = () => {
    setStepError(null)
    if (step === 1) {
      if (!name.trim() || !description.trim()) {
        setStepError('Type a name and a one-line description first.')
        return
      }
      setStep(2)
      return
    }
    if (step === 2) {
      if (!/^https?:\/\//i.test(url.trim())) {
        setStepError('The address must start with http:// or https://.')
        return
      }
      setStep(3)
    }
  }

  const goBack = () => {
    setStepError(null)
    setStep((s) => (s === 1 ? 1 : (s - 1) as 1 | 2 | 3))
  }

  const previewTools = (manifest?.tools ?? []).map((t) => ({
    name: t.name,
    description: t.description ?? '',
  }))

  const canSend = name.trim() !== '' && description.trim() !== '' && /^https?:\/\//i.test(url.trim()) && !busy

  return (
    <>
      <PageHeaderV2
        title="Share a tool"
        subtitle="Tell us about your server. It only takes three steps."
      />

      <Wizard
        steps={WIZARD_STEPS}
        activeIndex={step - 1}
        onBack={goBack}
        onNext={goNext}
        onFinish={() => { if (canSend) void submit() }}
        finishLabel="Send it in"
      >
        {step === 1 && (
          <>
            <div className="surface-card-title">What is it?</div>
            <div className="surface-panel" style={{ flexDirection: 'column', gap: 'var(--p31-space-2)', borderColor: 'color-mix(in oklab, var(--p31-accent) 35%, transparent)' }}>
              <div className="surface-card-desc">What you'll need:</div>
              <div>✓ A name</div>
              <div>✓ A one-line description</div>
              <div>✓ The address where it lives</div>
              <div className="surface-card-desc">It takes about 2 minutes.</div>
            </div>
            <Input
              label="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Cool Server"
              aria-label="Server name"
              width="form"
            />
            <Textarea
              label="One-line description *"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your server do?"
              aria-label="Server description"
              width="form"
            />
          </>
        )}

        {step === 2 && (
          <>
            <div className="surface-card-title">Where does it live?</div>
            <Input
              label="Server address (https://…) *"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              aria-label="Server address"
              width="form"
            />
            <div className="surface-card-desc">or upload a .p31-mcp.json file</div>
            <Input
              type="file"
              accept=".json,application/json"
              label="Upload a .p31-mcp.json file"
              onChange={(e) => void onManifestFile(e.target.files?.[0])}
              width="form"
            />
            <button
              type="button"
              className="btn-sm"
              onClick={() => {
                const blob = new Blob([JSON.stringify(MANIFEST_TEMPLATE, null, 2)], { type: 'application/json' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = 'p31-mcp.template.json'
                a.click()
                URL.revokeObjectURL(a.href)
              }}
            >
              Download a blank file
            </button>
            {manifestErrors.length > 0 && (
              <div className="setup-err" role="alert">
                {manifestErrors.map((e) => <div key={e}>• {e}</div>)}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className="surface-card-title">Check and send</div>
            <div className="surface-card-desc">Here is how it will look:</div>
            <div style={{ border: '1px solid var(--p31-glass-border)', borderRadius: 'var(--p31-radius-md)', padding: 'var(--p31-space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.4rem' }} aria-hidden="true">🧩</span>
                <span className="surface-card-title">{name.trim() || 'Your server'}</span>
                <span className="chip" style={{ color: 'var(--p31-accent-violet)' }}>{category}</span>
                <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>{previewTools.length} tool{previewTools.length === 1 ? '' : 's'}</span>
              </div>
              <div className="surface-card-desc">{description.trim() || 'What does your server do?'}</div>
              {url && <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)', alignSelf: 'flex-start' }}>{url}</span>}
              {previewTools.length > 0 && previewTools.slice(0, 7).map((t) => (
                <div key={t.name} style={{ display: 'flex', gap: 'var(--p31-space-2)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <span className="chip" style={{ fontFamily: 'var(--p31-font-mono)', color: 'var(--p31-accent)', minWidth: 140 }}>{t.name}</span>
                  <span style={{ color: 'var(--p31-text-secondary)', fontSize: 'var(--p31-text-sm)', flex: 1, minWidth: 200 }}>{t.description || '—'}</span>
                </div>
              ))}
              <div style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>
                This is a preview. After you send it, we check the server for real.
              </div>
            </div>
            {error && <div className="setup-err" role="alert">{error}</div>}
            {manifestError && <div className="setup-err" role="alert">{manifestError}</div>}
          </>
        )}

        {stepError && <div className="setup-err" role="alert">{stepError}</div>}
      </Wizard>

      {result && (
        <div className="surface-panel" style={{ marginTop: 'var(--p31-space-3)', borderColor: 'color-mix(in oklab, var(--p31-accent-gold) 50%, transparent)' }}>
          <div className="surface-card-title">Sent! A reviewer will check it soon.</div>
          <div className="surface-card-desc">
            {result.name} · <span className="chip" style={{ color: 'var(--p31-accent-gold)' }}>not checked yet</span> · {result.toolCount} tools
          </div>
          <a href={`#/server/${encodeURIComponent(result.id)}`} style={{ color: 'var(--p31-accent)' }}>See it in the catalog →</a>
        </div>
      )}
    </>
  )
}