import { useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { roster } from '@/lib/pickleNames'
import { SettingsSheet } from '@/components/SettingsSheet'

/**
 * PortalIdentity — ONE identity chip (plan W2 zone 4).
 *
 * Signed out: a "Sign in" button (claims the member's local identity).
 * Signed in: the member's emoji + pickle name, with a gear that opens the
 * settings sheet (Energy right now / Reduce motion / Admin view).
 */
export function PortalIdentity() {
  const activeMemberId = useWorkspaceStore((s) => s.activeMemberId)
  const identities = useWorkspaceStore((s) => s.identities)
  const claimIdentity = useWorkspaceStore((s) => s.claimIdentity)
  const [sheetOpen, setSheetOpen] = useState(false)

  const member = roster().find((m) => m.id === activeMemberId) ?? roster()[0]!
  const identity = identities[member.id]

  if (!identity) {
    return (
      <button
        type="button"
        className="topbar-identity btn-sm"
        onClick={() => void claimIdentity(member.id, member.emoji, 'cyan')}
        style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, borderRadius: 'var(--p31-radius-md)' }}
      >
        Sign in
      </button>
    )
  }

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 'var(--p31-space-2)' }}>
      <span className="topbar-identity" aria-label={`Signed in as ${identity.pickleName}`} style={{ borderRadius: 'var(--p31-radius-md)', color: 'var(--p31-text-primary)' }}>
        <span aria-hidden="true">{member.emoji}</span>
        <span>{identity.pickleName}</span>
      </span>
      <button
        type="button"
        className="topbar-identity-gear btn-sm"
        aria-label="Open settings"
        title="Settings"
        aria-expanded={sheetOpen}
        onClick={() => setSheetOpen(!sheetOpen)}
        style={{ borderRadius: 'var(--p31-radius-md)', color: 'var(--p31-text-secondary)' }}
      >
        ⚙
      </button>
      {sheetOpen && <SettingsSheet onClose={() => setSheetOpen(false)} />}
    </span>
  )
}

export default PortalIdentity