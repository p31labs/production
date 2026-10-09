import { useEffect, useRef, useState } from 'react'

/**
 * SpaceshipDome — the transducer for Spaceship Earth's geodesic cockpit.
 * A minimal WebGPU-style dome where the coherence metric is live and spoon
 * level scales the visual complexity (bloom / segments) — the same rule the
 * real app uses. Reduced-motion safe.
 */
const SPOONS_BY_LEVEL = [0, 600, 1200, 2400, 4800, 9600] as const

export default function SpaceshipDome() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spoons, setSpoons] = useState(4)
  const [coherence, setCoherence] = useState(0.87)
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

    const segments = SPOONS_BY_LEVEL[spoons]
    let raf = 0

    const draw = (t: number) => {
      ctx.clearRect(0, 0, size, size)
      // Radial glow scaled by coherence
      const glow = 0.1 + coherence * 0.25
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(0,240,255,${glow})`
      ctx.lineWidth = 1
      ctx.stroke()

      // Geodesic segments — count scales with spoons (more spoons = richer)
      const count = Math.min(segments, 400) // cap for perf
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + (reduced ? 0 : t * 0.0002)
        const b = a + Math.PI * 0.55
        const r = size * 0.4
        ctx.beginPath()
        ctx.moveTo(size / 2 + Math.cos(a) * r, size / 2 + Math.sin(a) * r)
        ctx.lineTo(size / 2 + Math.cos(b) * r, size / 2 + Math.sin(b) * r)
        ctx.strokeStyle = `rgba(120,140,93,${0.12 + coherence * 0.3})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Center node pulses with coherence
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, 8 + coherence * 6, 0, Math.PI * 2)
      ctx.fillStyle = '#00F0FF'
      ctx.fill()

      if (!reduced) raf = requestAnimationFrame(draw)
    }

    draw(0)
    if (reduced) return

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [spoons, coherence, reduced])

  return (
    <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--p31-glass-border)', background: 'var(--p31-surface)' }}>
      <div className="mb-3">
        <span className="text-lg font-semibold" style={{ color: 'var(--p31-text)' }}>🌍 Spaceship Earth · coherence</span>
      </div>
      <canvas ref={canvasRef} className="mx-auto" aria-label="Geodesic dome coherence visualization" />
      <div className="mt-3 flex items-center justify-center gap-3 text-xs">
        <span style={{ color: 'var(--p31-text-tertiary)' }}>Coherence {(coherence * 100).toFixed(0)}%</span>
        <span className="font-mono px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in oklab, var(--p31-chain-verified, #788c5d) 15%, transparent)', color: 'var(--p31-chain-verified, #788c5d)' }}>{spoons} spoons</span>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        {([1, 3, 5] as const).map((s) => (
          <button key={s} onClick={() => setSpoons(s)} className="px-2 py-1 rounded text-xs" style={{ background: spoons === s ? 'var(--p31-accent)' : 'transparent', color: spoons === s ? 'var(--p31-bg, #141413)' : 'var(--p31-text)', border: '1px solid var(--p31-glass-border)' }}>
            {s} spoons
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--p31-text-tertiary)' }}>
        More spoons = more visual richness. The real dome follows the same rule — bloom, segments, and star count scale with cognitive energy.
      </p>
    </div>
  )
}