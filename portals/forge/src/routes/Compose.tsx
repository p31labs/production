import { useEffect, useState } from 'react'
import { api, type BrandData, type BodyItem } from '../lib/api'
import { EvidenceBlock } from '@p31ca/design-core/compositions'

// The sovereign-stack governance pack, bundled at build time from the content
// tree (the canonical pack the manifest lists). Offline/read-only by design —
// the pack is local, not fetched from a remote URL at runtime.
import governancePack from '../../../../software/p31-forge/content/governance/sovereign_stack_overview.json'

interface GovernanceBody extends Array<BodyItem> {}

/** Compose — the enterprise governance overview, rendered from the live
 *  governance content pack with evidence blocks (claim → value → source). */
export default function Compose() {
  const [brand, setBrand] = useState<BrandData | null>(null)

  useEffect(() => {
    api.brand().then(setBrand).catch(() => undefined)
  }, [])

  const entity = brand?.entity
  const pack = governancePack as unknown as { title: string; body: GovernanceBody }

  return (
    <section className="route route--compose">
      <header className="page-header">
        <p className="eyebrow">Enterprise · Compose</p>
        <h1>Sovereign Stack Governance</h1>
        <p className="lede">
          {entity ? `${entity.name} · EIN ${entity.ein}` : 'worker offline — entity unavailable'}
        </p>
      </header>

      <div className="panel glass glass--coherent">
        <h2>{pack.title}</h2>
        {pack.body.map((item, i) => {
          if (item.type === 'evidence') {
            return (
              <EvidenceBlock
                key={i}
                claim={item.claim}
                value={item.value}
                source={item.source}
                verified={item.verified}
              />
            )
          }
          return <p key={i}>{item.text}</p>
        })}
      </div>
    </section>
  )
}