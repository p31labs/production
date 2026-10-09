import { useEffect, useState } from 'react'

/**
 * HeartPulse — the low-opacity heartbeat background for app/personal pages.
 *
 * A CSS double-beat: 1 → 1.1 → 1 → 1.05 → 1 over 1.2s. Opacity 0.06–0.12,
 * color tracks the theme accent. Disabled entirely at spoon ≤ 1 (crisis) and
 * at prefers-reduced-motion (renders a static heart silhouette instead).
 */
export default function HeartPulse({ spoons = 3 }: { spoons?: number }) {
  const [reduced, setReduced] = useState(false)
  const s = Math.max(0, Math.min(5, Number(spoons) || 3))
  const crisis = s <= 1

  useEffect(() => {
    setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  }, [])

  if (crisis) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 1,
      }}
    >
      <svg
        viewBox="0 0 100 90"
        style={{
          width: 'min(62vw, 62vh)',
          height: 'auto',
          fill: 'none',
          stroke: 'var(--p31-accent, #00f0ff)',
          strokeWidth: 0.6,
          opacity: reduced ? 0.06 : 0.08,
          animation: reduced || crisis ? 'none' : 'p31-heartbeat 1.2s ease-in-out infinite',
          transformOrigin: 'center',
        }}
      >
        <path d="M50 88 C20 65 2 48 2 30 C2 14 14 4 28 4 C38 4 46 10 50 18 C54 10 62 4 72 4 C86 4 98 14 98 30 C98 48 80 65 50 88 Z" />
      </svg>
      <style>{`
        @keyframes p31-heartbeat {
          0%, 100% { transform: scale(1); opacity: 0.06; }
          15%      { transform: scale(1.10); opacity: 0.12; }
          30%      { transform: scale(1); opacity: 0.06; }
          45%      { transform: scale(1.05); opacity: 0.10; }
          60%      { transform: scale(1); opacity: 0.06; }
        }
      `}</style>
    </div>
  )
}