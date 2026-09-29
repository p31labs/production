import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type BrandData } from '../lib/api'
import { useUI, WORLDS } from '../lib/store'
import manifest from '../data/manifest.json'

export default function Home() {
  const { world, setWorld, spoons, setSpoons } = useUI()
  const [brand, setBrand] = useState<BrandData | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api
      .brand()
      .then(setBrand)
      .catch((e) => setErr(e instanceof Error ? e.message : 'worker unreachable'))
  }, [])

  const domains = new Set(manifest.packs.map((p) => p.kind))

  return (
    <section className="route route--home">
      <header className="hero glass glass--coherent">
        <p className="eyebrow">P31 Forge · Enterprise Document Pipeline</p>
        <h1>Quantum Material</h1>
        <p className="lede">
          Browse, preview, and compile the P31 document suite — grants, legal,
          papers, governance, corporate — through one canonical pipeline.
        </p>
        <div className="hero__actions">
          <Link to="/catalog" className="btn btn--primary">
            Browse catalog
          </Link>
          <Link to="/compose" className="btn btn--ghost">
            Compose suite
          </Link>
        </div>
      </header>

      <div className="metrics">
        <div className="metric">
          <span className="metric__v">{manifest.packs.length}</span>
          <span className="metric__l">packs</span>
        </div>
        <div className="metric">
          <span className="metric__v">{domains.size}</span>
          <span className="metric__l">domains</span>
        </div>
        <div className="metric">
          <span className="metric__v">{api.hasAuth() ? 'live' : 'read-only'}</span>
          <span className="metric__l">compile</span>
        </div>
        <div className="metric">
          <span className="metric__v">{err ? 'offline' : brand ? 'online' : '…'}</span>
          <span className="metric__l">worker</span>
        </div>
      </div>

      <div className="panel">
        <h2>World</h2>
        <div className="world-switch" role="radiogroup" aria-label="Theme world">
          {WORLDS.map((w) => (
            <button
              key={w}
              role="radio"
              aria-checked={world === w}
              className={`world-chip world-chip--${w}`}
              onClick={() => setWorld(w)}
            >
              {w}
            </button>
          ))}
        </div>

        <h2>Capacity</h2>
        <input
          type="range"
          min={0}
          max={5}
          value={spoons}
          onChange={(e) => setSpoons(Number(e.target.value))}
          aria-label="Spoon dial capacity"
        />
        <p className="hint">Spoons {spoons}/5 — at 0 the calm overlay takes over; at 1 motion and glow are off.</p>
      </div>
    </section>
  )
}