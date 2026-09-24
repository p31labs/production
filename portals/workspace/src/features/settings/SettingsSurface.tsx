import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { roster } from '@/lib/pickleNames'
import { forgeHealth } from '@/lib/forgeClient'
import { verifySessionCapability } from '@/lib/capabilityToken'
import { shortDid } from '@/lib/identity'
import { MCP_TOOLS } from '@/lib/mcpTools'
import { useNotifStore } from '@/store/useNotifStore'
import ThemeCharm from '@/components/ThemeCharm'

type SettingsTab = 'general' | 'caregiver' | 'identity' | 'session' | 'starfield' | 'about'

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'caregiver', label: 'Caregiver' },
  { id: 'identity', label: 'Identity' },
  { id: 'session', label: 'Session' },
  { id: 'starfield', label: 'Starfield' },
  { id: 'about', label: 'About' },
]

export function SettingsSurface() {
  const [tab, setTab] = useState<SettingsTab>('general')
  const notify = useNotifStore((s) => s.notify)

  return (
    <section className="surface-panel active" data-mcp-tool={MCP_TOOLS.home} data-mcp-state="ready" aria-label="Settings">
      <div className="home-container">
        <h1 className="greeting-h1">Settings</h1>
        <div className="settings-tabs" role="tablist" aria-label="Settings tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`settings-tab${tab === t.id ? ' is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="settings-pane">
          {tab === 'general' && <GeneralTab />}
          {tab === 'caregiver' && <CaregiverTab onChanged={() => notify({ kind: 'success', title: 'Caregiver PIN updated', body: 'Remember it — you will need it to open shared surfaces.' })} />}
          {tab === 'identity' && <IdentityTab />}
          {tab === 'session' && <SessionTab />}
          {tab === 'starfield' && <StarfieldTab />}
          {tab === 'about' && <AboutTab />}
        </div>
      </div>
    </section>
  )
}

function GeneralTab() {
  return (
    <div className="setup-grid">
      <div className="glass-panel setup-panel">
        <h2 className="setup-title">Appearance</h2>
        <p className="setup-desc">Brand, world, age, and sensory — applied live.</p>
        <ThemeCharm />
      </div>
    </div>
  )
}

function CaregiverTab({ onChanged }: { onChanged: () => void }) {
  const caregiverPinSet = useWorkspaceStore((s) => s.caregiverPinSet)
  const setCaregiverPin = useWorkspaceStore((s) => s.setCaregiverPin)
  const [pinDraft, setPinDraft] = useState('')

  function commitPin() {
    if (!/^\d{4}$/.test(pinDraft)) return
    setCaregiverPin(pinDraft)
    setPinDraft('')
    onChanged()
  }

  return (
    <div className="setup-grid">
      <div className="glass-panel setup-panel">
        <h2 className="setup-title">Caregiver PIN</h2>
        <p className="setup-desc">
          {caregiverPinSet ? 'Your PIN is set. Change it any time.' : 'Set a 4-digit PIN for shared surfaces.'}
        </p>
        <div className="setup-pin-row">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinDraft}
            onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ''))}
            placeholder="4 digits"
            aria-label="New caregiver PIN"
            className="setup-input"
          />
          <button type="button" className="btn btn-primary" onClick={commitPin}>
            {caregiverPinSet ? 'Change PIN' : 'Set PIN'}
          </button>
        </div>
      </div>
    </div>
  )
}

