import React, { useEffect, useRef } from 'react'
import { DESTINATIONS } from '../../lib/portalRouter'
import { useMenuStore } from '../../stores/menuStore'
import { yieldToMain } from '../../lib/yieldToMain'

/**
 * JourneyNav — self-contained cross-portal dropdown.
 *
 * Sections (per the nav-consolidation decision, 2026-10-12):
 *   Hub → the hub's own journey page
 *   PRODUCTS → the 7 product surfaces (formerly the tier-2 ProductRow strip;
 *              merged here so cross-product travel lives in ONE menu)
 *   DOORS → the six portalRouter destinations (cross-portal travel)
 *
 * All positioning is inline (works on every page without a page-scoped
 * stylesheet). Registers with menuStore so opening Journey closes the act
 * menus and the overflow — the single-open discipline.
 */

/** The product surfaces — formerly ProductRow.astro (retired, kept on disk
 *  per the no-delete rule). One source now, rendered as the menu's
 *  middle section. NOTE: Workspace lives in the DOORS section (portalRouter
 *  DESTINATIONS) — it was listed here too, which rendered the destination
 *  twice in one dropdown (owner-reported double entry). */
const PRODUCTS = [
  { label: 'Marketplace', href: 'https://p31-portal-mcp-marketplace.pages.dev' },
  { label: 'Design', href: 'https://design.p31ca.org' },
  { label: 'PHOS', href: 'https://phos.p31ca.org' },
  { label: 'Bonding', href: 'https://bonding.p31ca.org' },
  { label: 'Nonprofit', href: 'https://phosphorus31.org' },
  { label: 'Status', href: 'https://status.p31ca.org' },
]

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--p31-text-tertiary, #71717a)',
  padding: '6px 10px 2px',
}

const JourneyNav: React.FC<{ current?: string }> = ({ current }) => {
  const openMenuId = useMenuStore((s) => s.openMenuId)
  const toggleMenu = useMenuStore((s) => s.toggleMenu)
  const closeMenu = useMenuStore((s) => s.closeMenu)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const open = openMenuId === 'journey'

  useEffect(() => {
    if (!open) return
    // AbortController + astro:after-swap pattern (same as CanonTopbar):
    // ClientRouter swaps discard non-persisted islands without unmounting
    // React, so a removed JourneyNav's mousedown listener would leak and
    // could close the next island's freshly-opened dropdown.
    const ac = new AbortController()
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeMenu()
    }
    document.addEventListener('mousedown', onDoc, { signal: ac.signal })
    const onSwap = () => {
      if (wrapRef.current && !wrapRef.current.isConnected) ac.abort()
    }
    document.addEventListener('astro:after-swap', onSwap)
    return () => {
      ac.abort()
      document.removeEventListener('astro:after-swap', onSwap)
    }
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
        onClick={() => {
          // INP: the journey panel renders 7 product links + 6 door links —
          // yield a frame so the button's pressed state paints first.
          void yieldToMain().then(() => toggleMenu('journey'))
        }}
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

          <div style={sectionLabelStyle}>Products</div>
          {PRODUCTS.map((p) => (
            <a
              key={p.label}
              role="menuitem"
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              style={itemStyle}
              onClick={closeMenu}
            >
              <span aria-hidden="true" style={{ opacity: 0.8, fontSize: 10 }}>◆</span> {p.label}
            </a>
          ))}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 4px' }} />
          <div style={sectionLabelStyle}>Doors</div>
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