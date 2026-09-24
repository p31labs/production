import { useEffect, useState } from 'react'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { listPending, reviewServer } from '@/lib/registryClient'
import { ROLE_LABEL } from '@/lib/auth'
import { StatusBadge, ScanBadge, CapabilityBadge, CategoryChip } from '@/features/marketplace/components'
import type { ServerSummary } from '@/types'

/**
 * ReviewQueueSurface — the moderation queue (D1). Reviewers see pending
 * community servers with their tool-description scanner verdicts + capability
 * manifests, and can approve (Ed25519-signed) or reject. Requires the
 * `reviewer` role (surfaced via GET /me).
 */
export function ReviewQueueSurface() {
  const me = useMarketplaceStore((s) => s.me)
  const [pending, setPending] = useState<ServerSummary[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = async () => {
    if (!useMarketplaceStore.getState().me?.can.review) {
      setPending(null)
      setMsg('You need the reviewer role to see the queue. Role: ' + ROLE_LABEL[useMarketplaceStore.getState().me?.role ?? 'viewer'])
      return
    }
    const p = await listPending()
    setPending(p)
    setMsg(null)
  }

  useEffect(() => {
    void load()
  }, [])

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id)
    setMsg(null)
    const res = await reviewServer(id, action)
    setBusy(null)
    if (res.error) setMsg(res.error)
    else {
      setMsg(`${action}d ${id}`)
      setPending((prev) => prev?.filter((s) => s.id !== id) ?? null)
    }
  }

  const canReview = me?.can.review ?? false

  return (
    <div className="home-container" style={{ maxWidth: 780 }}>
      <section className="home-hero">
        <h1 className="greeting-h1">Review queue</h1>
        <p className="landing-sub">
          Community registrations pending P31 review. Scanner verdicts, capability manifests, and liveness checks are shown — approvals are Ed25519-signed.
        </p>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', marginBottom: 'var(--p31-space-3)' }}>
        <span className="chip" style={{ color: 'var(--p31-accent-violet)' }}>you: {me ? `${me.principal} · ${ROLE_LABEL[me.role]}` : '…'}</span>
        {canReview && <button type="button" className="btn-sm" onClick={() => void load()}>↻ refresh</button>}
        {msg && <span className="chip" style={{ color: 'var(--p31-accent-gold)' }}>{msg}</span>}
      </div>

      {!canReview && <div className="setup-err">The review queue requires the reviewer role. Assign it via the registry admin API (POST /roles).</div>}

      {canReview && pending?.length === 0 && <div className="landing-sub">No pending servers.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
        {canReview && (pending ?? []).map((s) => (
          <div key={s.id} className="surface-card" style={{ padding: 'var(--p31-space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
              <span className="surface-card-title">{s.name}</span>
              <StatusBadge status={s.status} />
              <CategoryChip category={s.category} />
            </div>
            <div className="surface-card-desc" style={{ marginTop: 'var(--p31-space-2)' }}>{s.description}</div>
            <div style={{ display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap', marginTop: 'var(--p31-space-2)' }}>
              <ScanBadge scan={s.scan} />
              <CapabilityBadge capabilities={s.capabilities} />
              <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>{s.toolCount} tools · {s.author}</span>
              <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>{s.endpoint}</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--p31-space-2)', marginTop: 'var(--p31-space-3)' }}>
              <button type="button" className="btn-sm" style={{ background: 'var(--p31-accent-green)', color: 'var(--p31-void)', padding: '8px 16px', borderRadius: 'var(--p31-radius-md)' }} disabled={busy === s.id} onClick={() => void act(s.id, 'approve')}>
                {busy === s.id ? '…' : '✓ Approve (sign)'}
              </button>
              <button type="button" className="btn-sm" style={{ background: 'var(--p31-accent-red)', color: 'var(--p31-void)', padding: '8px 16px', borderRadius: 'var(--p31-radius-md)' }} disabled={busy === s.id} onClick={() => void act(s.id, 'reject')}>
                {busy === s.id ? '…' : '✕ Reject'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}