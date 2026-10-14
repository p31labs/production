import { useEffect, useState } from 'react'
import { P31Icon } from '@/components/P31Icon'
import type { ServerSummary, Health, Status, Category, VerifyMeta, ReviewMeta, ScanMeta, CapabilityManifest } from '@/types'

const CATEGORY_LABEL: Record<Category, string> = {
  design: 'Design',
  crypto: 'Crypto',
  government: 'Government',
  finance: 'Finance',
  social: 'Social',
  infra: 'Infra',
  local: 'Local',
}

export const STATUS_LABEL: Record<Status, string> = {
  live: 'Working',
  unverified: 'Not checked yet',
  degraded: 'Partially working',
  down: 'Not working',
}

const HEALTH_LABEL: Record<Health, string> = {
  up: 'working',
  degraded: 'partially working',
  down: 'not working',
}

const STATUS_COLOR: Record<Status, string> = {
  live: 'var(--p31-accent-green)',
  unverified: 'var(--p31-accent-gold)',
  degraded: 'var(--p31-accent-gold)',
  down: 'var(--p31-accent-red)',
}

const HEALTH_COLOR: Record<Health, string> = {
  up: 'var(--p31-accent-green)',
  degraded: 'var(--p31-accent-gold)',
  down: 'var(--p31-accent-red)',
}

