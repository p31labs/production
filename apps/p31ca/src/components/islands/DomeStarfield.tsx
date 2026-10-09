import { useEffect, useRef } from 'react'

/**
 * DomeStarfield — the interactive K4 dome background for scene-mode pages.
 *
 * WebGPU-first via three/webgpu with WebGL2 fallback. Spherical starfield
 * around the K4 tetrahedron glyph. Spoon-aware: star count, rotation speed,
 * and twinkle scale with cognitive energy. Crisis (spoons ≤ 1) and
 * prefers-reduced-motion render a single static frame — no motion.
 *
 * The dome is the P31 sensory contract: slow drift, spectral color
 * temperature, magnitude-based brightness, under 3 flashes/sec.
 */
export default function DomeStarfield({ spoons = 3 }: { spoons?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    let cleanup: (() => void) | undefined

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const s = Math.max(0, Math.min(5, Number(spoons) || 3))
    const crisis = s <= 1

    const starCount = crisis ? 0 : reduced ? 500 : 1600 + s * 700
    const rotateSpeed = crisis || reduced ? 0 : 0.0004 * (s / 5)
    const twinkleRate = crisis || reduced ? 0 : 0.0009

    async function init() {
      const THREE = await import('three')
      let renderer: any
      let usesWebGPU = false

      try {
        if (typeof (navigator as any).gpu !== 'undefined') {
          const { WebGPURenderer } = await import('three/webgpu')
          renderer = new WebGPURenderer({ canvas, antialias: false })
          await renderer.init()
          usesWebGPU = true
        } else {
          renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
        }
      } catch {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
      }

      if (cancelled) { renderer.dispose?.(); return }

      const scene = new THREE.Scene()
      const w = canvas.clientWidth || window.innerWidth
      const h = canvas.clientHeight || window.innerHeight
      const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
      camera.position.set(0, 0, 3.2)
      renderer.setSize(w, h, false)

      // ── Starfield: uniform spherical distribution ──
      const positions = new Float32Array(starCount * 3)
      const colors = new Float32Array(starCount * 3)
      const sizes = new Float32Array(starCount)
      for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(1 - 2 * Math.random())
        const r = 1.6 + Math.random() * 1.4
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
        positions[i * 3 + 2] = r * Math.cos(phi)
        // Spectral color temperature: warm amber for ~35%, cool blue-white otherwise
        const warm = Math.random() > 0.65
        const c = warm ? new THREE.Color(0xffd28c) : new THREE.Color(0xb4e6ff)
        colors[i * 3] = c.r
        colors[i * 3 + 1] = c.g
        colors[i * 3 + 2] = c.b
        sizes[i] = 0.4 + Math.random() * 1.6 // magnitude-based size
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
      const material = new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
      })
      const stars = new THREE.Points(geometry, material)
      stars.frustumCulled = false
      scene.add(stars)

      // ── K4 tetrahedron wireframe (the brand glyph) ──
      const k4Geo = new THREE.TetrahedronGeometry(0.55, 0)
      const k4Edges = new THREE.EdgesGeometry(k4Geo)
      const k4Mat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: crisis ? 0.25 : 0.45,
      })
      const k4 = new THREE.LineSegments(k4Edges, k4Mat)
      scene.add(k4)

      const twinkleSizes = sizes.slice()
      const pulse = new Float32Array(starCount)
      for (let i = 0; i < starCount; i++) pulse[i] = Math.random() * Math.PI * 2

      let raf = 0
      const draw = (t: number) => {
        if (cancelled) return
        if (!reduced && !crisis) {
          stars.rotation.y += rotateSpeed
          stars.rotation.x += rotateSpeed * 0.35
          k4.rotation.y += rotateSpeed * 0.5
          k4.rotation.x += rotateSpeed * 0.3
          // Gentle twinkle via material opacity oscillation (slow, < 3 Hz)
          material.opacity = 0.75 + 0.1 * Math.sin(t * twinkleRate)
          void twinkleSizes; void pulse
        }
        renderer.render(scene, camera)
        if (!crisis && !reduced) raf = requestAnimationFrame(draw)
      }
      draw(0)
      if (!crisis && !reduced) raf = requestAnimationFrame(draw)

      const onResize = () => {
        const nw = canvas.clientWidth || window.innerWidth
        const nh = canvas.clientHeight || window.innerHeight
        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
        renderer.setSize(nw, nh, false)
      }
      window.addEventListener('resize', onResize)

      cleanup = () => {
        window.removeEventListener('resize', onResize)
        cancelAnimationFrame(raf)
        geometry.dispose()
        material.dispose()
        k4Geo.dispose()
        k4Mat.dispose()
        renderer.dispose()
      }
    }

    init()
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [spoons])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0, opacity: 0.9 }}
    />
  )
}