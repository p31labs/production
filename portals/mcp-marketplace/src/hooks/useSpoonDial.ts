import { useEffect } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import type { SpoonLevel } from '@/types'

/** Drives --motion-scale from the spoon level. 4–5 → 1, 3 → 0.6, 1–2 → 0.2, 0 → 0. */
export function useSpoonDial() {
  const spoons = useWorkspaceStore((s) => s.spoons)

  useEffect(() => {
    const scale =
      spoons >= 4 ? '1'
      : spoons === 3 ? '0.6'
      : spoons >= 1 ? '0.2'
      : '0'
    document.documentElement.style.setProperty('--motion-scale', scale)
  }, [spoons])

  return spoons
}

export function spoonLabel(level: SpoonLevel): string {
  if (level === 0) return 'Calm mode — everything slowed down'
  if (level <= 2) return 'Low energy — reduced motion'
  if (level === 3) return 'Moderate energy'
  return 'Full energy'
}