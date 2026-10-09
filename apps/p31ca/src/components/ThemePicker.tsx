import React, { useEffect, useState } from 'react'
import { ENVIRONMENTS, ENVIRONMENT_IDS, type EnvironmentId } from '../lib/themeEnvironments'
import { useThemeStore } from '@p31ca/shell-chrome/stores'

/**
 * ThemePicker — live environment thumbnails.
 *
 * Each thumbnail is a mini hull + heart drawn in that theme's role tokens,
 * so you pick the *place*, not a color swatch. Replaces the color-dot cycle.
 */
export default function ThemePicker() {
  const [current, setCurrent] = useState<string>('ocean')

  useEffect(() => {
    setCurrent(useThemeStore.getState().theme)
    const unsub = useThemeStore.subscribe((s) => setCurrent(s.theme))
    return () => unsub()
  }, [])

  function pick(id: EnvironmentId) {
    const store = useThemeStore.getState()
    const setTheme = (store as unknown as { setTheme?: (id: string) => void }).setTheme
    if (typeof setTheme === 'function') {
      setTheme(id)
    } else {
      localStorage.setItem('p31:theme', id)
      document.documentElement.setAttribute('data-theme', id)
    }
    setCurrent(id)
  }

  return (
    <div className="theme-picker" role="radiogroup" aria-label="Environment">
      <div className="theme-picker__label">ENVIRONMENT</div>
      <div className="theme-picker__grid">
        {ENVIRONMENT_IDS.map((id) => {
          const env = ENVIRONMENTS[id]
          const active = current === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`theme-thumb${active ? ' is-active' : ''}`}
              onClick={() => pick(id)}
              title={env.label}
            >
              <svg viewBox="0 0 60 60" className="theme-thumb__svg" aria-hidden="true">
                <circle cx="30" cy="30" r="26" fill="none" stroke={env.hull} strokeOpacity="0.35" strokeWidth="0.6" />
                <g stroke={env.hull} strokeOpacity="0.55" strokeWidth="0.4" fill="none">
                  <line x1="14" y1="20" x2="30" y2="10" />
                  <line x1="30" y1="10" x2="46" y2="20" />
                  <line x1="14" y1="20" x2="14" y2="40" />
                  <line x1="46" y1="20" x2="46" y2="40" />
                  <line x1="14" y1="40" x2="30" y2="50" />
                  <line x1="46" y1="40" x2="30" y2="50" />
                  <line x1="14" y1="20" x2="30" y2="30" />
                  <line x1="46" y1="20" x2="30" y2="30" />
                  <line x1="14" y1="40" x2="30" y2="30" />
                  <line x1="46" y1="40" x2="30" y2="30" />
                </g>
                <circle cx="30" cy="31" r="6" fill={env.heartCore} fillOpacity="0.7" />
                <circle cx="30" cy="31" r="10" fill={env.heartPlasma} fillOpacity="0.2" />
              </svg>
              <span className="theme-thumb__label">{env.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}