import { useEffect, useRef } from 'react'
import { useEffectsStore } from '../../stores/effectsStore'
import { useSceneStore } from '../../stores/sceneStore'
import { genStars, type Star } from '../../lib/starfield'

/**
 * Starfield — the QPJ 2D canvas starfield (ported).
 *
 * Deterministic seeded stars (SEED 182332), twinkle, burst flares, and a
 * calm/reduced-motion floor. Reads `--p31-star` for its color (theme-aware).
 * Composition comes from the scene store:
 *   - density  → rebuild the star array (same seed, so existing stars hold)
 *   - twinkle  → multiplies the twinkle rate
 *   - flare    → how many stars flare on each LED-change burst
 * Burst flares trigger on effects-store pulses (LED changes, scene commands).
 */

const SEED = 182332
const FLARE_MS = 1400

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const calm = useEffectsStore((s) => s.calm || s.spoons <= 1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const reduce = calm || prefersReduced

    let stars: Star[] = []
    let flareAt = 0
    let flareRef = 0
    let flareStars: Star[] = []

    const readScene = () => useSceneStore.getState().starfield

    const rebuild = () => {
      stars = genStars(readScene().density, SEED)
    }

    const starColor = () => {
      const css = getComputedStyle(document.documentElement).getPropertyValue('--p31-star').trim()
      return css || 'oklch(80% 0.125 90)'
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      rebuild()
    }

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      const { twinkle } = readScene()
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = starColor()
      const now = Date.now()
      const flareOn = now - flareAt < FLARE_MS
      for (const s of stars) {
        const tw = 0.35 + 0.3 * Math.sin(s.tw + now * 0.001 * s.ts * twinkle)
        const flaring = flareOn && flareStars.includes(s) ? 1 : 0
        ctx.globalAlpha = Math.min(1, tw + flaring * 0.55)
        ctx.beginPath()
        ctx.arc(s.x * w, s.y * h, s.r * (flaring ? 1.6 : 1), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const frame = () => {
      draw()
      flareRef = requestAnimationFrame(frame)
    }

    // Burst flare when the effects store pulses (LED change / scene action).
    const unsubPulse = useEffectsStore.subscribe((state, prev) => {
      if (state.pulseAt === prev.pulseAt) return
      const n = readScene().flare
      if (n === 0) return
      flareAt = Date.now()
      flareStars = stars.slice().sort(() => Math.random() - 0.5).slice(0, n)
    })

    // Scene changes: density rebuilds (deterministic — existing stars hold);
    // twinkle/flare are read per-frame so no extra work needed.
    const unsubScene = useSceneStore.subscribe((state, prev) => {
      if (state.starfield.density !== prev.starfield.density) {
        rebuild()
        if (reduce) draw()
      }
    })

    resize()
    window.addEventListener('resize', resize)

    if (reduce) {
      draw()
      const settle = window.setInterval(() => {
        if (Date.now() - flareAt < FLARE_MS && flareStars.length > 0) draw()
      }, 500)
      return () => {
        window.clearInterval(settle)
        window.removeEventListener('resize', resize)
        unsubPulse()
        unsubScene()
      }
    }

    flareRef = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(flareRef)
      window.removeEventListener('resize', resize)
      unsubPulse()
      unsubScene()
    }
  }, [calm])

  return <canvas className="starfield" ref={canvasRef} aria-hidden="true" />
}