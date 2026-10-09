import { useMemo } from 'react';
import GlassCard from './ui/GlassCard';
import { computeTrustScore } from '../features/identity-wallet/computeTrustScore';

interface TrustDashboardProps {
  kelValid: boolean;
  keysFresh: boolean;
  credentialCount: number;
  peerAttestations: number;
}

export default function TrustDashboard({
  kelValid,
  keysFresh,
  credentialCount,
  peerAttestations,
}: TrustDashboardProps) {
  const { score: trustScore, level: trustLevel, color: trustColor } = useMemo(
    () => computeTrustScore({ kelValid, keysFresh, credentialCount, peerAttestations }),
    [kelValid, keysFresh, credentialCount, peerAttestations],
  );

  return (
    <GlassCard title="Trust Dashboard" variant="phos" className="trust-dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'var(--p31-space-xs)', marginBottom: 'var(--p31-space-xs)' }}>
        <div style={{ textAlign: 'center', padding: 'var(--p31-space-tiny)', background: 'var(--p31-glass-bg)', borderRadius: 8 }}>
          <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', marginBottom: 4 }}>Chain</div>
          <div style={{ fontSize: 'var(--p31-scale-lg)', color: kelValid ? 'var(--p31-accent-green)' : 'var(--p31-accent-red)' }}>
            {kelValid ? '✓' : '✗'}
          </div>
          <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', marginTop: 2 }}>
            {kelValid ? 'Valid' : 'Invalid'}
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: 'var(--p31-space-tiny)', background: 'var(--p31-glass-bg)', borderRadius: 8 }}>
          <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', marginBottom: 4 }}>Keys</div>
          <div style={{ fontSize: 'var(--p31-scale-lg)', color: keysFresh ? 'var(--p31-accent-green)' : 'var(--p31-accent-gold)' }}>
            {keysFresh ? '✓' : '⚠'}
          </div>
          <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', marginTop: 2 }}>
            {keysFresh ? 'Fresh' : 'Rotate Soon'}
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: 'var(--p31-space-tiny)', background: 'var(--p31-glass-bg)', borderRadius: 8 }}>
          <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', marginBottom: 4 }}>Credentials</div>
          <div style={{ fontSize: 'var(--p31-scale-lg)', fontWeight: 600 }}>
            {credentialCount}
          </div>
          <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', marginTop: 2 }}>
            Verified
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: 'var(--p31-space-tiny)', background: 'var(--p31-glass-bg)', borderRadius: 8 }}>
          <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', marginBottom: 4 }}>Peers</div>
          <div style={{ fontSize: 'var(--p31-scale-lg)', fontWeight: 600 }}>
            {peerAttestations}
          </div>
          <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', marginTop: 2 }}>
            Attest
          </div>
        </div>
      </div>

      <div style={{ padding: 'var(--p31-space-xs)', background: 'var(--p31-glass-bg)', borderRadius: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', marginBottom: 4 }}>
          Overall Trust
        </div>
        <div style={{ fontSize: 'var(--p31-scale-xl)', fontWeight: 700, color: trustColor }}>
          {trustLevel}
        </div>
        <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', marginTop: 4 }}>
          Score: {trustScore}/100
        </div>
      </div>
    </GlassCard>
  );
}
