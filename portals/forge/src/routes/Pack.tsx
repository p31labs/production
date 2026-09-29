import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, type Pack } from '../lib/api'
import { useUI } from '../lib/store'
import manifest from '../data/manifest.json'

export default function Pack() {
  const { kind, id } = useParams()
  const { enqueueCompile, dequeueCompile } = useUI()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const meta = useMemo(
    () => manifest.packs.find((p) => p.kind === kind && p.id === id) ?? null,
    [kind, id],
  )

  async function onCompile() {
    if (!meta) return
    setBusy(true)
    setMsg(null)
    enqueueCompile(meta.id)
    try {
      const res = await fetch(`${manifest.contentRoot}/${meta.source}`)
      const pack = (await res.json()) as Pack
      const blob = await api.compile(pack)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = pack.filename || `${meta.id}.docx`
      a.click()
      URL.revokeObjectURL(url)
      setMsg('Compiled.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Compile failed.')
    } finally {
      setBusy(false)
      dequeueCompile(meta.id)
    }
  }

  if (!meta) {
    return (
      <section className="route">
        <p>Pack not found. <Link to="/catalog">Back to catalog</Link></p>
      </section>
    )
  }

  return (
    <section className="route route--pack">
      <header className="page-header">
        <p className="eyebrow">{meta.kind}</p>
        <h1>{meta.title}</h1>
        <p className="lede">{meta.filename}</p>
      </header>

      <div className="panel glass">
        <button
          className="btn btn--primary"
          onClick={onCompile}
          disabled={busy || !api.hasAuth()}
        >
          {busy ? 'Compiling…' : api.hasAuth() ? 'Compile to .docx' : 'Compile (auth required)'}
        </button>
        {msg && <p className="hint">{msg}</p>}
        {!api.hasAuth() && (
          <p className="hint">
            Set VITE_FORGE_KEY to enable compilation. The forge worker requires
            the X-Forge-Key header on POST /compile.
          </p>
        )}
      </div>
    </section>
  )
}