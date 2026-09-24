import { useCallback } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import type { SurfaceId } from '@/types'

/** Surfaces that require at least `maker` elevation. */
const ELEVATED: Partial<Record<SurfaceId, 'maker' | 'workshop'>> = {
  publish: 'maker',
  playground: 'maker',
  review: 'workshop',
}

/** Gate-aware navigation. Spark sessions reaching an elevated surface open the gate. */
export function useModeGate() {
  const mode = useWorkspaceStore((s) => s.mode)
  const setSurface = useWorkspaceStore((s) => s.setSurface)
  const openGate = useWorkspaceStore((s) => s.openGate)

  const navigate = useCallback(
    (surface: SurfaceId) => {
      const required = ELEVATED[surface]
      if (required && mode === 'spark') {
        openGate(surface)
        return
      }
      setSurface(surface)
    },
    [mode, openGate, setSurface],
  )

  return { navigate, mode, isElevated: mode !== 'spark' }
}