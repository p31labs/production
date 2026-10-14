import { useMemo, useState } from 'react';

/**
 * ExplorableChain — the transducer for a hash chain.
 *
 * Lets a visitor FEEL what a hash chain is in 30 seconds, the way Bret
 * Victor's explorable explanations make invisible systems understandable:
 *   1. See a small chain of blocks, each with a prev-hash link.
 *   2. Click "tamper with a block" — the chain visibly breaks at that point.
 *   3. Click "verify" — the verdict names the exact broken block.
 *   4. Click "repair" — the chain heals (rehash links forward).
 *
 * This is the surface that turns "SHA-256 + RFC 8785" into something a human
 * understands and trusts — the proof made tactile.
 */

interface Block {
  seq: number
  data: string
  hash: string
  prevHash: string
}

function sha256hex(input: string): string {
  // Synchronous FNV-ish stand-in for the demo so the explorer needs no crypto
  // async in render. The REAL chain uses SHA-256; the demo preserves the
  // *property*: changing data changes the hash, and the next block's prev
  // link breaks.
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return 'a1b2' + h.toString(16).padStart(8, '0')
}

function buildChain(events: string[]): Block[] {
  let prev = 'genesis'
  return events.map((data, i) => {
    const block: Block = { seq: i + 1, data, hash: '', prevHash: prev }
    block.hash = sha256hex(`${prev}|${data}`)
    prev = block.hash
    return block
  })
}

const DEMO_EVENTS = [
  'family: focus on the garden',
  'lumi: propose a bench for the street',
  'human: approve the bench proposal',
  'family: focus on the kitchen',
  'lumi: propose a reading corner',
  'human: reject — not enough spoons today',
]

export default function ExplorableChain() {
  const [tamperedAt, setTamperedAt] = useState<number | null>(null)
  const [verified, setVerified] = useState<boolean | null>(null)
  const chain = useMemo(() => buildChain(DEMO_EVENTS), [])

  const tamperedChain = useMemo(() => {
    if (tamperedAt === null) return chain
    // Rewrite the tampered block's data; its hash changes, breaking the next
    // block's prev link — exactly what a real tamper does.
    return chain.map((b, i) => {
      if (i !== tamperedAt - 1) return b
      const tamperedData = b.data + ' [EDITED]'
      return { ...b, data: tamperedData, hash: sha256hex(`${b.prevHash}|${tamperedData}`) }
    })
  }, [chain, tamperedAt])

  const brokenAt = useMemo(() => {
    for (let i = 1; i < tamperedChain.length; i++) {
      if (tamperedChain[i].prevHash !== tamperedChain[i - 1].hash) return i + 1
    }
    return null
  }, [tamperedChain])

  const verdict = verified === null
    ? null
    : verified
      ? { ok: true, text: 'Chain intact.' }
      : { ok: false, text: `Chain BROKEN at block ${brokenAt ?? '?'} — the prev-hash no longer matches.` }

  return (
    <div
      className="ec-w-full ec-rounded-2xl ec-border ec-p-5"
      style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}
    >
      <div className="ec-flex ec-flex-wrap ec-items-center ec-gap-2 ec-mb-4">
        <span className="ec-font-mono ec-text-xs ec-uppercase ec-tracking-widest" style={{ color: 'var(--p31-text-tertiary)' }}>
          Try it — break the chain
        </span>
        <div className="ec-ml-auto ec-flex ec-gap-2">
          <button
            type="button"
            onClick={() => setTamperedAt(tamperedAt === null ? 4 : null)}
            className="ec-px-3 ec-py-1-5 ec-rounded-lg ec-text-xs ec-font-semibold ec-border"
            style={tamperedAt !== null
              ? { borderColor: 'var(--p31-accent-red, #FB7185)', color: 'var(--p31-accent-red, #FB7185)', background: 'color-mix(in oklab, #FB7185 12%, transparent)' }
              : { borderColor: 'var(--p31-glass-border)', color: 'var(--p31-text)' }}
          >
            {tamperedAt === null ? '✏️ Tamper with block 4' : '🩹 Restore block 4'}
          </button>
          <button
            type="button"
            onClick={() => {
              setVerified(true)
              // a broken chain re-verifies as broken
              if (brokenAt !== null) setVerified(false)
            }}
            className="ec-px-3 ec-py-1-5 ec-rounded-lg ec-text-xs ec-font-semibold"
            style={{ background: 'var(--p31-accent)', color: '#000' }}
          >
            ✓ Verify chain
          </button>
        </div>
      </div>

      {/* Chain blocks */}
      <div className="ec-space-y-2">
        {tamperedChain.map((b, i) => {
          const isTampered = i === (tamperedAt ?? -1) - 1
          const linkBroken = i > 0 && tamperedChain[i].prevHash !== tamperedChain[i - 1].hash
          return (
            <div key={b.seq} className="ec-rounded-lg ec-border ec-px-3 ec-py-2" style={{
              borderColor: linkBroken ? 'var(--p31-accent-red, #FB7185)' : isTampered ? 'var(--p31-accent-gold, #FBBF24)' : 'var(--p31-glass-border)',
              background: 'var(--p31-surface2)',
            }}>
              <div className="ec-flex ec-items-center ec-gap-2 ec-text-xs">
                <span className="ec-font-mono" style={{ color: 'var(--p31-text-tertiary)' }}>#{b.seq}</span>
                <span style={{ color: 'var(--p31-text)' }}>{b.data}</span>
                {isTampered && <span className="ec-ml-auto ec-text--10px- ec-font-bold" style={{ color: 'var(--p31-accent-gold, #FBBF24)' }}>TAMPERED</span>}
                {linkBroken && <span className="ec-ml-auto ec-text--10px- ec-font-bold" style={{ color: 'var(--p31-accent-red, #FB7185)' }}>LINK BROKEN</span>}
              </div>
              <div className="ec-mt-1 ec-font-mono ec-text--10px- ec-flex ec-gap-4" style={{ color: 'var(--p31-text-tertiary)' }}>
                <span className="ec-truncate">prev {b.prevHash.slice(0, 10)}</span>
                <span className="ec-truncate">hash {b.hash.slice(0, 10)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Verdict */}
      {verdict && (
        <div className="ec-mt-4 ec-px-3 ec-py-2 ec-rounded-lg ec-text-sm ec-font-medium" style={{
          background: verdict.ok ? 'color-mix(in oklab, #34D399 12%, transparent)' : 'color-mix(in oklab, #FB7185 12%, transparent)',
          color: verdict.ok ? 'var(--p31-accent-green, #34D399)' : 'var(--p31-accent-red, #FB7185)',
        }}>
          {verdict.text}
        </div>
      )}

      <p className="ec-mt-3 ec-text-xs" style={{ color: 'var(--p31-text-tertiary)' }}>
        This is a simplified demo of the property. The real Loom chain uses SHA-256 over RFC 8785-canonicalized records, and the live chain is independently verifiable.
      </p>
    </div>
  )
}