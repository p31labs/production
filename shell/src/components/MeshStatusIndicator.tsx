import { useEffect, useState } from 'react';

export interface MeshStatusData {
  peerCount: number;
  isConnected: boolean;
  lastSyncTime?: number;
  transportMode?: 'direct' | 'relay' | 'offline';
  latency?: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
}

function calcQuality(
  peerCount: number,
  isConnected: boolean,
  latency?: number,
  transportMode?: string,
): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
  if (!isConnected || transportMode === 'offline') return 'offline';
  if (peerCount === 0) return 'poor';
  if (peerCount === 1) return 'fair';
  if (peerCount >= 3 && (latency ?? 100) < 50) return 'excellent';
  if (peerCount >= 2 && (latency ?? 100) < 100) return 'good';
  return 'fair';
}

const QUALITY_COLORS: Record<string, { bg: string; text: string; shadow: string }> = {
  excellent: { bg: 'color-mix(in oklch, var(--p31-accent-green) 25%, transparent)', text: 'var(--p31-accent-green)', shadow: '0 0 8px color-mix(in oklch, var(--p31-accent-green) 50%, transparent)' },
  good: { bg: 'color-mix(in oklch, var(--p31-accent) 25%, transparent)', text: 'var(--p31-accent)', shadow: '0 0 8px color-mix(in oklch, var(--p31-accent) 50%, transparent)' },
  fair: { bg: 'color-mix(in oklch, var(--p31-accent-gold) 25%, transparent)', text: 'var(--p31-accent-gold)', shadow: '0 0 8px color-mix(in oklch, var(--p31-accent-gold) 50%, transparent)' },
  poor: { bg: 'color-mix(in oklch, var(--p31-accent-red) 25%, transparent)', text: 'var(--p31-accent-red)', shadow: '0 0 8px color-mix(in oklch, var(--p31-accent-red) 50%, transparent)' },
  offline: { bg: 'var(--p31-surface2)', text: 'var(--p31-text-tertiary)', shadow: 'none' },
};

export function useMeshStatus(): MeshStatusData {
  const [status, setStatus] = useState<MeshStatusData>({
    peerCount: 0,
    isConnected: false,
    transportMode: 'offline',
    quality: 'offline',
  });

  useEffect(() => {
    const update = () => {
      const sync = (window as any).__p31_meshSync || {};
      const transport = (window as any).__p31_meshTransport || 'offline';
      const peerCount = sync.peerCount ?? 0;
      const isConnected = transport !== 'offline';
      const quality = calcQuality(peerCount, isConnected, sync.latency, transport);
      setStatus({
        peerCount,
        isConnected,
        lastSyncTime: sync.lastSyncTime ? Date.now() - sync.lastSyncTime : undefined,
        transportMode: transport,
        latency: sync.latency,
        quality,
      });
    };
    update();
    const iv = setInterval(update, 5000);
    return () => clearInterval(iv);
  }, []);

  return status;
}

export function MeshStatusDot({ size = 10, className = '' }: { size?: number; className?: string }) {
  const { quality } = useMeshStatus();
  const colors = QUALITY_COLORS[quality];
  return (
    <span
      className={className}
      role="status"
      aria-label={`Mesh status: ${quality}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: colors.bg,
        boxShadow: colors.shadow,
        animation: quality === 'offline' ? 'none' : `${1.5 + size * 0.05}s ease-in-out infinite alternate mesh-pulse`,
      }}
    />
  );
}
