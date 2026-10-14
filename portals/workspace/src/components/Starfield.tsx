import { useEffect, useRef } from 'react'
import { Starfield as CanonStarfield } from '@p31ca/design-core/compositions'
import { useWorkspaceStore, type StarfieldConfig } from '@/store/workspaceStore'
import { useNotifStore } from '@/store/useNotifStore'
import './starfield.css'

export interface Star {
  x: number
  y: number
  r: number
  tw: number
  ts: number
}

export function prng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function genStars(count: number, seed: number): Star[] {
  const rand = prng(seed)
  const stars: Star[] = []
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: rand(),
      y: rand(),
      r: 0.4 + rand() * 1.1,
      tw: rand() * Math.PI * 2,
      ts: 0.2 + rand() * 0.9,
    })
  }
  return stars
}

const FLARE_MS = 1400

/**
 * FlareCanvas — the portal's notification-flare layer, drawn on its own
 * transparent canvas ABOVE the canon starfield (later sibling = paints on
 * top). Reads `--p31-star` each frame so it recolors with the theme engine;
 * `burst` notifications flare the seeded star set; calm or reduced-motion
 * renders only the settle sweep, never a rAF loop.
 */
function FlareCanvas({ cfg, calm }: { cfg: StarfieldConfig; calm: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const reduce = calm || prefersReduced

    const flareStars = genStars(cfg.flareCount, cfg.seed)
    let flareAt = 0
    let flareRef = 0

    const starColor = () => {
      const css = getComputedStyle(document.documentElement)
        .getPropertyValue('--p31-star')
        .trim()
      return css || 'oklch(80% 0.125 90)'
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      const now = Date.now()
      const flareOn = cfg.flaring && now - flareAt < FLARE_MS
      if (!flareOn) return
      ctx.fillStyle = starColor()
      for (const s of flareStars) {
        const twinkle = 0.4 + 0.3 * Math.sin(s.tw + now * 0.001 * s.ts * cfg.twinkleSpeed)
        ctx.globalAlpha = Math.min(1, twinkle)
        ctx.beginPath()
        ctx.arc(s.x * w, s.y * h, s.r * 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const frame = () => {
      draw()
      flareRef = requestAnimationFrame(frame)
    }

    const unsub = useNotifStore.subscribe((state, prev) => {
      if (state.items.length === prev.items.length) return
      const evt = state.items[state.items.length - 1]
      if (evt?.burst && cfg.flaring) {
        flareAt = Date.now()
      }
    })

    resize()
    window.addEventListener('resize', resize)

    if (reduce) {
      // Low-frequency settle: catch late flares without a full rAF loop.
      const settle = window.setInterval(() => {
        if (cfg.flaring && Date.now() - flareAt < FLARE_MS) draw()
      }, 500)
      return () => {
        window.clearInterval(settle)
        window.removeEventListener('resize', resize)
        unsub()
      }
    }

    flareRef = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(flareRef)
      window.removeEventListener('resize', resize)
      unsub()
    }
  }, [cfg, calm])

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />
}

/**
 * Starfield — consumer wrapper over the canon Starfield composition.
 *
 * The canon component owns the ambient star layer (mountStarfield, calm
 * floor at spoons 0, reduced-motion handling). The portal adds ONE
 * extension on top via the documented children... sibling composition: the
 * notification-flare canvas. Ambient config (count/seed/twinkleSpeed) is
 * canon-owned; flareCount/flaring continue to drive the flare layer.
 */
export function Starfield() {
  const starfield = useWorkspaceStore((s) => s.starfield)
  const calm = useWorkspaceStore((s) => s.crisis)
  const spoons = useWorkspaceStore((s) => s.spoons)

  return (
    <>
      <CanonStarfield spoons={spoons} className="starfield" />
      <FlareCanvas cfg={starfield} calm={calm} />
    </>
  )
}

export default Starfield