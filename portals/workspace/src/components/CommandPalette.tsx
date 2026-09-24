import { useEffect, useRef, useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useModeGate } from '@/hooks/useModeGate'
import { ROUTES } from '@/lib/routes'

export function CommandPalette() {
  const open = useWorkspaceStore((s) => s.paletteOpen)
  const closePalette = useWorkspaceStore((s) => s.closePalette)
  const { navigate } = useModeGate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  if (!open) return null

  const results = ROUTES.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div
      className="modal-backdrop active"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => { if (e.target === e.currentTarget) closePalette() }}
    >
      <div className="modal-box palette-box">
        <div className="palette-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Type a surface name or command…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) {
                closePalette()
                navigate(results[0].id)
              }
            }}
          />
        </div>
        <div className="palette-results">
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              className="palette-item"
              onClick={() => { closePalette(); navigate(r.id) }}
            >
              <span>{r.icon} Jump to {r.label}</span>
              <kbd className="search-kbd">⌘{i + 1}</kbd>
            </button>
          ))}
          {results.length === 0 && (
            <div style={{ padding: 16, color: 'var(--p31-cloud)', textAlign: 'center' }}>
              No matching surfaces.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}