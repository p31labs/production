import { useEffect, useState } from 'react'
import { api, type BrandData, type BodyItem } from '../lib/api'

/** Compose — the enterprise governance overview, rendered from the live
 *  governance content pack with evidence blocks (claim → value → source). */
export default function Compose() {
  const [brand, setBrand] = useState<BrandData | null>(null)
  const [pack, setPack] = useState<{ title: string; body: BodyItem[] } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api.brand().then(setBrand).catch((e) => setErr(e instanceof Error ? e.message : 'unreachable'))
    fetch('https://raw.githubusercontent.com/p31labs/phosphorus31/master/P31-local-workspace/software/p31-forge/content/governance/sovereign_stack_overview.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => p && setPack(p))
      .catch(() => setErr((prev) => prev ?? 'governance pack unavailable'))
  }, [])

  const entity = brand?.entity

  return (
    <section className="route route--compose">
      <header className="page-header">
        <p className="eyebrow">Enterprise · Compose</p>
        <h1>Sovereign Stack Governance</h1>
        <p className="lede">
          {entity ? `${entity.name} · EIN ${entity.ein}` : 'Loading entity…'}
        </p>
      </header>

      {err && <p className="hint">{err}</p>}

      <div className="panel glass glass--coherent">
        <h2>{pack ? pack.title : 'Governance overview'}</h2>
        {pack ? (
          pack.body.map((item, i) => {
            if (item.type === 'evidence') {
              return (
                <div key={i} className="evidence">
                  <div className="evidence__claim">{item.claim}</div>
                  <div className="evidence__value">{item.value}</div>
                  <div className="evidence__source">Source: {item.source}</div>
                  <div className="evidence__verified">Verified: {item.verified}</div>
                </div>
              )
            }
            return <p key={i}>{item.text}</p>
          })
        ) : (
          <p className="hint">Fetching the governance content pack…</p>
        )}
      </div>
    </section>
  )
}