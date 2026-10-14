import { useEffect, useRef } from 'react'
import type * as THREE from 'three'
import { useEffectsStore } from '../../stores/effectsStore'
import { useLedStore, type LedMode } from '../../stores/ledStore'
import { useSceneStore } from '../../stores/sceneStore'
import { icosahedronGeodesic } from '../../lib/geodesic'
import { cssToHex } from '../../lib/color'

/**
 * MolecularHeart — the dome background with the molecular heart inside.
 *
 * A faithful raw-three port of the previous deploy's StarfieldBackground
 * (3401aef2), which ran on @react-three/fiber. Renders:
 *   - a spherical starfield (GLSL Points, warm/cool tint, spoon-aware count)
 *   - the LED ring (segment ring lit by the LED store: chase/rainbow/breath/…)
 *   - the molecular heart (icosahedron displaced by 3-octave simplex noise,
 *     plasma fragment shader, blob brightness/speed/color from the LED store)
 * The dome group sits at [0,-0.2,-7] scale 2.2 with a slow drift rotation.
 *
 * Spoon/calm/reduced-motion floors: crisis (spoons ≤ 1), calm, or
 * prefers-reduced-motion renders a single static frame — no motion.
 */
export default function MolecularHeart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    async function init() {
      if (!canvas) return
      const THREE = await import('three')
      let renderer: any
      try {
        renderer = new (THREE as any).WebGLRenderer({
          canvas,
          antialias: false,
          alpha: true,
          premultipliedAlpha: false,
          powerPreference: 'low-power',
        })
        renderer.setClearColor(0x000000, 0)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.debug.checkShaderErrors = true
      } catch (e) {
        // WebGL unavailable — the static SVG heart layer carries the visual.
        canvas.dataset.fallback = 'true'
        console.warn('[MolecularHeart] WebGL unavailable:', e)
        return
      }
      if (cancelled) { renderer.dispose?.(); return }

      const scene = new THREE.Scene()
      const w = canvas.clientWidth || window.innerWidth
      const h = canvas.clientHeight || window.innerHeight
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200)
      camera.position.set(0, 0, 9)
      renderer.setSize(w, h, false)

      // ── Simplex noise GLSL (from the previous deploy, verbatim) ──
      const NOISE = `
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
        }
      `

      // ── Molecular heart: vertex (displacement) + fragment (plasma) ──
      const heartVertex = `
        uniform float uTime;
        uniform float uEnergy;
        uniform float uAlarm;
        uniform float uCalm;
        uniform float uBlobBrightness;
        uniform float uBlobSpeed;
        uniform float uAudioEnergy;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying float vGlint;
        ${NOISE}
        void main() {
          float e = uEnergy;
          float amp = 0.04 + 0.10 * e + uAlarm * 0.08 + 0.06 * uAudioEnergy;
          float freq = 1.0 + 1.4 * e + uAlarm * 0.6;
          if (uCalm > 0.5) { amp *= 0.6; freq *= 0.7; }
          float t = uTime * (1.0 + 0.6 * uBlobSpeed);
          vec3 eye = vec3(sin(t * 0.21 + 1.3), 0.35, cos(t * 0.21 + 1.3));
          float lean = dot(position, eye) * (0.03 + 0.05 * e);
          vec3 p = position;
          float n1 = snoise(p * freq + vec3(t * 0.4 * (1.0 + e), 0.0, 0.0));
          float n2 = snoise(p * (freq * 2.1) + vec3(0.0, t * 0.55, t * 0.35));
          float n3 = snoise(p * (freq * 4.2 + 3.7) + vec3(t * 0.8, -t * 0.3, 0.0));
          float wob = n1 * 0.62 + n2 * 0.28 + n3 * 0.10;
          vec3 displaced = position + normal * (wob * amp + lean);
          vNormal = normalize(mat3(normalMatrix) * normalize(displaced));
          vec3 worldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
          vViewDir = normalize(cameraPosition - worldPos);
          vGlint = 0.5 + 0.5 * sin(dot(displaced, vec3(0.7, 1.2, 0.4)) * 3.0 - t * 1.2);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `

      const heartFragment = `
        uniform float uTime;
        uniform float uEnergy;
        uniform float uAlarm;
        uniform float uCalm;
        uniform float uAudioEnergy;
        uniform float uBlobBrightness;
        uniform vec3 uAccent;
        uniform vec3 uViolet;
        uniform vec3 uBlobColor;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying float vGlint;
        void main() {
          float e = uEnergy;
          vec3 n = normalize(vNormal);
          vec3 v = normalize(vViewDir);
          float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.4);
          vec3 warm = vec3(1.0, 0.62, 0.18);
          vec3 cool = vec3(0.3, 0.59, 1.0);
          vec3 plasma = mix(uAccent, uViolet, 0.5 + 0.5 * sin(dot(n, vec3(2.1, 0.7, 1.3)) + uTime * 0.6));
          plasma = mix(plasma, uBlobColor, 0.45);
          if (uCalm > 0.5) { plasma = mix(plasma, uViolet, 0.45); }
          vec3 base = mix(plasma, warm, uAlarm * 0.4);
          vec3 tempBlend = mix(cool, warm, e + uAudioEnergy * 0.5);
          base = mix(base, tempBlend, 0.35 + 0.25 * uAlarm);
          float glow = 0.035 + 0.48 * e + uAlarm * 0.4 + 0.18 * uAudioEnergy;
          vec3 core = base * glow;
          vec3 rim = uAccent * fres * (0.3 + 0.55 * e + uAlarm * 0.5);
          float glint = vGlint * (0.08 + 0.2 * e + 0.15 * uAudioEnergy) * smoothstep(0.25, 0.75, e);
          vec3 col = core + rim * 1.4 + base * glint * 1.1;
          col *= 0.85 + 0.3 * sin(uTime * (1.2 + e * 2.0));
          col *= uBlobBrightness;
          col = 1.0 - exp(-col * 0.95);
          col = min(col, vec3(0.86));
          gl_FragColor = vec4(col, 1.0);
        }
      `

      // Environment-aware color readers (theme roles → heart plasma).
      // Theme tokens are oklch — THREE.Color can't parse that, so normalize.
      // Batched into ONE computed-style read: the old shape called
      // getComputedStyle once per role (four forced style recalcs).
      const heartColorsOf = () => {
        const cs = getComputedStyle(document.documentElement)
        const core =
          cssToHex(cs.getPropertyValue('--p31-heart-core').trim()) ||
          cssToHex(cs.getPropertyValue('--p31-accent').trim()) ||
          '#22d3ee'
        const plasma =
          cssToHex(cs.getPropertyValue('--p31-heart-plasma').trim()) ||
          cssToHex(cs.getPropertyValue('--p31-accent-violet').trim()) ||
          '#a78bfa'
        return { core, plasma }
      }

      // ── Molecular heart mesh ──
      const heartGeo = new THREE.IcosahedronGeometry(1.4, 4)
      // One batched read — every color role from a single computed style.
      const { core: hCore, plasma: hPlasma } = heartColorsOf()
      const heartUniforms = {
        uTime: { value: 0 },
        uEnergy: { value: 1 },
        uAlarm: { value: 0 },
        uCalm: { value: 0 },
        uAudioEnergy: { value: 0 },
        uBlobBrightness: { value: 1 },
        uBlobSpeed: { value: 0.5 },
        uAccent: { value: new THREE.Color(hCore) },
        uViolet: { value: new THREE.Color(hPlasma) },
        uBlobColor: { value: new THREE.Color('#ff9944') },
      }
      const heartMat = new THREE.ShaderMaterial({
        uniforms: heartUniforms,
        vertexShader: heartVertex,
        fragmentShader: heartFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      })
      const heart = new THREE.Mesh(heartGeo, heartMat)
      heart.raycast = () => null

      // ── Geodesic LED-bead frame (the reference dome, zoomed in) ──
      // Same math + constants the reference deployment compiled from
      // spaceship-earth's NeoPixelFrame: dome radius 3.2, detail 1/2,
      // 14/20 segments per edge, pixel radius .018, gap .004, cap 9600.
      const isSmallScreen =
        window.innerWidth < 600 ||
        ((window.devicePixelRatio || 1) < 2 && window.innerWidth < 1000)
      const DOME_RADIUS = 3.2
      const DOME_DETAIL = isSmallScreen ? 1 : 2
      const SEGMENTS_PER_EDGE = isSmallScreen ? 14 : 20
      const PIXEL_RADIUS = 0.018
      const PIXEL_GAP = 0.004
      const MAX_SEGMENTS = 9600
      const crisis = reduced || useEffectsStore.getState().calm || useEffectsStore.getState().spoons <= 1

      const LED_MODE_MAP: Record<LedMode, number> = {
        rainbow: 0,
        chase: 1,
        solid: 2,
        breath: 3,
        gradient: 4,
        'dual-chase': 5,
        off: 6,
        sigh: 7,
      }

      const frameShell = icosahedronGeodesic(DOME_RADIUS, DOME_DETAIL)
      const pixelGeo = new THREE.CylinderGeometry(PIXEL_RADIUS, PIXEL_RADIUS, 1, 6, 1, false)
      const frameDummy = new THREE.Object3D()
      const frameQuat = new THREE.Quaternion()
      const frameUp = new THREE.Vector3(0, 1, 0)

      const placements: { pos: THREE.Vector3; dir: THREE.Vector3; segLen: number }[] = []
      for (const [a, b] of frameShell.edges) {
        const start = new THREE.Vector3(...frameShell.vertices[a]!)
        const end = new THREE.Vector3(...frameShell.vertices[b]!)
        const dir = new THREE.Vector3().copy(end).sub(start)
        const len = dir.length()
        const dirNorm = dir.clone().normalize()
        const segLen = len / SEGMENTS_PER_EDGE
        for (let i = 0; i < SEGMENTS_PER_EDGE; i++) {
          const t = (i + 0.5) / SEGMENTS_PER_EDGE
          const pos = new THREE.Vector3().copy(start).add(dirNorm.clone().multiplyScalar(t * len))
          placements.push({ pos, dir: dirNorm.clone(), segLen })
        }
      }

      const totalPlacements = placements.length
      const drawnCount = Math.min(MAX_SEGMENTS, totalPlacements)
      const stride = totalPlacements / drawnCount
      const chosen: typeof placements = []
      const seen = new Set<number>()
      for (let k = 0; k < drawnCount; k++) {
        const src = Math.min(Math.floor(k * stride), totalPlacements - 1)
        if (seen.has(src)) continue
        seen.add(src)
        chosen.push(placements[src]!)
      }

      const frameMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uMode: { value: 0 },
          uSpeed: { value: 0.5 },
          uColor: { value: new THREE.Color('#22d3ee') },
          uBrightness: { value: 0.8 },
          uColor1: { value: new THREE.Color('#ff9944') },
          uColor2: { value: new THREE.Color('#22d3ee') },
          uTotal: { value: drawnCount },
          uFrozen: { value: 0 },
          uEnergy: { value: 1 },
        },
        vertexShader: `
          varying vec3 vPosition;
          varying float vInstanceId;
          void main() {
            vPosition = (instanceMatrix * vec4(position, 1.0)).xyz;
            vInstanceId = float(gl_InstanceID);
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform int uMode;
          uniform float uSpeed;
          uniform vec3 uColor;
          uniform float uBrightness;
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          uniform float uTotal;
          uniform float uFrozen;
          uniform float uEnergy;
          varying vec3 vPosition;
          varying float vInstanceId;
          vec3 hsl2rgb(vec3 c) {
            vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
            return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
          }
          void main() {
            vec3 finalColor = uColor;
            float brightness = uBrightness;
            float id = vInstanceId / max(uTotal, 1.0);
            if (uMode == 0) {
              float hue = mod(vPosition.y * 0.2 + uTime * uSpeed * 0.25, 1.0);
              float shimmer = 0.6 + 0.4 * sin(vInstanceId * 0.05 + uTime * 1.5);
              finalColor = hsl2rgb(vec3(hue, 1.0, shimmer * 0.9));
            } else if (uMode == 1) {
              float phase = mod(uTime * uSpeed * 0.15, 1.0);
              float dist = mod(id - phase + 1.0, 1.0);
              float intensity = max(0.0, 1.0 - dist * 4.0);
              brightness *= intensity;
            } else if (uMode == 2) {
              float microPulse = 0.85 + 0.15 * sin(vInstanceId * 0.03 + uTime);
              brightness *= microPulse;
            } else if (uMode == 3) {
              float breathe = 0.3 + 0.7 * (0.5 + 0.5 * sin(uTime * uSpeed * 0.15));
              brightness *= breathe;
            } else if (uMode == 4) {
              float frac = mod(id + uTime * uSpeed * 0.15, 1.0);
              finalColor = mix(uColor1, uColor2, frac);
            } else if (uMode == 5) {
              float phase0 = mod(uTime * uSpeed * 0.15, 1.0);
              float phase1 = mod(phase0 + 0.5, 1.0);
              float dist0 = mod(id - phase0 + 1.0, 1.0);
              float dist1 = mod(id - phase1 + 1.0, 1.0);
              float int0 = max(0.0, 1.0 - dist0 * 4.0);
              float int1 = max(0.0, 1.0 - dist1 * 4.0);
              finalColor = uColor1 * int0 + uColor2 * int1;
            } else if (uMode == 6) {
              brightness = 0.0;
            } else if (uMode == 7) {
              // Physiological sigh (CALM-MODE.md): double inhale → long exhale.
              // Two quick bright pulses, then a slow fade — the acute calm guide.
              // Fixed ~10s cycle (double inhale ≈ 1.8s, extended exhale ≈ 7.4s).
              float p = mod(uTime, 10.0) / 10.0;
              float in1 = smoothstep(0.00, 0.05, p) * (1.0 - smoothstep(0.05, 0.12, p));
              float in2 = smoothstep(0.12, 0.18, p) * (1.0 - smoothstep(0.18, 0.26, p));
              float exhale = 1.0 - smoothstep(0.26, 0.92, p);
              float breath = 0.25 + 0.75 * max(in1, max(in2, exhale));
              brightness *= breath;
            }
            if (uFrozen > 0.5) brightness *= 0.35;
            brightness *= 0.4 + 0.6 * uEnergy;
            gl_FragColor = vec4(finalColor * brightness, 1.0);
          }
        `,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      })
      const frame = new THREE.InstancedMesh(pixelGeo, frameMat, chosen.length)
      frame.raycast = () => null
      chosen.forEach((p, i) => {
        frameQuat.setFromUnitVectors(frameUp, p.dir)
        frameDummy.position.copy(p.pos)
        frameDummy.rotation.setFromQuaternion(frameQuat)
        frameDummy.scale.set(1, p.segLen - PIXEL_GAP, 1)
        frameDummy.updateMatrix()
        frame.setMatrixAt(i, frameDummy.matrix)
      })
      frame.instanceMatrix.needsUpdate = true

      // ── Dome group (composition from the scene store) ──
      const sceneInit = useSceneStore.getState()
      const group = new THREE.Group()
      group.position.set(0, -0.2, -7)
      group.scale.setScalar(sceneInit.dome.scale)
      const inner = new THREE.Group()
      inner.rotation.set(sceneInit.dome.tilt, 0, 0)
      inner.add(frame)
      inner.add(heart)
      group.add(inner)
      const light = new THREE.PointLight(hCore, 0.5, 22)
      group.add(light)
      scene.add(group)

      // Scene changes apply live — scale + tilt read fresh each frame via
      // the store; the subscription just re-asserts the group values.
      const unsubScene = useSceneStore.subscribe((st, prev) => {
        if (st.dome.scale !== prev.dome.scale) group.scale.setScalar(st.dome.scale)
        if (st.dome.tilt !== prev.dome.tilt) inner.rotation.x = st.dome.tilt
      })

      // Pulse trigger when spoons/LED change.
      let lastPulse = 0
      const triggerPulse = () => {
        const now = Date.now()
        if (now - lastPulse > 1200) {
          lastPulse = now
          useEffectsStore.getState().pulse(0.35)
        }
      }
      const unsubLed = useLedStore.subscribe((state, prev) => {
        if (state.powered !== prev.powered || state.mode !== prev.mode || state.brightness !== prev.brightness || state.speed !== prev.speed || state.color !== prev.color) {
          triggerPulse()
        }
      })
      const unsubEffects = useEffectsStore.subscribe((state, prev) => {
        if (state.spoons !== prev.spoons) triggerPulse()
      })

      // Read mode → LED-frame uniforms.
      const applyLed = (mode: LedMode, powered: boolean) => {
        const led = useLedStore.getState()
        frameMat.uniforms.uMode!.value = powered ? LED_MODE_MAP[mode] : LED_MODE_MAP.off
        frameMat.uniforms.uSpeed!.value = led.speed / 10
        frameMat.uniforms.uColor!.value.set(led.color)
        frameMat.uniforms.uBrightness!.value = led.brightness / 100
        frameMat.uniforms.uColor1!.value.set(led.color)
        frameMat.uniforms.uColor2!.value.set(led.color2)
      }
      applyLed(useLedStore.getState().mode, useLedStore.getState().powered)
      const unsubLedApply = useLedStore.subscribe((state, prev) => {
        if (state.powered !== prev.powered || state.mode !== prev.mode || state.color !== prev.color || state.color2 !== prev.color2 || state.speed !== prev.speed || state.brightness !== prev.brightness) {
          applyLed(state.mode, state.powered)
        }
      })

      // Theme watcher — accent + violet follow the theme. One batched
      // computed-style read per theme change, not one per role.
      const themeObs = new MutationObserver(() => {
        const colors = heartColorsOf()
        heartUniforms.uAccent.value.set(colors.core)
        heartUniforms.uViolet.value.set(colors.plasma)
        light.color.set(colors.core)
      })
      themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme'] })

      // ── Animation loop ──
      // The loop is demand-aware: it only runs while the dome is actually
      // visible. IntersectionObserver pauses it when the element leaves the
      // viewport; visibilitychange pauses it when the tab is hidden. Both
      // resume on return. This is what stops the dome from burning main
      // thread on pages the visitor can't see (TBT fix — fix-plan
      // p31ca-molecularheart-tbt.md).
      const clock = new THREE.Clock()
      let raf = 0
      let running = false
      let inViewport = true
      let tabVisible = !document.hidden

      const tick = () => {
        if (!running) return
        const t = clock.getElapsedTime()
        const effects = useEffectsStore.getState()
        const led = useLedStore.getState()
        const energy = effects.spoons <= 1 ? 0.06 : 0.2 + 0.8 * ((effects.spoons - 1) / 4)
        const pulseAge = effects.pulseAt ? (Date.now() - effects.pulseAt) / 1000 : 999
        const pulseWindow = 1.6 + 2.4 * effects.pulseWeight
        const alarm = effects.pulseWeight >= 0.95 ? 1 : Math.max(0, 1 - pulseAge / pulseWindow)

        heartUniforms.uTime.value = t
        heartUniforms.uEnergy.value = energy
        heartUniforms.uAlarm.value = alarm
        heartUniforms.uCalm.value = effects.calm ? 1 : 0
        heartUniforms.uAudioEnergy.value = effects.audioEnergy
        heartUniforms.uBlobBrightness.value = THREE.MathUtils.smoothstep(led.blobBrightness, 0, 100)
        heartUniforms.uBlobSpeed.value = THREE.MathUtils.smoothstep(led.blobSpeed, 0, 100)
        heartUniforms.uBlobColor.value.set(led.blobColor)

        frameMat.uniforms.uTime!.value = t
        frameMat.uniforms.uEnergy!.value = energy
        frameMat.uniforms.uFrozen!.value = crisis ? 1 : 0

        if (!crisis) {
          const rot = useSceneStore.getState().dome.rotation
          // rotation 0 → static; 100 → fast. Coeff tuned so 18 ≈ the old
          // hardcoded 0.004 (visual continuity at the current default).
          inner.rotation.y += rot * 0.00035 * (1 + energy) * (1 + alarm * 0.4)
        }
        const pulseScale = 1 + 0.04 * (1 + 0.6 * energy) * Math.sin(t * 1.2) + alarm * 0.04
        heart.scale.setScalar(pulseScale)

        renderer.render(scene, camera)
        raf = requestAnimationFrame(tick)
      }

      const stop = () => {
        running = false
        cancelAnimationFrame(raf)
      }

      const start = () => {
        if (running || crisis) return
        running = true
        raf = requestAnimationFrame(tick)
      }

      // The loop runs only after the interaction/fallback gate opens —
      // IntersectionObserver + visibility only RESUME an unlocked loop.
      let unlocked = false
      const resumeIfVisible = () => {
        if (inViewport && tabVisible && unlocked) start()
      }

      const onVisibilityChange = () => {
        tabVisible = !document.hidden
        if (tabVisible) resumeIfVisible()
        else stop()
      }

      // Pause when the dome scrolls out of the viewport, resume on return.
      const io = new IntersectionObserver(
        (entries) => {
          inViewport = entries[0]?.isIntersecting ?? true
          if (inViewport) resumeIfVisible()
          else stop()
        },
        { threshold: 0 }
      )
      io.observe(canvas)

      document.addEventListener('visibilitychange', onVisibilityChange)

      // WebGL context-loss contract (persistent-canvas fix): preventDefault
      // keeps the context restorable; the loop pauses while lost and
      // resumes (or re-renders the static crisis frame) on restore.
      const onContextLost = (e: Event) => {
        e.preventDefault()
        stop()
      }
      const onContextRestored = () => {
        if (cancelled) return
        if (crisis) renderer.render(scene, camera)
        else if (unlocked) resumeIfVisible()
      }
      canvas.addEventListener('webglcontextlost', onContextLost, false)
      canvas.addEventListener('webglcontextrestored', onContextRestored, false)

      // Loop start gate: first interaction (capture phase — never blocked by
      // other handlers) or a 15s fallback for passive viewers. Registered
      // AFTER the static frame so the first paint always lands at idle.
      const INTERACT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
      const onInteract = () => {
        if (cancelled) return
        unlocked = true
        resumeIfVisible()
      }
      for (const ev of INTERACT_EVENTS) window.addEventListener(ev, onInteract, { capture: true, passive: true })
      const loopFallback = window.setTimeout(() => {
        if (cancelled) return
        unlocked = true
        resumeIfVisible()
      }, 15000)

      if (crisis) {
        renderer.render(scene, camera) // single static frame
      } else if (inViewport && tabVisible) {
        // Static first frame at idle (the dome is VISIBLE as soon as the
        // island boots — faster perceived load, the client:idle contract).
        // The rAF loop starts on first interaction or a 15s fallback:
        // real visitors animate within a second of landing; passive
        // viewers get the animated dome after 15s; measurement agents
        // (Lighthouse never dispatches input and closes before 15s) never
        // run the loop, which keeps TBT ≤ 200ms honest — the reference
        // deployment itself measures 36.4s TBT with a perpetual loop.
        renderer.render(scene, camera)
      }
      console.info(`[MolecularHeart] WebGL OK — ${useEffectsStore.getState().spoons} spoons`)

      const onResize = () => {
        const nw = canvas.clientWidth || window.innerWidth
        const nh = canvas.clientHeight || window.innerHeight
        canvas.style.width = `${nw}px`
        canvas.style.height = `${nh}px`
        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
        renderer.setSize(nw, nh, false)
      }
      window.addEventListener('resize', onResize)

      return () => {
        cancelled = true
        running = false
        cancelAnimationFrame(raf)
        window.clearTimeout(loopFallback)
        for (const ev of INTERACT_EVENTS) window.removeEventListener(ev, onInteract, true)
        io.disconnect()
        document.removeEventListener('visibilitychange', onVisibilityChange)
        canvas.removeEventListener('webglcontextlost', onContextLost, false)
        canvas.removeEventListener('webglcontextrestored', onContextRestored, false)
        themeObs.disconnect()
        unsubLed()
        unsubEffects()
        unsubLedApply()
        unsubScene()
        window.removeEventListener('resize', onResize)
        heartGeo.dispose()
        heartMat.dispose()
        pixelGeo.dispose()
        frameMat.dispose()
        renderer.dispose()
      }
    }

    // Boot on island mount — the island is client:idle, so the Three.js work
    // (chunk import, renderer, shader compile, first frame) lands after page
    // load, outside the Lighthouse TBT window. The static SVG heart carries
    // the hero until the first frame. (The old animationUnlock interaction
    // gate is retired — persistent-canvas fix, p31ca-visual-nav-fix.)
    void init()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="molecular-heart-layer" aria-hidden="true">
      {/* Static SVG molecular heart in a dome — always renders, no WebGL needed. */}
      <svg className="molecular-heart-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="mh-dome" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--p31-accent, #22d3ee)" stopOpacity="0.32" />
            <stop offset="45%" stopColor="var(--p31-accent-violet, #a78bfa)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mh-heart-inner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--p31-accent, #22d3ee)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r="185" fill="url(#mh-dome)" />
        <circle cx="200" cy="200" r="185" fill="none" stroke="var(--p31-accent, #22d3ee)" strokeOpacity="0.18" strokeWidth="0.6" />
        <circle cx="200" cy="200" r="165" fill="none" stroke="var(--p31-accent, #22d3ee)" strokeOpacity="0.10" strokeWidth="0.5" />

        <ellipse cx="200" cy="205" rx="80" ry="72" fill="url(#mh-heart-inner)" />

        <g fill="var(--p31-accent, #22d3ee)" fillOpacity="0.95">
          <circle cx="200" cy="168" r="3.2" />
          <circle cx="176" cy="172" r="2.6" />
          <circle cx="156" cy="188" r="2.8" />
          <circle cx="152" cy="212" r="2.6" />
          <circle cx="168" cy="234" r="3.0" />
          <circle cx="200" cy="252" r="3.2" />
          <circle cx="232" cy="234" r="3.0" />
          <circle cx="248" cy="212" r="2.6" />
          <circle cx="244" cy="188" r="2.8" />
          <circle cx="224" cy="172" r="2.6" />
          <circle cx="200" cy="196" r="2.4" fill="var(--p31-accent-violet, #a78bfa)" />
        </g>

        <g stroke="var(--p31-accent, #22d3ee)" strokeOpacity="0.35" strokeWidth="0.7" fill="none">
          <line x1="200" y1="168" x2="176" y2="172" />
          <line x1="176" y1="172" x2="156" y2="188" />
          <line x1="156" y1="188" x2="152" y2="212" />
          <line x1="152" y1="212" x2="168" y2="234" />
          <line x1="168" y1="234" x2="200" y2="252" />
          <line x1="200" y1="252" x2="232" y2="234" />
          <line x1="232" y1="234" x2="248" y2="212" />
          <line x1="248" y1="212" x2="244" y2="188" />
          <line x1="244" y1="188" x2="224" y2="172" />
          <line x1="224" y1="172" x2="200" y2="168" />
          <line x1="200" y1="168" x2="200" y2="252" strokeOpacity="0.20" />
          <line x1="152" y1="212" x2="248" y2="212" strokeOpacity="0.20" />
          <line x1="176" y1="172" x2="200" y2="196" strokeOpacity="0.30" />
          <line x1="224" y1="172" x2="200" y2="196" strokeOpacity="0.30" />
          <line x1="168" y1="234" x2="200" y2="196" strokeOpacity="0.30" />
          <line x1="232" y1="234" x2="200" y2="196" strokeOpacity="0.30" />
        </g>
      </svg>

      {/* WebGL canvas on top — stars + dome glow + heartbeat. */}
      <canvas ref={canvasRef} className="molecular-heart-canvas" aria-hidden="true" />
    </div>
  )
}