function IdentityTab() {
  const [activeMember, setActiveMember] = useState(roster()[0]!.id)
  const family = roster()
  return (
    <div className="setup-grid">
      <div className="glass-panel setup-panel">
        <h2 className="setup-title">Who is acting</h2>
        <p className="setup-desc">Pickle labels only — never a human name.</p>
        <div className="setup-roster">
          {family.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`setup-member ${m.id === activeMember ? 'active' : ''}`}
              onClick={() => setActiveMember(m.id)}
            >
              <span aria-hidden="true">{m.emoji}</span>
              <span>{m.pickleName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SessionTab() {
  const sessionToken = useWorkspaceStore((s) => s.sessionToken)
  const tokenFingerprint = useWorkspaceStore((s) => s.tokenFingerprint)
  const tokenMintedAt = useWorkspaceStore((s) => s.tokenMintedAt)
  const clearSessionToken = useWorkspaceStore((s) => s.clearSessionToken)
  const activeMemberId = useWorkspaceStore((s) => s.activeMemberId)
  const identities = useWorkspaceStore((s) => s.identities)
  const identity = identities[activeMemberId] ?? null
  const [forge, setForge] = useState<'checking' | 'ok' | 'offline'>('checking')
  const [tokenState, setTokenState] = useState<'none' | 'valid' | 'invalid'>('none')

  useEffect(() => {
    let cancelled = false
    forgeHealth()
      .then(() => { if (!cancelled) setForge('ok') })
      .catch(() => { if (!cancelled) setForge('offline') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function checkToken() {
      if (!sessionToken) { setTokenState('none'); return }
      const valid = await verifySessionCapability(sessionToken)
      if (!cancelled) setTokenState(valid ? 'valid' : 'invalid')
    }
    void checkToken()
    return () => { cancelled = true }
  }, [sessionToken])

  return (
    <div className="setup-grid">
      <div className="glass-panel setup-panel">
        <h2 className="setup-title">Session security</h2>
        <p className="setup-desc">A post-quantum capability token is minted on elevation, bound to the active member's DID.</p>
        <div className="setup-rows">
          <div className="setup-row">
            <span>Issuer DID</span>
            <span className={identity ? 'setup-ok' : 'setup-dim'}>
              {identity ? shortDid(identity.did) : 'no passport yet'}
            </span>
          </div>
          <div className="setup-row">
            <span>Token</span>
            <span className={tokenState === 'valid' ? 'setup-ok' : tokenState === 'invalid' ? 'setup-err' : 'setup-dim'}>
              {tokenState === 'none' ? 'none yet' : tokenState === 'valid' ? 'valid · PQC' : 'invalid'}
            </span>
          </div>
          {tokenFingerprint && (
            <div className="setup-row">
              <span>Fingerprint</span>
              <span className="setup-mono">{tokenFingerprint.slice(0, 16)}…</span>
            </div>
          )}
          {tokenMintedAt && (
            <div className="setup-row">
              <span>Minted</span>
              <span>{new Date(tokenMintedAt).toLocaleTimeString()}</span>
            </div>
          )}
          <div className="setup-row">
            <span>Forge</span>
            <span className={forge === 'ok' ? 'setup-ok' : forge === 'offline' ? 'setup-err' : 'setup-dim'}>
              {forge === 'ok' ? 'live' : forge === 'offline' ? 'offline' : 'checking…'}
            </span>
          </div>
        </div>
        {sessionToken && (
          <button type="button" className="btn btn-glass" onClick={clearSessionToken} style={{ marginTop: 12 }}>
            End session
          </button>
        )}
      </div>
    </div>
  )
}

function StarfieldTab() {
  const starfield = useWorkspaceStore((s) => s.starfield)
  const setStarfield = useWorkspaceStore((s) => s.setStarfield)
  const reseedStarfield = useWorkspaceStore((s) => s.reseedStarfield)
  const notify = useNotifStore((s) => s.notify)

  return (
    <div className="setup-grid">
      <div className="glass-panel setup-panel">
        <h2 className="setup-title">Starfield</h2>
        <p className="setup-desc">Ambient background behind every surface. Calm, deterministic, theme-aware.</p>

        <label className="setup-row" style={{ alignItems: 'center' }}>
          <span>Stars ({starfield.count})</span>
          <input
            type="range"
            min={40}
            max={400}
            step={10}
            value={starfield.count}
            onChange={(e) => setStarfield({ count: Number(e.target.value) })}
            aria-label="Star count"
          />
        </label>

        <label className="setup-row" style={{ alignItems: 'center' }}>
          <span>Twinkle speed ({starfield.twinkleSpeed.toFixed(1)})</span>
          <input
            type="range"
            min={0.2}
            max={2}
            step={0.1}
            value={starfield.twinkleSpeed}
            onChange={(e) => setStarfield({ twinkleSpeed: Number(e.target.value) })}
            aria-label="Twinkle speed"
          />
        </label>

        <label className="setup-row" style={{ alignItems: 'center' }}>
          <span>Flare stars ({starfield.flareCount})</span>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={starfield.flareCount}
            onChange={(e) => setStarfield({ flareCount: Number(e.target.value) })}
            aria-label="Flare star count"
          />
        </label>

        <label className="charm-toggle">
          <input
            type="checkbox"
            checked={starfield.flaring}
            onChange={(e) => setStarfield({ flaring: e.target.checked })}
          />
          <span>Burst flares on notifications (WCAG pause control)</span>
        </label>

        <div className="setup-pin-row">
          <button
            type="button"
            className="btn btn-glass"
            onClick={() => { reseedStarfield(); notify({ kind: 'info', title: 'Starfield re-seeded', body: 'A new deterministic pattern is showing.', burst: true }) }}
          >
            Re-seed
          </button>
        </div>
      </div>
    </div>
  )
}

function AboutTab() {
  return (
    <div className="setup-grid">
      <div className="glass-panel setup-panel">
        <h2 className="setup-title">About</h2>
        <p className="setup-desc">
          P31 Workspace — a private, local, calm workspace for your family. Open source, community-funded,
          no vendor lock-in. Pickle labels only; never a human name.
        </p>
        <p className="setup-desc">Open ⌘D for the developer menu.</p>
      </div>
    </div>
  )
}

export default SettingsSurface