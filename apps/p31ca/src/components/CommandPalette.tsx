import React, { useEffect, useMemo, useRef, useState } from 'react'
import { searchCommands, groupByKind, KIND_LABELS, type Command } from '../lib/commandSearch'
import { classifyLumiIntent, LUMI_SUGGESTIONS, type LumiProposal } from '../lib/lumiIntent'
import { useLedStore, type LedMode } from '../stores/ledStore'
import { useEffectsStore } from '../stores/effectsStore'
import { yieldToMain } from '../lib/yieldToMain'

/**
 * CommandPalette — the bottom-left floating command surface.
 *
 * A persistent FAB (bottom-left, mirroring the LED controller bottom-right)
 * opens a keyboard-first palette with two modes:
 *   1. Navigate — filter the 11 atoms + lab items + 6 portals; Enter navigates
 *   2. Ask LUMI — the natural-language scene command (LUMI proposes, you decide)
 *
 * ⌘K / Ctrl+K toggles. Escape closes. Arrow keys + Enter for search. Respects
 * reduced-motion and reduced-transparency.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [mode, setMode] = useState<'search' | 'lumi'>('search')
  const [lumiResult, setLumiResult] = useState<{ ok: boolean; text: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        // INP: opening the palette mounts the full panel (tabs, results,
        // LUMI chips) — yield a frame so the keydown's pressed state paints
        // before the mount chunk. Same pattern as CanonTopbar theme cycle.
        void yieldToMain().then(() => setOpen((v) => !v))
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setMode('search')
      setLumiResult(null)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const results = useMemo(
    () => (mode === 'search' ? searchCommands(query) : []),
    [query, mode],
  )
  const groups = useMemo(() => groupByKind(results), [results])

  function navigate(cmd: Command) {
    if (!cmd.href) return
    if (cmd.href.startsWith('http')) window.open(cmd.href, '_blank', 'noopener')
    else window.location.href = cmd.href
    setOpen(false)
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (mode === 'search') {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = results[activeIndex]
        if (cmd) navigate(cmd)
      }
    } else if (mode === 'lumi' && e.key === 'Enter') {
      e.preventDefault()
      runLumi()
    }
  }

  function runLumi() {
    const q = query.trim()
    if (!q) return
    const proposal = classifyLumiIntent(q)
    if (!proposal) {
      setLumiResult({ ok: false, text: 'LUMI could not propose anything for that.' })
      return
    }
    applyProposal(proposal)
    setLumiResult({ ok: true, text: `✓ ${proposal.confirm}` })
  }

  function applyProposal(p: LumiProposal) {
    const led = useLedStore.getState()
    const effects = useEffectsStore.getState()
    switch (p.action) {
      case 'setLedMode': led.setMode(p.value as LedMode); break
      case 'setSpoonLevel': effects.setSpoons(Number(p.value)); break
      case 'toggleAutoMode': effects.setAutoMode(Boolean(p.value)); break
      case 'toggleAudioReactive': effects.setAudioEnergy(effects.audioEnergy > 0.01 ? 0 : 0.6); break
      case 'setBlobBrightness': led.setBlobBrightness(Number(p.value)); break
      case 'setBlobSpeed': led.setBlobSpeed(Number(p.value)); break
      case 'setBlobColor': led.setBlobColor(String(p.value)); break
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="command-fab"
        onClick={() => {
          // INP: same mount cost as the ⌘K path — yield a frame so the
          // click's pressed state paints before the panel renders.
          void yieldToMain().then(() => setOpen(true))
        }}
        aria-label="Open command palette (⌘K)"
        title="Command palette (⌘K)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
        </svg>
        <span className="command-fab__label">Command</span>
        <span className="command-fab__kbd">⌘K</span>
      </button>
    )
  }

  return (
    <div className="command-overlay" role="presentation">
      <div ref={panelRef} className="command-panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="command-panel__head">
          <div className="command-panel__tabs" role="tablist" aria-label="Mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'search'}
              className={`command-tab${mode === 'search' ? ' is-active' : ''}`}
              onClick={() => { setMode('search'); inputRef.current?.focus() }}
            >
              Navigate
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'lumi'}
              className={`command-tab${mode === 'lumi' ? ' is-active' : ''}`}
              onClick={() => { setMode('lumi'); inputRef.current?.focus() }}
            >
              Ask LUMI
            </button>
          </div>
          <button type="button" className="command-panel__close" onClick={() => setOpen(false)} aria-label="Close">×</button>
        </div>

        <input
          ref={inputRef}
          type="text"
          className="command-panel__input"
          value={query}
          onChange={(e) => {
            // INP: each keystroke re-filters the whole results list — yield
            // a frame first so the keystroke paints before the re-render
            // chunk (the harness measured this surface at p75 ≈1072 ms lab).
            const next = e.target.value
            void yieldToMain().then(() => { setQuery(next); setActiveIndex(0) })
          }}
          onKeyDown={onInputKey}
          placeholder={mode === 'search' ? 'Type a destination…' : 'Tell LUMI what to do…'}
          aria-label={mode === 'search' ? 'Search destinations' : 'Ask LUMI'}
          autoComplete="off"
          spellCheck={false}
        />

        {mode === 'search' && (
          <div className="command-panel__results" role="listbox" aria-label="Results">
            {results.length === 0 && <p className="command-empty">No match for “{query}”.</p>}
            {(['atom', 'lab', 'portal'] as const).map((kind) => {
              const items = groups[kind]
              if (items.length === 0) return null
              return (
                <div key={kind} className="command-group">
                  <div className="command-group__label">{KIND_LABELS[kind]}</div>
                  {items.map((cmd) => {
                    const idx = results.indexOf(cmd)
                    const active = idx === activeIndex
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`command-item${active ? ' is-active' : ''}`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => navigate(cmd)}
                      >
                        <span className="command-item__label">{cmd.label}</span>
                        <span className="command-item__hint">{cmd.hint}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {mode === 'lumi' && (
          <div className="command-panel__lumi">
            {lumiResult ? (
              <p className={`command-lumi__result${lumiResult.ok ? ' is-ok' : ' is-err'}`} role="status">
                {lumiResult.text}
              </p>
            ) : (
              <>
                <p className="command-lumi__hint">LUMI proposes, you decide. Try:</p>
                <div className="command-lumi__chips">
                  {LUMI_SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="command-chip" onClick={() => setQuery(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="command-panel__foot">
          <span className="command-foot__hint">
            <kbd>↑</kbd><kbd>↓</kbd> navigate · <kbd>↵</kbd> select · <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}