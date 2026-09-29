import { useEffect, useState } from 'react'
import { api, type ActivityEntry } from '../lib/api'

export default function Activity() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api
      .activity()
      .then((d) => setEntries(d.entries))
      .catch((e) => setErr(e instanceof Error ? e.message : 'unreachable'))
  }, [])

  return (
    <section className="route route--activity">
      <header className="page-header">
        <p className="eyebrow">Pipeline · Activity</p>
        <h1>Recent activity</h1>
        <p className="lede">Compiles, publishes, and channel activity from the forge worker.</p>
      </header>

      {err && <p className="hint">{err}</p>}
      {!err && entries.length === 0 && <p className="hint">No activity yet.</p>}

      <div className="list">
        {entries.map((e) => (
          <div key={e.id} className="list__row">
            <span className={`badge badge--${e.kind === 'compile' ? 'ok' : 'off'}`}>{e.kind}</span>
            <span>{e.summary}</span>
            <span className="hint" style={{ marginLeft: 'auto' }}>{new Date(e.ts).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </section>
  )
}