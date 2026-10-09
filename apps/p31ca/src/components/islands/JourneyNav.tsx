import React, { useEffect, useRef } from 'react'
import { DESTINATIONS } from '../../lib/portalRouter'
import { useMenuStore } from '../../stores/menuStore'

/**
 * JourneyNav — self-contained cross-portal dropdown.
 *
 * All positioning is inline (works on every page without a page-scoped
 * stylesheet). Registers with menuStore so opening Journey closes the act
 * menus and the overflow — the single-open discipline.
 */
const JourneyNav: React.FC<{ current?: string }> = ({ current }) => {
  const openMenuId = useMenuStore((s) => s.openMenuId)
  const toggleMenu = useMenuStore((s) => s.toggleMenu)
  const closeMenu = useMenuStore((s) => s.closeMenu)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const open = openMenuId === 'journey'

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeMenu()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, closeMenu])

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 8,
    color: 'var(--p31-text, #e2e8f0)',
    fontSize: 13,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="journey-menu"
        onClick={() => toggleMenu('journey')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          minHeight: 34,
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.10)',
          background: open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
          color: 'var(--p31-text, #e2e8f0)',
          fontSize: 12,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 13 }}>🧭</span>
        <span>Journey</span>
        <span
          aria-hidden="true"
          style={{ fontSize: 9, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease' }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          id="journey-menu"
          role="group"
          aria-label="Journey destinations"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            minWidth: 240,
            padding: 8,
            background: 'rgba(12, 12, 18, 0.98)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 16,
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            zIndex: 2100,
          }}
        >
          <a role="menuitem" href="https://p31ca.org/journey" style={itemStyle} onClick={closeMenu}>
            <span aria-hidden="true">🏠</span> Hub
          </a>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 4px' }} />
          {DESTINATIONS.map((d) => {
            const isCurrent = current === d.id
            return (
              <a
                key={d.id}
                role="menuitem"
                href={d.url}
                target={d.external ? '_blank' : undefined}
                rel={d.external ? 'noopener' : undefined}
                aria-current={isCurrent ? 'page' : undefined}
                style={{ ...itemStyle, background: isCurrent ? 'rgba(0,240,255,0.10)' : 'transparent' }}
                onClick={closeMenu}
              >
                <span aria-hidden="true">{d.icon}</span> {d.label}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default JourneyNav