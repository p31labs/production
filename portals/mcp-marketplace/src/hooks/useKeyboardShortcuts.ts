import { useEffect } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { ROUTES } from '@/lib/routes'

/** ⌘K palette, ⌘1–7 surface jumps, ⌘D dev menu, Escape closes overlays. */
export function useKeyboardShortcuts() {
  const togglePalette = useWorkspaceStore((s) => s.togglePalette)
  const closePalette = useWorkspaceStore((s) => s.closePalette)
  const closeGate = useWorkspaceStore((s) => s.closeGate)
  const setCalm = useWorkspaceStore((s) => s.setCalm)
  const setSurface = useWorkspaceStore((s) => s.setSurface)
  const setDevOpen = useWorkspaceStore((s) => s.setDevOpen)
  const devOpen = useWorkspaceStore((s) => s.devOpen)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key === 'k') {
        e.preventDefault()
        togglePalette()
        return
      }

      if (mod && e.key === 'd') {
        e.preventDefault()
        setDevOpen(!devOpen)
        return
      }

      if (mod && e.key >= '1' && e.key <= '7') {
        e.preventDefault()
        const idx = Number(e.key) - 1
        const route = ROUTES[idx]
        if (route) setSurface(route.id)
        return
      }

      if (e.key === 'Escape') {
        closePalette()
        closeGate()
        setCalm(false)
        setDevOpen(false)
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [togglePalette, closePalette, closeGate, setCalm, setSurface, setDevOpen, devOpen])
}