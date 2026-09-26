import React, { useEffect, useRef, useState } from 'react'
import {
  useLedStore,
  LED_MODES,
  MODE_LABELS,
  MODE_USES_PALETTE,
  LED_PRESETS,
  applyNamedPreset,
  ledPresetToUrl,
  applyPresetFromUrl,
  type LedMode,
} from '../stores/ledStore'
import { useEffectsStore } from '../stores/effectsStore'
import { useSceneStore } from '../stores/sceneStore'
import { SCENE_PRESETS } from '../lib/scenePresets'
import { ENVIRONMENTS, ENVIRONMENT_IDS } from '../lib/themeEnvironments'
import { useThemeStore } from '../stores/themeStore'
import Knob from './controller/Knob'

type Tab = 'led' | 'scene' | 'lumi' | 'env' | 'dev'

/**
 * LedController — the P31 control instrument.
 *
 * Four tabbed pages in one dark, dense panel (the DAW "mission control"
 * aesthetic):
 *   LED    — the lighting board: power, mode segmented control, two rotary
 *            knobs (brightness, speed), color wells, preset bank
 *   SCENE  — dome + starfield composition (rotation, tilt, scale, density,
 *            twinkle, flare) with one-tap scene presets
 *   LUMI   — the natural-language command (proposes → decides)
 *   ENV    — the 9 theme environments as live mini-previews
 *   DEV    — diagnostics: FPS, spoons, LED state, reset actions
 *
 * The closed state is a small chip (bottom-right) that reads the current
 * mode. Opening reveals the full instrument.
 */
