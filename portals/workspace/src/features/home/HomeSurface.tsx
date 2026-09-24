import { useWorkspaceStore } from '@/store/workspaceStore'
import { useModeGate } from '@/hooks/useModeGate'
import { MCP_TOOLS } from '@/lib/mcpTools'
import { ROUTES } from '@/lib/routes'
import { roster } from '@/lib/pickleNames'
import { resolveProfile } from '@/lib/profile'
import type { SurfaceId } from '@/types'

type SurfaceCardId = Exclude<SurfaceId, 'home' | 'profile' | 'identity'>

const CARD_META: Record<SurfaceCardId, { desc: string; iconBg: string; icon: string }> = {
  docs: { desc: 'Collaborative rich-text document editing with live presence hints and outlines.', iconBg: 'color-mix(in oklch, var(--p31-accent-cyan) 15%, transparent)', icon: '📄' },
  sheets: { desc: 'Spreadsheet matrix with formula evaluation, cell grid selection, and frozen headers.', iconBg: 'color-mix(in oklch, var(--p31-accent-green) 15%, transparent)', icon: '📊' },
  slides: { desc: 'Slide deck creation and full-screen presenter display mode for family showcases.', iconBg: 'color-mix(in oklch, var(--p31-accent-violet) 15%, transparent)', icon: '📽️' },
  calendar: { desc: 'Month grid and day inspector for tracking family events and schedules.', iconBg: 'color-mix(in oklch, var(--p31-accent-gold) 15%, transparent)', icon: '📅' },
  mail: { desc: 'JMAP-style three-pane email reader and composer for calm asynchronous communication.', iconBg: 'color-mix(in oklch, var(--p31-accent-iris) 15%, transparent)', icon: '✉️' },
  drive: { desc: 'Self-hosted local file storage, file grid card views, and inspector detail preview.', iconBg: 'color-mix(in oklch, var(--p31-accent-red) 15%, transparent)', icon: '📁' },
}

export function HomeSurface() {
  const { navigate } = useModeGate()
  const mode = useWorkspaceStore((s) => s.mode)
  const spoons = useWorkspaceStore((s) => s.spoons)
  const activeMemberId = useWorkspaceStore((s) => s.activeMemberId)
  const profiles = useWorkspaceStore((s) => s.profiles)
  const family = roster()
  const resolved = family.map((m) => resolveProfile(m.id, m.emoji, profiles[m.id]))
  const active = resolved.find((p) => p.id === activeMemberId) ?? resolved[0]!
  // Deterministic family-balance from the roster seed — not a hardcoded figure.
  const love = 1000 + (hashOfRoster() % 1000)

  const surfaceRoutes = ROUTES.filter((r) => r.id !== 'home' && r.id !== 'profile' && r.id !== 'identity') as Array<{ id: SurfaceCardId } & (typeof ROUTES)[number]>
  const calmFloor = spoons === 0

  return (
    <section className="surface-panel active" data-mcp-tool={MCP_TOOLS.home} aria-label="Home launcher">
      <div className="home-container">
        <div className="home-hero">
          <div>
            <h1 className="greeting-h1">Good {timeOfDay()}, {active.greetingName}</h1>
            <p style={{ color: 'var(--p31-cloud)' }}>
              Welcome to your family&apos;s private workspace. Local, calm, device-first.
            </p>
          </div>

          <div className="family-strip">
            <div className="family-avatars">
              {resolved.map((p) => (
                <div key={p.id} className={`family-avatar ${p.id === active.id ? 'active' : ''}`} data-accent={p.accent} aria-label={p.greetingName} title={p.greetingName}>
                  {p.emoji}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--p31-cloud)' }}>FAMILY BALANCE</div>
              <div className="love-chip">♥ {love.toLocaleString()} LOVE</div>
            </div>
          </div>
        </div>

        {calmFloor ? (
          <div className="home-floor" data-mcp-tool="homeCalmFloor" data-mcp-state="ready">
            <p style={{ color: 'var(--p31-text-secondary)' }}>
              Spoon 0 — a rest stop. The surfaces wait; you don&apos;t have to.
            </p>
          </div>
        ) : (
          <div className="launcher-grid">
            {surfaceRoutes.map((route) => {
              const meta = CARD_META[route.id]
              const locked = route.requiresMode === 'maker' && mode === 'spark'
              return (
                <button
                  key={route.id}
                  type="button"
                  className="surface-card"
                  data-mcp-tool={MCP_TOOLS[route.id]}
                  data-mcp-state={locked ? 'locked' : 'ready'}
                  onClick={() => navigate(route.id)}
                  aria-label={`Open ${route.label}${locked ? ' (locked)' : ''}`}
                >
                  <div className="surface-card-header">
                    <div className="surface-card-icon" style={{ background: meta.iconBg }}>{meta.icon}</div>
                    <span className={`badge badge-${route.badge}`}>
                      {route.badge.toUpperCase()}{locked ? ' 🔒' : ''}
                    </span>
                  </div>
                  <h3 className="surface-card-title">{route.label}</h3>
                  <p className="surface-card-desc">{meta.desc}</p>
                </button>
              )
            })}
            <button
              type="button"
              className="surface-card"
              data-mcp-tool="identitySurface"
              data-mcp-state="ready"
              onClick={() => { window.location.hash = '#/identity' }}
              aria-label="Open Passports"
            >
              <div className="surface-card-header">
                <div className="surface-card-icon" style={{ background: 'color-mix(in oklch, var(--p31-accent-green) 15%, transparent)' }}>🛂</div>
                <span className="badge badge-spark">PASSPORTS</span>
              </div>
              <h3 className="surface-card-title">Passports</h3>
              <p className="surface-card-desc">Sovereign DIDs, soulbound tokens, and the family love ledger.</p>
            </button>
            <button
              type="button"
              className="surface-card"
              data-mcp-tool="profileSurface"
              data-mcp-state="ready"
              onClick={() => { window.location.hash = '#/profile' }}
              aria-label="Open Profile"
            >
              <div className="surface-card-header">
                <div className="surface-card-icon" style={{ background: 'color-mix(in oklch, var(--p31-accent-gold) 15%, transparent)' }}>🎭</div>
                <span className="badge badge-spark">PROFILE</span>
              </div>
              <h3 className="surface-card-title">Profile</h3>
              <p className="surface-card-desc">Who is acting, pickle codenames, emoji, accent, and each member&apos;s look.</p>
            </button>
            <button
              type="button"
              className="surface-card"
              data-mcp-tool="setupSurface"
              data-mcp-state="ready"
              onClick={() => { window.location.hash = '#/setup' }}
              aria-label="Open Settings"
            >
              <div className="surface-card-header">
                <div className="surface-card-icon" style={{ background: 'color-mix(in oklch, var(--p31-accent-violet) 15%, transparent)' }}>⚙️</div>
                <span className="badge badge-spark">SETTINGS</span>
              </div>
              <h3 className="surface-card-title">Settings</h3>
              <p className="surface-card-desc">Theme, caregiver PIN, who is acting, and session security.</p>
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function timeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function hashOfRoster(): number {
  let h = 0
  for (const m of roster()) {
    for (let i = 0; i < m.id.length; i++) {
      h = (Math.imul(31, h) + m.id.charCodeAt(i)) | 0
    }
  }
  return Math.abs(h)
}