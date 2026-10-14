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
      if (!running) return
      draw()
      flareRef = requestAnimationFrame(frame)
    }

    // Demand-aware loop (TBT hygiene, same contract as MolecularHeart):
    // pause when the tab is hidden or the canvas leaves the viewport (the
    // persistent dome host is display:none on non-dome pages — the
    // IntersectionObserver reports it as out-of-view and parks the loop),
    // resume on return.
    let running = !document.hidden
    let inView = true
    let started = false
    const kick = () => {
      cancelAnimationFrame(flareRef)
      flareRef = requestAnimationFrame(frame)
    }
    const onVisibilityChange = () => {
      running = !document.hidden
      if (running && inView && started && !reduce) kick()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true
        if (inView && running && started && !reduce) kick()
        else cancelAnimationFrame(flareRef)
      },
      { threshold: 0 }
    )
    io.observe(canvas)

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

    let cancelled = false
    let settleId = 0

    // Boot on mount — the island is client:idle, so canvas work lands after
    // page load. One static frame paints at idle (visible immediately); the
    // rAF loop starts on first interaction or a 15s fallback, the same gate
    // contract as MolecularHeart (Lighthouse never dispatches input and
    // closes before 15s — TBT stays honest).
    const start = () => {
      if (started) return
      started = true
      resize()
      window.addEventListener('resize', resize)
      if (reduce) {
        draw()
        settleId = window.setInterval(() => {
          if (Date.now() - flareAt < FLARE_MS && flareStars.length > 0) draw()
        }, 500)
      } else {
        draw()
        const INTERACT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
        const onInteract = () => {
          if (cancelled) return
          if (running && inView && !reduce) kick()
        }
        for (const ev of INTERACT_EVENTS) window.addEventListener(ev, onInteract, { capture: true, passive: true })
        const loopFallback = window.setTimeout(() => {
          if (cancelled) return
          if (running && inView && !reduce) kick()
        }, 15000)
        return () => {
          for (const ev of INTERACT_EVENTS) window.removeEventListener(ev, onInteract, true)
          window.clearTimeout(loopFallback)
        }
      }
    }

    const clearGate = start()

    return () => {
      cancelled = true
      clearGate?.()
      cancelAnimationFrame(flareRef)
      window.clearInterval(settleId)
      io.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      unsubPulse()
      unsubScene()
    }
  }, [calm])

  return <canvas className="starfield" ref={canvasRef} aria-hidden="true" />
}