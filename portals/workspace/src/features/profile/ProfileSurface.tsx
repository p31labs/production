import { useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { roster } from '@/lib/pickleNames'
import {
  ACCENT_OPTIONS,
  EMOJI_OPTIONS,
  nextPickleSeed,
  resolveProfile,
  type ProfileOverrides,
} from '@/lib/profile'
import { useNotifStore } from '@/store/useNotifStore'
import { MCP_TOOLS } from '@/lib/mcpTools'
import { useThemeStore, type ThemeId, type AgeTier } from '@p31/design-core/theming/theme-store'
import type { SpoonLevel } from '@/types'

const WORLD_LABELS: Record<ThemeId, string> = {
  garden: 'Garden',
  ocean: 'Ocean',
  aurora: 'Aurora',
  zen: 'Zen',
  volt: 'Volt',
}

/**
 * ProfileSurface — full per-member customization (#/profile).
 *
 * Who is acting (active member), their pickle codename (re-pickle), emoji,
 * accent, per-member theme, and spoons baseline. Everything resolves through
 * resolveProfile() and persists to versioned localStorage via the store.
 */
export function ProfileSurface() {
  const family = roster()
  const activeMemberId = useWorkspaceStore((s) => s.activeMemberId)
  const setActiveMember = useWorkspaceStore((s) => s.setActiveMember)

  return (
    <section
      className="surface-panel active"
      data-mcp-tool={MCP_TOOLS.profile}
      data-mcp-state="ready"
      aria-label="Profile"
    >
      <div className="home-container">
        <h1 className="greeting-h1">Profile</h1>
        <p style={{ color: 'var(--p31-cloud)' }}>Pickle labels only — customize each family member&apos;s workspace look.</p>

        <div className="profile-member-bar" role="group" aria-label="Who is acting">
          {family.map((m) => {
            const active = m.id === activeMemberId
            return (
              <button
                key={m.id}
                type="button"
                className={`profile-member ${active ? 'active' : ''}`}
                aria-current={active ? 'true' : undefined}
                onClick={() => setActiveMember(m.id)}
              >
                <span aria-hidden="true">{m.emoji}</span>
                <span>{m.pickleName}</span>
                {active && <span className="profile-member__check" aria-label="Active">✓</span>}
              </button>
            )
          })}
        </div>

        <div className="setup-grid">
          <div className="glass-panel setup-panel" key={activeMemberId}>
            <Editor memberId={activeMemberId} />
          </div>
        </div>
      </div>
    </section>
  )
}

function Editor({ memberId }: { memberId: string }) {
  const profiles = useWorkspaceStore((s) => s.profiles)
  const updateProfile = useWorkspaceStore((s) => s.updateProfile)
  const resetProfile = useWorkspaceStore((s) => s.resetProfile)
  const notify = useNotifStore((s) => s.notify)
  const member = roster().find((m) => m.id === memberId)!

  const override = profiles[memberId]
  const resolved = resolveProfile(memberId, member.emoji, override)
  const setTheme = useThemeStore((s) => s.setTheme)
  const setAge = useThemeStore((s) => s.setAge)
  const setMuted = useThemeStore((s) => s.setMuted)
  const setWarmLight = useThemeStore((s) => s.setWarmLight)

  const patch = (p: ProfileOverrides) => updateProfile(memberId, p)
  const [rePickleVersion, setRePickleVersion] = useState(1)

  function applyTheme(world: string, age: string, muted: boolean, warmLight: boolean) {
    patch({ theme: { world, age, muted, warmLight } })
    setTheme(world as ThemeId)
    setAge(age as AgeTier)
    setMuted(muted)
    setWarmLight(warmLight)
    notify({ kind: 'success', title: `${resolved.greetingName} — theme applied`, burst: true })
  }

  return (
    <>
      <h2 className="setup-title">{resolved.emoji} {resolved.greetingName}</h2>
      <p className="setup-desc">
        Pickle: <strong>{resolved.pickleName}</strong> · accent {resolved.accent} · baseline {resolved.spoonsBaseline}/5
      </p>

      {/* Pickle codename */}
      <div className="setup-pin-row">
        <span className="charm-label">Codename</span>
        <button
          type="button"
          className="btn btn-glass"
          onClick={() => {
            const seed = nextPickleSeed(memberId, rePickleVersion)
            patch({ pickleSeed: seed })
            setRePickleVersion((v) => v + 1)
            notify({ kind: 'milestone', title: 'Re-pickled', body: `Now called ${resolveProfile(memberId, member.emoji, { ...override, pickleSeed: seed }).pickleName}`, burst: true })
          }}
        >
          Re-pickle
        </button>
      </div>

      {/* Greeting name (optional, pickle-first) */}
      <div className="setup-pin-row">
        <span className="charm-label">Greeting</span>
        <input
          className="setup-input"
          type="text"
          maxLength={24}
          value={resolved.greetingName}
          aria-label="Greeting name"
          onChange={(e) => patch({ greetingName: e.target.value })}
          placeholder={resolved.pickleName}
        />
      </div>

      {/* Emoji picker */}
      <div className="charm-row" role="group" aria-label="Emoji">
        <span className="charm-label">Emoji</span>
        <div className="charm-chip-row">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              className={`charm-chip${resolved.emoji === e ? ' is-active' : ''}`}
              aria-pressed={resolved.emoji === e}
              onClick={() => patch({ emoji: e })}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div className="charm-row" role="group" aria-label="Accent">
        <span className="charm-label">Accent</span>
        <div className="charm-chip-row">
          {ACCENT_OPTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`charm-chip${resolved.accent === a.id ? ' is-active' : ''}`}
              aria-pressed={resolved.accent === a.id}
              onClick={() => patch({ accent: a.id })}
            >
              <span
                aria-hidden="true"
                style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: `var(${a.token})`, marginRight: 6 }}
              />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-member theme */}
      <div className="charm" aria-label="Per-member theme">
        <span className="charm-label" style={{ minWidth: 0 }}>Their look</span>
        <div className="charm-row" role="group" aria-label="World">
          {(Object.keys(WORLD_LABELS) as ThemeId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`charm-chip${resolved.theme.world === id ? ' is-active' : ''}`}
              aria-pressed={resolved.theme.world === id}
              onClick={() => applyTheme(id, resolved.theme.age, resolved.theme.muted, resolved.theme.warmLight)}
            >
              {WORLD_LABELS[id]}
            </button>
          ))}
        </div>
        <div className="charm-row" role="group" aria-label="Age">
          {(['child', 'teen', 'adult'] as AgeTier[]).map((a) => (
            <button
              key={a}
              type="button"
              className={`charm-chip${resolved.theme.age === a ? ' is-active' : ''}`}
              aria-pressed={resolved.theme.age === a}
              onClick={() => applyTheme(resolved.theme.world, a, resolved.theme.muted, resolved.theme.warmLight)}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="charm-row" role="group" aria-label="Sensory">
          <label className="charm-toggle">
            <input type="checkbox" checked={resolved.theme.muted} onChange={(e) => applyTheme(resolved.theme.world, resolved.theme.age, e.target.checked, resolved.theme.warmLight)} />
            <span>Muted</span>
          </label>
          <label className="charm-toggle">
            <input type="checkbox" checked={resolved.theme.warmLight} onChange={(e) => applyTheme(resolved.theme.world, resolved.theme.age, resolved.theme.muted, e.target.checked)} />
            <span>Warm light</span>
          </label>
        </div>
      </div>

      {/* Spoons baseline */}
      <div className="charm-row">
        <span className="charm-label">Baseline</span>
        <div className="charm-chip-row">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`charm-chip${resolved.spoonsBaseline === n ? ' is-active' : ''}`}
              aria-pressed={resolved.spoonsBaseline === n}
              onClick={() => patch({ spoonsBaseline: n as SpoonLevel })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="setup-pin-row" style={{ marginTop: 20 }}>
        <button
          type="button"
          className="btn btn-glass"
          onClick={() => {
            resetProfile(memberId)
            notify({ kind: 'info', title: 'Profile reset', body: `${resolveProfile(memberId, member.emoji).greetingName} is back to defaults.` })
          }}
        >
          Reset to default
        </button>
      </div>
    </>
  )
}

export default ProfileSurface