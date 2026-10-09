import { useEffect, useRef, useState } from 'react'

/**
 * MeatspaceMesh — the transducer for the P2P presence mesh.
 * Shows the K₄ tetrahedron forming as "people" check in — no central server.
 * DID identity, no accounts, presence only.
 */
const MEMBERS = [
  { id: 'A', x: 0.5, y: 0.1 },
  { id: 'B', x: 0.88, y: 0.72 },
  { id: 'C', x: 0.12, y: 0.72 },
  { id: 'D', x: 0.5, y: 0.9 },
]

export default function MeatspaceMesh() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [present, setPresent] = useState<string[]>(['A', 'B'])
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const size = 300
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const draw = (t: number) => {
      ctx.clearRect(0, 0, size, size)
      const nodes = MEMBERS.filter((m) => present.includes(m.id))
      // K₄ edges — every pair connected (the complete graph)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          ctx.beginPath()
          ctx.moveTo(nodes[i].x * size, nodes[i].y * size)
          ctx.lineTo(nodes[j].x * size, nodes[j].y * size)
          ctx.strokeStyle = 'rgba(120,140,93,0.5)'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
      nodes.forEach((n, i) => {
        ctx.beginPath()
        ctx.arc(n.x * size, n.y * size, 10 + (reduced ? 0 : Math.sin(t * 0.002 + i) * 2), 0, Math.PI * 2)
        ctx.fillStyle = '#d97757'
        ctx.fill()
        ctx.fillStyle = '#141413'
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.id, n.x * size, n.y * size)
      })
      if (!reduced) requestAnimationFrame(draw)
    }

    draw(0)
    if (reduced) return
    const raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [present, reduced])

  return (
    <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}>
      <div className="mb-3">
        <span className="text-lg font-semibold" style={{ color: 'var(--p31-text)' }}>🤝 Meatspace · P2P presence mesh</span>
      </div>
      <canvas ref={canvasRef} className="mx-auto" aria-label="K4 family presence mesh" />
      <div className="mt-3 flex justify-center gap-2">
        {MEMBERS.map((m) => {
          const isIn = present.includes(m.id)
          return (
            <button key={m.id} onClick={() => setPresent((p) => isIn ? p.filter((x) => x !== m.id) : [...p, m.id])} className="px-3 py-1 rounded text-xs font-mono" style={{ background: isIn ? 'var(--p31-accent)' : 'transparent', color: isIn ? 'var(--p31-bg, #141413)' : 'var(--p31-text)', border: '1px solid var(--p31-glass-border)' }}>
              {m.id} {isIn ? '✓' : '…'}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--p31-text-tertiary)' }}>
        Toggle members on and off — the K₄ complete graph re-forms. Every node touches every other, no central server. DID identity, no accounts, presence only.
      </p>
    </div>
  )
}