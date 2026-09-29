import { useEffect, useState } from 'react'
import { api, type Channel } from '../lib/api'

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api
      .channels()
      .then((d) => setChannels(d.channels))
      .catch((e) => setErr(e instanceof Error ? e.message : 'unreachable'))
  }, [])

  return (
    <section className="route route--channels">
      <header className="page-header">
        <p className="eyebrow">Distribution · Channels</p>
        <h1>Channels</h1>
        <p className="lede">Distribution targets configured in the forge worker.</p>
      </header>

      {err && <p className="hint">{err}</p>}
      {!err && channels.length === 0 && <p className="hint">No channels configured.</p>}

      <div className="list">
        {channels.map((c) => (
          <div key={c.id} className="list__row">
            <span>{c.name}</span>
            <span className={`badge ${c.configured ? 'badge--ok' : 'badge--off'}`}>
              {c.configured ? 'configured' : 'off'}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}