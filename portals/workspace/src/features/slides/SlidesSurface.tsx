import { useState } from 'react'
import { MCP_TOOLS } from '@/lib/mcpTools'

interface Slide {
  id: string
  title: string
  body: string
}

const SEED: Slide[] = [
  { id: 's1', title: 'P31 Family Workspace', body: 'Built for families, self-hosted on local hardware, powered by a calm, private design.' },
  { id: 's2', title: 'Architecture', body: 'Cloudflare Pages + Workers + local-first PGlite. No vendor lock-in.' },
  { id: 's3', title: 'Next Steps', body: 'Wire the Loom chain journal. Ship the adaptive spoon dial.' },
]

export function SlidesSurface() {
  const [slides, setSlides] = useState(SEED)
  const [active, setActive] = useState(0)
  const [presenting, setPresenting] = useState(false)

  const slide = slides[active]!

  function updateSlide(patch: Partial<Slide>) {
    setSlides((s) => s.map((sl, i) => (i === active ? { ...sl, ...patch } : sl)))
  }

  return (
    <section className="surface-panel active" data-mcp-tool={MCP_TOOLS.slides} aria-label="Slides surface">
      <div className="slides-layout">
        <aside className="slides-sidebar">
          <button className="btn btn-primary" type="button">+ New Slide</button>
          <div style={{ fontSize: 12, color: 'var(--p31-cloud)', fontWeight: 600, marginTop: 8 }}>
            SLIDES ({slides.length})
          </div>
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`slide-thumb ${i === active ? 'active' : ''}`}
              onClick={() => setActive(i)}
            >
              <span className="slide-thumb-num">{i + 1}</span>
              <div style={{ fontWeight: 600, fontSize: 11 }}>{s.title}</div>
            </button>
          ))}
        </aside>

        <div className="slides-canvas-area">
          <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" type="button" onClick={() => setPresenting(true)}>▶ Present Deck</button>
          </div>

          <div className="slide-canvas">
            <h2
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateSlide({ title: e.currentTarget.innerText })}
              style={{ outline: 'none' }}
            >
              {slide.title}
            </h2>
            <p
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateSlide({ body: e.currentTarget.innerText })}
              style={{ outline: 'none' }}
            >
              {slide.body}
            </p>
          </div>
        </div>
      </div>

      {presenting && (
        <div className="present-overlay active" role="dialog" aria-modal="true">
          <div className="present-slide">
            <h1 style={{ fontSize: 56, marginBottom: 24 }}>{slide.title}</h1>
            <p style={{ fontSize: 28, color: 'var(--p31-cloud)' }}>{slide.body}</p>
          </div>
          <div className="present-controls">
            <button className="btn btn-glass" type="button" onClick={() => setPresenting(false)}>Exit (Esc)</button>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Slide {active + 1} of {slides.length}</span>
          </div>
        </div>
      )}
    </section>
  )
}

export default SlidesSurface