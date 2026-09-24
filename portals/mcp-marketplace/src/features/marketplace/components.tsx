import { useEffect, useState } from 'react'
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
      {status}
    </span>
  )
}

export function HealthDot({ health, size = 8 }: { health: Health; size?: number }) {
  const color = HEALTH_COLOR[health]
  return (
    <span
      aria-label={`health: ${health}`}
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
  if (!verify) return <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>unverified claims</span>
  return (
    <span className="chip" style={{ borderColor: 'color-mix(in oklab, var(--p31-accent-green) 40%, transparent)', color: 'var(--p31-accent-green)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>
      ML-DSA-65 · {verify.checkedAt?.slice(0, 10) ?? 'verified'}
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

/** Relative "last probed" freshness badge (honest staleness signal). */
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
    <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }} title={`probed ${checkedAt}${latencyMs !== undefined ? ` · ${latencyMs}ms` : ''}`}>
      probed {label}
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
    <span className="chip" style={{ color: 'var(--p31-accent-gold)', borderColor: 'color-mix(in oklab, var(--p31-accent-gold) 50%, transparent)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }} title={`surface drifted\nbaseline ${baselineHash ?? '—'}\ncurrent ${contentHash ?? '—'}`}>
      ⚠ drifted
    </span>
  )
}

export function CapabilityBadge({ capabilities }: { capabilities?: CapabilityManifest }) {
  if (!capabilities) return null
  return (
    <span className="chip" style={{ color: 'var(--p31-accent-violet)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }} title={`tools: ${capabilities.tools.join(', ')}\ndata: ${capabilities.dataSources.join(', ')}\nexternal: ${capabilities.externalServices.join(', ')}`}>
      manifest · {capabilities.tools.length}t {capabilities.dataSources.length}d {capabilities.externalServices.length}x
    </span>
  )
}

export function ScanBadge({ scan }: { scan?: ScanMeta }) {
  if (!scan) return null
  const color = scan.verdict === 'clean' ? 'var(--p31-accent-green)' : scan.verdict === 'suspicious' ? 'var(--p31-accent-gold)' : 'var(--p31-accent-red)'
  return (
    <span className="chip" style={{ color, fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }} title={`scanner verdict ${scan.verdict} · ${scan.maliciousCount} malicious · ${scan.suspiciousCount} suspicious · ${scan.scannedAt}`}>
      scan: {scan.verdict}
    </span>
  )
}

export function ServerCard({ server, onOpen }: { server: ServerSummary; onOpen?: (id: string) => void }) {
  const open = () => {
    if (onOpen) onOpen(server.id)
    else window.location.hash = `#/server/${encodeURIComponent(server.id)}`
  }
  return (
    <button
      type="button"
      className="surface-card server-card"
      onClick={open}
      style={{ textAlign: 'left', width: '100%' }}
    >
      <div className="surface-card-header">
        <span className="surface-card-icon" aria-hidden="true">{server.icon ?? '🧩'}</span>
        <div className="flex-spacer" style={{ flex: 1 }} />
        <StatusBadge status={server.status} />
      </div>
      <div className="surface-card-title">{server.name}</div>
      <div className="surface-card-desc">{server.description}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)', flexWrap: 'wrap', marginTop: 'var(--p31-space-3)' }}>
        <CategoryChip category={server.category} />
        <ToolCount n={server.toolCount} />
        <HealthDot health={server.health} />
        {server.readOnlySafe && <span className="chip" style={{ color: 'var(--p31-accent-green)' }}>read-safe</span>}
        <DriftBadge drifted={server.drifted} contentHash={server.contentHash} baselineHash={server.baselineHash} />
      </div>
      <div style={{ marginTop: 'var(--p31-space-3)' }}>
        <VerifyBadge verify={server.verify} /> <ReviewBadge review={server.review} /> <ScanBadge scan={server.scan} /> <CapabilityBadge capabilities={server.capabilities} />
      </div>
      <div style={{ marginTop: 'var(--p31-space-2)' }}>
        <FreshnessBadge checkedAt={server.checkedAt} latencyMs={server.latencyMs} />
      </div>
      <div style={{ color: 'var(--p31-accent)', fontSize: 'var(--p31-text-sm)', marginTop: 'var(--p31-space-3)' }}>
        Explore →
      </div>
    </button>
  )
}

export function RiskChip({ risk }: { risk: 'read' | 'write' }) {
  if (risk === 'read') {
    return <span className="chip" style={{ color: 'var(--p31-accent-green)', borderColor: 'color-mix(in oklab, var(--p31-accent-green) 40%, transparent)' }}>read</span>
  }
  return <span className="chip" style={{ color: 'var(--p31-accent-red)', borderColor: 'color-mix(in oklab, var(--p31-accent-red) 40%, transparent)' }}>write</span>
}