export default function LedController() {
  const led = useLedStore()
  const effects = useEffectsStore()
  const scene = useSceneStore()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('led')
  const [pulseFlash, setPulseFlash] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [sceneQuery, setSceneQuery] = useState('')
  const [sceneResult, setSceneResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [fps, setFps] = useState(60)
  const wrapRef = useRef<HTMLDivElement>(null)

  const pulseAt = effects.pulseAt

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('m')) {
      applyPresetFromUrl(window.location.search)
    }
  }, [])

  useEffect(() => {
    if (!pulseAt) return
    setPulseFlash(true)
    const t = setTimeout(() => setPulseFlash(false), 800)
    return () => clearTimeout(t)
  }, [pulseAt])

  // FPS sampler when the DEV tab is open
  useEffect(() => {
    if (!open || tab !== 'dev') return
    let raf = 0
    let frames = 0
    let last = performance.now()
    const loop = () => {
      frames++
      const now = performance.now()
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [open, tab])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const usesPalette = MODE_USES_PALETTE[led.mode] > 0

  // ── Closed chip ──
  if (!open) {
    return (
      <button
        type="button"
        className="devpanel__chip"
        onClick={() => setOpen(true)}
        aria-label="Open control instrument"
      >
        <span
          className={`devpanel__dot${led.powered && led.mode !== 'off' ? ' is-live' : ''}${pulseFlash ? ' is-flash' : ''}`}
          style={{ background: led.powered && led.mode !== 'off' ? led.color : undefined }}
          aria-hidden="true"
        />
        <span className="devpanel__chip__label">LED</span>
        <span className="devpanel__chip__mode">{MODE_LABELS[led.mode]}</span>
      </button>
    )
  }

  async function runScene() {
    const q = sceneQuery.trim()
    if (!q) return
    const { classifyLumiIntent } = await import('../lib/lumiIntent')
    const p = classifyLumiIntent(q)
    if (!p) {
      setSceneResult({ ok: false, text: 'LUMI could not propose that.' })
      return
    }
    const ledStore = useLedStore.getState()
    const fxStore = useEffectsStore.getState()
    switch (p.action) {
      case 'setLedMode': ledStore.setMode(p.value as LedMode); break
      case 'setSpoonLevel': fxStore.setSpoons(Number(p.value)); break
      case 'setBlobBrightness': ledStore.setBlobBrightness(Number(p.value)); break
      case 'setBlobSpeed': ledStore.setBlobSpeed(Number(p.value)); break
      case 'setBlobColor': ledStore.setBlobColor(String(p.value)); break
    }
    setSceneResult({ ok: true, text: `✓ ${p.confirm}` })
  }

  // ── Open instrument ──
  return (
    <div ref={wrapRef} className="devpanel" role="region" aria-label="Control instrument">
      {/* Rack header */}
      <header className="devpanel__head">
        <div className="devpanel__title">
          <span
            className={`devpanel__dot${led.powered && led.mode !== 'off' ? ' is-live' : ''}${pulseFlash ? ' is-flash' : ''}`}
            style={{ background: led.powered && led.mode !== 'off' ? led.color : undefined }}
            aria-hidden="true"
          />
          <span className="devpanel__title__text">P31 · CONTROL</span>
          <span className="devpanel__mode-readout">{MODE_LABELS[led.mode]}</span>
        </div>
        <div className="devpanel__head-actions">
          <button
            type="button"
            className={`devpanel__power${led.powered ? ' is-on' : ''}`}
            onClick={led.togglePowered}
            aria-pressed={led.powered}
          >
            {led.powered ? 'ON' : 'OFF'}
          </button>
          <button type="button" className="devpanel__close" onClick={() => setOpen(false)} aria-label="Close">×</button>
        </div>
      </header>

      {/* Tab rail */}
      <nav className="devpanel__tabs" role="tablist" aria-label="Instrument sections">
        {(['led', 'scene', 'lumi', 'env', 'dev'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`devpanel__tab${tab === t ? ' is-active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* ── LED tab ── */}
      {tab === 'led' && (
        <div className="devpanel__body">
          <section className="devpanel__section">
            <div className="devpanel__section-label">MODE</div>
            <div className="devpanel__seg" role="group" aria-label="LED mode">
              {LED_MODES.map((m: LedMode) => (
                <button
                  key={m}
                  type="button"
                  className={`devpanel__seg-btn${led.mode === m ? ' is-active' : ''}`}
                  onClick={() => led.setMode(m)}
                  aria-pressed={led.mode === m}
                >
                  {MODE_LABELS[m].slice(0, 4)}
                </button>
              ))}
            </div>
          </section>

          <section className="devpanel__section">
            <div className="devpanel__section-label">OUTPUT</div>
            <div className="devpanel__knobs">
              <Knob
                label="BRI"
                value={led.brightness}
                min={0}
                max={100}
                onChange={(v) => led.setBrightness(Math.round(v))}
              />
              <Knob
                label="SPD"
                value={led.speed}
                min={0}
                max={100}
                onChange={(v) => led.setSpeed(Math.round(v))}
              />
              <Knob
                label="BLB"
                value={led.blobBrightness}
                min={0}
                max={100}
                onChange={(v) => led.setBlobBrightness(Math.round(v))}
              />
            </div>
          </section>

          <section className="devpanel__section">
            <div className="devpanel__section-label">COLOR</div>
            <div className="devpanel__colors">
              <label className="devpanel__color" title="Primary">
                <span className="devpanel__color-label">C1</span>
                <input type="color" value={led.color} onChange={(e) => led.setColor(e.target.value)} aria-label="Primary color" />
              </label>
              {usesPalette && (
                <label className="devpanel__color" title="Secondary">
                  <span className="devpanel__color-label">C2</span>
                  <input type="color" value={led.color2} onChange={(e) => led.setColor2(e.target.value)} aria-label="Secondary color" />
                </label>
              )}
              <label className="devpanel__color" title="Heart">
                <span className="devpanel__color-label">HRT</span>
                <input type="color" value={led.blobColor} onChange={(e) => led.setBlobColor(e.target.value)} aria-label="Heart color" />
              </label>
            </div>
          </section>

          <section className="devpanel__section">
            <div className="devpanel__section-label">PRESET BANK</div>
            <div className="devpanel__presets">
              {LED_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="devpanel__preset"
                  onClick={() => {
                    applyNamedPreset(p.id)
                    setMsg(`Preset: ${p.label}`)
                    setTimeout(() => setMsg(null), 1200)
                  }}
                >
                  <span className="devpanel__preset-dot" style={{ background: (p.patch.color as string) || 'var(--p31-accent)' }} />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="devpanel__lcds">
            <LCDDisplay label="BRI" value={String(led.brightness)} />
            <LCDDisplay label="SPD" value={String(led.speed)} />
            <LCDDisplay label="SPOONS" value={String(effects.spoons)} tone="green" />
          </div>
        </div>
      )}

      {/* ── Scene tab ── */}
      {/* ── Scene tab ── */}
      {tab === 'scene' && (
        <div className="devpanel__body">
          <section className="devpanel__section">
            <div className="devpanel__section-label">DOME</div>
            <div className="devpanel__knobs">
              <Knob
                label="ROT"
                value={scene.dome.rotation}
                min={0}
                max={100}
                unit="x"
                onChange={(v) => scene.setRotation(Math.round(v))}
              />
              <Knob
                label="TLT"
                value={scene.dome.tilt}
                min={0}
                max={0.6}
                onChange={(v) => scene.setTilt(v)}
              />
              <Knob
                label="SCL"
                value={scene.dome.scale}
                min={1.0}
                max={2.5}
                onChange={(v) => scene.setScale(v)}
              />
            </div>
          </section>

          <section className="devpanel__section">
            <div className="devpanel__section-label">STARFIELD</div>
            <div className="devpanel__knobs">
              <Knob
                label="DEN"
                value={scene.starfield.density}
                min={60}
                max={500}
                onChange={(v) => scene.setDensity(Math.round(v))}
              />
              <Knob
                label="TWK"
                value={scene.starfield.twinkle}
                min={0}
                max={3}
                onChange={(v) => scene.setTwinkle(v)}
              />
              <Knob
                label="FLR"
                value={scene.starfield.flare}
                min={0}
                max={12}
                onChange={(v) => scene.setFlare(Math.round(v))}
              />
            </div>
          </section>

          <section className="devpanel__section">
            <div className="devpanel__section-label">SCENE PRESET</div>
            <div className="devpanel__presets">
              {SCENE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="devpanel__preset"
                  onClick={() => scene.applyPreset(p.value)}
                >
                  <span
                    className="devpanel__preset-dot"
                    style={{ background: 'linear-gradient(140deg, oklch(0.75 0.14 220), oklch(0.60 0.16 280))' }}
                  />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'lumi' && (
        <div className="devpanel__body">
          <div className="devpanel__scene">
            <div className="devpanel__section-label">LUMI · SCENE COMMAND</div>
            <p className="devpanel__scene-hint">LUMI proposes, you decide. Try:</p>
            <div className="devpanel__scene-chips">
              {['Rainbow mode', 'Pulse the heart', 'Start auto tour', 'Turn off the lights', 'Make it energetic'].map((s) => (
                <button key={s} type="button" className="devpanel__chip-btn" onClick={() => setSceneQuery(s)}>
                  {s}
                </button>
              ))}
            </div>
            <div className="devpanel__scene-input">
              <input
                type="text"
                value={sceneQuery}
                onChange={(e) => setSceneQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void runScene() }}
                placeholder="Tell LUMI what to do…"
                aria-label="Ask LUMI"
              />
              <button type="button" className="devpanel__scene-go" onClick={() => void runScene()}>GO</button>
            </div>
            {sceneResult && (
              <div className={`devpanel__scene-result${sceneResult.ok ? ' is-ok' : ' is-err'}`} role="status">
                {sceneResult.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Env tab ── */}
      {tab === 'env' && (
        <div className="devpanel__body">
          <div className="devpanel__section-label">ENVIRONMENT</div>
          <div className="devpanel__envs">
            {ENVIRONMENT_IDS.map((id) => {
              const env = ENVIRONMENTS[id]
              const currentTheme = useThemeStore.getState().theme
              const active = currentTheme === id
              return (
                <button
                  key={id}
                  type="button"
                  className={`devpanel__env${active ? ' is-active' : ''}`}
                  onClick={() => {
                    const store = useThemeStore.getState() as unknown as { setTheme?: (x: string) => void }
                    if (typeof store.setTheme === 'function') store.setTheme(id)
                    else {
                      localStorage.setItem('p31:theme', id)
                      document.documentElement.setAttribute('data-theme', id)
                    }
                  }}
                >
                  <svg viewBox="0 0 40 40" aria-hidden="true">
                    <circle cx="20" cy="20" r="17" fill="none" stroke={env.hull} strokeOpacity="0.5" strokeWidth="0.7" />
                    <circle cx="20" cy="21" r="4" fill={env.heartCore} fillOpacity="0.7" />
                    <circle cx="20" cy="21" r="7" fill={env.heartPlasma} fillOpacity="0.25" />
                  </svg>
                  <span>{env.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Dev tab ── */}
      {tab === 'dev' && (
        <div className="devpanel__body">
          <section className="devpanel__section">
            <div className="devpanel__section-label">RUNTIME</div>
            <div className="devpanel__lcds">
              <LCDDisplay label="FPS" value={String(fps)} tone={fps >= 50 ? 'green' : fps >= 30 ? 'amber' : 'red'} />
              <LCDDisplay label="SPOONS" value={String(effects.spoons)} />
              <LCDDisplay label="AUDIO" value={String(Math.round(effects.audioEnergy * 100))} tone={effects.audioEnergy > 0 ? 'green' : 'accent'} />
            </div>
          </section>
          <section className="devpanel__section">
            <div className="devpanel__section-label">STORE</div>
            <div className="devpanel__store">
              <div className="devpanel__row"><span>mode</span><code>{led.mode}</code></div>
              <div className="devpanel__row"><span>powered</span><code>{String(led.powered)}</code></div>
              <div className="devpanel__row"><span>brightness</span><code>{led.brightness}</code></div>
              <div className="devpanel__row"><span>speed</span><code>{led.speed}</code></div>
              <div className="devpanel__row"><span>color</span><code>{led.color}</code></div>
              <div className="devpanel__row"><span>auto-mode</span><code>{String(effects.isAutoMode)}</code></div>
            </div>
          </section>
          <section className="devpanel__section">
            <div className="devpanel__section-label">CLEANUP</div>
            <div className="devpanel__actions">
              <button type="button" onClick={led.reset}>RESET LED</button>
              <button type="button" onClick={() => effects.setSpoons(3)}>SPOONS → 3</button>
              <button type="button" onClick={() => { ledPresetToUrl(); setMsg('copied') }}>SHARE</button>
            </div>
          </section>
        </div>
      )}

      {msg && <p className="devpanel__msg" role="status">{msg}</p>}
    </div>
  )
}

function LCDDisplay({ label, value, tone = 'accent' }: { label: string; value: string; tone?: 'accent' | 'green' | 'amber' | 'red' }) {
  return (
    <div className={`lcd lcd--${tone}`}>
      <span className="lcd__label">{label}</span>
      <span className="lcd__value">{value}</span>
    </div>
  )
}