export function CategoryChip({ category }: { category: Category }) {
  return (
    <span className="chip" style={{ borderColor: 'color-mix(in oklab, var(--p31-accent-violet) 40%, transparent)', color: 'var(--p31-accent-violet)' }}>
      {CATEGORY_LABEL[category] ?? category}
    </span>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  const color = STATUS_COLOR[status]
  return (
    <span className="chip" style={{ borderColor: `color-mix(in oklab, ${color} 40%, transparent)`, color }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function HealthDot({ health, size = 8 }: { health: Health; size?: number }) {
  const color = HEALTH_COLOR[health]
  return (
    <span
      aria-label={`Server health: ${HEALTH_LABEL[health] ?? health}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 'var(--p31-radius-full)',
        background: color,
        boxShadow: `0 0 6px ${color}`,
      }}
    />
  )
}

export function VerifyBadge({ verify }: { verify?: VerifyMeta }) {
  if (!verify) return <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>Claims not checked yet.</span>
  return (
    <span className="chip" style={{ borderColor: 'color-mix(in oklab, var(--p31-accent-green) 40%, transparent)', color: 'var(--p31-accent-green)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>
      Verified · {verify.checkedAt?.slice(0, 10) ?? 'now'}
    </span>
  )
}

export function ToolCount({ n }: { n: number }) {
  return (
    <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>
      {n} tool{n === 1 ? '' : 's'}
    </span>
  )
}

/** Relative "last checked" freshness badge (honest staleness signal). */
export function FreshnessBadge({ checkedAt, latencyMs }: { checkedAt?: string; latencyMs?: number }) {
  const [label, setLabel] = useState('—')
  useEffect(() => {
    if (!checkedAt) return
    const tick = () => {
      const dt = Date.now() - new Date(checkedAt).getTime()
      if (dt < 60_000) setLabel('just now')
      else if (dt < 3_600_000) setLabel(`${Math.max(1, Math.round(dt / 60_000))}m ago`)
      else setLabel(`${Math.max(1, Math.round(dt / 3_600_000))}h ago`)
    }
    tick()
    const t = setInterval(tick, 30_000)
    return () => clearInterval(t)
  }, [checkedAt])
  if (!checkedAt) return null
  return (
    <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }} title={`checked ${checkedAt}${latencyMs !== undefined ? ` · ${latencyMs}ms` : ''}`}>
      checked {label}
    </span>
  )
}

export function ReviewBadge({ review }: { review?: ReviewMeta }) {
  if (!review) return null
  return (
    <span className="chip" style={{ color: 'var(--p31-accent-green)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }} title={`${review.alg} · signed by ${review.signedBy} · ${review.checkedAt}\nsignature: ${review.signature}`}>
      ✓ reviewed {review.alg}
    </span>
  )
}

export function DriftBadge({ drifted, contentHash, baselineHash }: { drifted?: boolean; contentHash?: string; baselineHash?: string | null }) {
  if (!drifted) return null
  return (
    <span className="chip" style={{ color: 'var(--p31-accent-gold)', borderColor: 'color-mix(in oklab, var(--p31-accent-gold) 50%, transparent)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }} title={`something changed\nbefore ${baselineHash ?? '—'}\nnow ${contentHash ?? '—'}`}>
      ⚠ changed
    </span>
  )
}

export function CapabilityBadge({ capabilities }: { capabilities?: CapabilityManifest }) {
  if (!capabilities) return null
  return (
    <span className="chip" style={{ color: 'var(--p31-accent-violet)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }} title={`tools: ${capabilities.tools.join(', ')}\ndata: ${capabilities.dataSources.join(', ')}\nexternal: ${capabilities.externalServices.join(', ')}`}>
      {capabilities.tools.length} tools · {capabilities.dataSources.length} data · {capabilities.externalServices.length} services
    </span>
  )
}

export function ScanBadge({ scan }: { scan?: ScanMeta }) {
  if (!scan) return null
  const color = scan.verdict === 'clean' ? 'var(--p31-accent-green)' : scan.verdict === 'suspicious' ? 'var(--p31-accent-gold)' : 'var(--p31-accent-red)'
  return (
    <span className="chip" style={{ color, fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }} title={`Safety check: ${scan.verdict} · ${scan.maliciousCount} bad · ${scan.suspiciousCount} odd · ${scan.scannedAt}`}>
      Safety check: {scan.verdict}
    </span>
  )
}

export function RiskChip({ risk }: { risk: 'read' | 'write' }) {
  if (risk === 'read') {
    return <span className="chip" style={{ color: 'var(--p31-accent-green)', borderColor: 'color-mix(in oklab, var(--p31-accent-green) 40%, transparent)' }}>Read only</span>
  }
  return <span className="chip" style={{ color: 'var(--p31-accent-red)', borderColor: 'color-mix(in oklab, var(--p31-accent-red) 40%, transparent)' }}>Can change things</span>
}

/** Simple catalog card: name, one-line description, ONE "Open" button. */
export function ServerCard({ server, onOpen }: { server: ServerSummary; onOpen?: (id: string) => void }) {
  const open = () => {
    if (onOpen) onOpen(server.id)
    else window.location.hash = `#/server/${encodeURIComponent(server.id)}`
  }
  return (
    <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-2)', textAlign: 'left', width: '100%' }}>
      <div className="surface-card-header">
        <span className="surface-card-icon" aria-hidden="true">{server.icon ?? '🧩'}</span>
        <div className="flex-spacer" style={{ flex: 1 }} />
      </div>
      <div className="surface-card-title">{server.name}</div>
      <div className="surface-card-desc">{server.description}</div>
      <button
        type="button"
        className="btn-sm"
        onClick={open}
        style={{ alignSelf: 'flex-start', background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '6px 18px', borderRadius: 'var(--p31-radius-md)' }}
      >
        Open
      </button>
    </div>
  )
}

// ─── Storefront badges (B-1) — governed metadata with honest absence states ─

/** x402 price tier from the gateway PRICING table (absent until Lane A). */
export function PriceTierBadge({ tier }: { tier?: { tier: string; label?: string; usdPerCall?: number; usdPerMonth?: number; currency?: string; notes?: string } | null }) {
  if (!tier) return <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>price: n/a</span>
  const price = tier.usdPerCall !== undefined ? `$${tier.usdPerCall}/call` : tier.usdPerMonth !== undefined ? `$${tier.usdPerMonth}/mo` : tier.label ?? ''
  return (
    <span className="chip" style={{ color: 'var(--p31-accent-gold)', borderColor: 'color-mix(in oklab, var(--p31-accent-gold) 40%, transparent)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }} title={tier.notes}>
      {tier.label ?? tier.tier}{price ? ` · ${price}` : ''}
    </span>
  )
}

/** Transport protocol (streamable-http / sse). Absent until the registry ships it. */
export function ProtocolBadge({ protocol }: { protocol?: string | null }) {
  if (!protocol) return <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>connection: n/a</span>
  return (
    <span className="chip" style={{ color: 'var(--p31-accent-violet)', borderColor: 'color-mix(in oklab, var(--p31-accent-violet) 40%, transparent)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>
      {protocol}
    </span>
  )
}

/** OAuth resource-server status (Lane A). */
export function OAuthBadge({ oauth }: { oauth?: { enabled: boolean; resource?: string } | null }) {
  if (!oauth) return <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>sign-in: n/a</span>
  return oauth.enabled ? (
    <span className="chip" style={{ color: 'var(--p31-accent-green)', borderColor: 'color-mix(in oklab, var(--p31-accent-green) 40%, transparent)' }} title={oauth.resource}>
      sign-in ✓
    </span>
  ) : (
    <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>sign-in off</span>
  )
}

/** Enterprise approval state (Lane E) — governed lens surface. */
export function ApprovalBadge({ approval }: { approval?: 'approved' | 'pending' | 'blocked' | null }) {
  if (!approval) return <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>Approval: n/a</span>
  const color = approval === 'approved' ? 'var(--p31-accent-green)' : approval === 'blocked' ? 'var(--p31-accent-red)' : 'var(--p31-accent-gold)'
  return <span className="chip" style={{ color, borderColor: `color-mix(in oklab, ${color} 40%, transparent)` }}>Approval: {approval}</span>
}

/** LOVE settlement badge — shown when the registry reports a settled review. */
export function LoveBadge({ settled }: { settled?: boolean | null }) {
  if (settled === undefined || settled === null) return null
  return settled ? (
    <span className="chip" style={{ color: 'var(--p31-accent-violet)', borderColor: 'color-mix(in oklab, var(--p31-accent-violet) 40%, transparent)' }} title="Payment confirmed by the network.">
      <P31Icon name="love-heart" size={14} /> Payment confirmed
    </span>
  ) : (
    <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>Payment pending</span>
  )
}

/** Federation source (A-2). */
export function SourceBadge({ source }: { source?: 'p31' | 'official' | 'external' }) {
  if (!source) return null
  const color = source === 'p31' ? 'var(--p31-accent-green)' : source === 'official' ? 'var(--p31-accent-violet)' : 'var(--p31-accent-gold)'
  return (
    <span className="chip" style={{ color, borderColor: `color-mix(in oklab, ${color} 40%, transparent)` }} title={source === 'official' ? 'from the official list' : source === 'external' ? 'from outside P31' : 'made by P31'}>
      {source}
    </span>
  )
}