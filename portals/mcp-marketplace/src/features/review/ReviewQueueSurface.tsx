import { useEffect, useState } from 'react'
import { PageHeaderV2, Input } from '@p31ca/design-core/canon-v2'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { listPending, reviewServer } from '@/lib/registryClient'
import { humanError } from '@/lib/humanErrors'
import { ROLE_LABEL, setPrincipal, getPrincipal } from '@/lib/auth'
import { StatusBadge, ScanBadge, CapabilityBadge, CategoryChip } from '@/features/marketplace/components'
import type { ServerSummary } from '@/types'

/** Cards shown at once — the cognitive-load gate caps card lists at 7. */
const QUEUE_PAGE = 7

/**
 * ReviewQueueSurface — where new submissions get checked. The route stays
 * reachable by URL but is hidden from all nav (plan W2). Without reviewer
 * access it shows a plain message; reviewers see the queue, seven at a time.
 */
export function ReviewQueueSurface() {
  const me = useMarketplaceStore((s) => s.me)
  const loadMe = useMarketplaceStore((s) => s.loadMe)
  const [pending, setPending] = useState<ServerSummary[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [shown, setShown] = useState(QUEUE_PAGE)
  const [principalInput, setPrincipalInput] = useState(getPrincipal() ?? '')

  const load = async () => {
    if (!useMarketplaceStore.getState().me?.can.review) {
      setPending(null)
      setMsg(null)
      return
    }
    const p = await listPending()
    setPending(p ?? [])
    setMsg(null)
  }

  const setPrincipalSelf = async () => {
    setPrincipal(principalInput.trim() || null)
    await loadMe()
    void load()
  }

  useEffect(() => {
    void load()
  }, [])

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id)
    setMsg(null)
    const res = await reviewServer(id, action)
    setBusy(null)
    if (res.error) setMsg(humanError(res.error))
    else {
      setMsg(`Done. This server was ${action === 'approve' ? 'approved' : 'rejected'}.`)
      setPending((prev) => prev?.filter((s) => s.id !== id) ?? null)
    }
  }

  const canReview = me?.can.review ?? false

  return (
    <div className="home-container" style={{ maxWidth: 780 }}>
      <PageHeaderV2
        title="Review"
        subtitle={
          canReview
            ? 'Check new submissions. Approve the good ones.'
            : 'This is where new submissions get checked. It opens for reviewers.'
        }
      />

      {!canReview && <div className="landing-sub">Ask a reviewer to open this page.</div>}

      {canReview && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', marginBottom: 'var(--p31-space-3)', flexWrap: 'wrap' }}>
            {me && <span className="chip" style={{ color: 'var(--p31-accent-violet)' }}>you: {me.principal} · {ROLE_LABEL[me.role]}</span>}
            <button type="button" className="btn-sm" onClick={() => void load()}>↻ Refresh</button>
            <div style={{ minWidth: 200 }}>
              <Input
                placeholder="Your email"
                value={principalInput}
                onChange={(e) => setPrincipalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void setPrincipalSelf() }}
                aria-label="Set your email for check-ins"
              />
            </div>
            <button type="button" className="btn-sm" onClick={() => void setPrincipalSelf()}>Set it</button>
            {msg && <span className="chip" style={{ color: 'var(--p31-accent-gold)' }}>{msg}</span>}
          </div>

          {pending !== null && pending.length === 0 && <div className="landing-sub">Nothing is waiting to be checked.</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
            {(pending ?? []).slice(0, shown).map((s) => (
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
                </div>
                <div style={{ display: 'flex', gap: 'var(--p31-space-2)', marginTop: 'var(--p31-space-3)' }}>
                  <button type="button" className="btn-sm" style={{ background: 'var(--p31-accent-green)', color: 'var(--p31-void)', padding: '8px 16px', borderRadius: 'var(--p31-radius-md)' }} disabled={busy === s.id} onClick={() => void act(s.id, 'approve')}>
                    {busy === s.id ? '…' : '✓ Approve'}
                  </button>
                  <button type="button" className="btn-sm" style={{ background: 'var(--p31-accent-red)', color: 'var(--p31-void)', padding: '8px 16px', borderRadius: 'var(--p31-radius-md)' }} disabled={busy === s.id} onClick={() => void act(s.id, 'reject')}>
                    {busy === s.id ? '…' : '✕ Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pending !== null && pending.length > shown && (
            <div style={{ textAlign: 'center', marginTop: 'var(--p31-space-3)' }}>
              <button type="button" className="btn-sm" onClick={() => setShown((v) => v + QUEUE_PAGE)}>
                Show more ({pending.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}