import { Link } from 'react-router-dom'
import { useUI } from '../lib/store'

export function Topbar() {
  const { mode, setMode, spoons, togglePalette } = useUI()
  return (
    <header className="topbar">
      <button
        className="btn btn--ghost"
        onClick={togglePalette}
        aria-label="Open navigation"
      >
        ☰
      </button>
      <Link to="/" className="topbar__brand">
        P31 <span>Forge</span>
      </Link>
      <div className="topbar__spacer" />
      <span className="spoon-chip">spoons {spoons}/5</span>
      <button
        className="btn btn--ghost"
        onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
      >
        {mode === 'light' ? '◐ dark' : '◑ light'}
      </button>
    </header>
  )
}