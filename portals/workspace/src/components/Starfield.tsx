import { useEffect, useRef } from 'react'
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
 * Starfield — the ambient seeded canvas behind every workspace surface.
 *
 * Full connection (per the port):
 *   - reads `--p31-star` each frame, so it recolors with the theme engine
 *   - subscribes to the notification store — `burst` notifications flare a
 *     set of random stars (the QPJ behavior)
 *   - calm floor: `spoons === 0` or `prefers-reduced-motion` renders a single
 *     static frame and stops the rAF loop (battery/CPU safe)
 *   - WCAG 2.2.2: a pause/stop control is exposed via Settings → Starfield
 *     (`flaring` off stops motion; the config drives count/speed/seed/flares)
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const starfield = useWorkspaceStore((s) => s.starfield)
  const calm = useWorkspaceStore((s) => s.crisis)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cfg: StarfieldConfig = starfield
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const reduce = calm || prefersReduced

    const count = cfg.count
    const seed = cfg.seed
    const twinkleSpeed = cfg.twinkleSpeed
    const flareCount = cfg.flareCount
    const flaring = cfg.flaring

    let stars: Star[] = genStars(count, seed)
    let flareAt = 0
    let flareRef = 0
    let flareStars: Star[] = []

    const starColor = () => {
      const css = getComputedStyle(document.documentElement)
        .getPropertyValue('--p31-star')
        .trim()
      return css || 'oklch(80% 0.125 90)'
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      stars = genStars(count, seed)
    }

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = starColor()
      const now = Date.now()
      const flareOn = flaring && now - flareAt < FLARE_MS
      for (const s of stars) {
        const twinkle = 0.35 + 0.3 * Math.sin(s.tw + now * 0.001 * s.ts * twinkleSpeed)
        const isFlaring = flareOn && flareStars.includes(s) ? 1 : 0
        ctx.globalAlpha = Math.min(1, twinkle + isFlaring * 0.55)
        ctx.beginPath()
        ctx.arc(s.x * w, s.y * h, s.r * (isFlaring ? 1.6 : 1), 0, Math.PI * 2)
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
      if (evt?.burst && flaring) {
        flareAt = Date.now()
        flareStars = stars.slice().sort(() => Math.random() - 0.5).slice(0, flareCount)
      }
    })

    resize()
    window.addEventListener('resize', resize)

    if (reduce) {
      draw()
      // Low-frequency settle: catch late flares without a full rAF loop.
      const settle = window.setInterval(() => {
        if (flaring && Date.now() - flareAt < FLARE_MS && flareStars.length > 0) draw()
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
  }, [starfield, calm])

  return <canvas className="starfield" ref={canvasRef} aria-hidden="true" />
}

export default Starfield