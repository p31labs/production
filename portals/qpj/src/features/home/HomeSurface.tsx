import { useQpjStore } from '../../store/useQpjStore';
import { getPassport } from '../../lib/passports';
import { navigateTo, type QpjRoute } from '../../lib/routes';
import { LOVELedgerCard } from '../../components/LOVELedgerCard';
import './home.css';

interface SurfaceCard {
  id: QpjRoute
  icon: string
  title: string
  description: string
  mcpTool: string
  minMode: 'spark' | 'maker' | 'workshop'
  accent: 'docs' | 'sheets' | 'slides' | 'calendar' | 'mail' | 'drive' | 'craft'
}

const SURFACES: SurfaceCard[] = [
  { id: 'docs', icon: '📄', title: 'Docs', description: 'Collaborative rich-text editing with live presence and outlines.', mcpTool: 'docsSurface', minMode: 'maker', accent: 'docs' },
  { id: 'sheets', icon: '📊', title: 'Sheets', description: 'Spreadsheet matrix with cell grid and frozen headers.', mcpTool: 'sheetCell', minMode: 'maker', accent: 'sheets' },
  { id: 'slides', icon: '📽️', title: 'Slides', description: 'Deck creation and full-screen presenter mode.', mcpTool: 'slidesSurface', minMode: 'maker', accent: 'slides' },
  { id: 'calendar', icon: '📅', title: 'Calendar', description: 'Month grid and day inspector for family events.', mcpTool: 'calendarSurface', minMode: 'maker', accent: 'calendar' },
  { id: 'mail', icon: '✉️', title: 'Mail', description: 'Three-pane inbox for calm asynchronous communication.', mcpTool: 'mailSurface', minMode: 'maker', accent: 'mail' },
  { id: 'drive', icon: '📁', title: 'Drive', description: 'Local file storage — where the Forge writes generated documents.', mcpTool: 'driveSurface', minMode: 'maker', accent: 'drive' },
  { id: 'craft', icon: '🛠️', title: 'Craft', description: 'The maker workshop — tokens, recipes, the artifact studio.', mcpTool: 'craftSurface', minMode: 'maker', accent: 'craft' },
]

const MODE_LABEL: Record<SurfaceCard['minMode'], string> = {
  spark: 'SPARK',
  maker: 'MAKER',
  workshop: 'WORKSHOP',
}

export function HomeSurface({ passportId }: { passportId: string }) {
  const me = getPassport(passportId)
  const mode = useQpjStore((s) => s.mode)
  const spoons = useQpjStore((s) => s.spoons)
  const locked = mode === 'spark'
  const crisisFloor = spoons === 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <section className="home-surface" data-mcp-tool="homeSurface" data-mcp-state="ready" aria-label="Workspace launcher">
      <header className="home-surface__hero">
        <div>
          <h1 className="home-surface__greeting">
            {greeting}, {me.pickledName}
          </h1>
          <p className="home-surface__tagline">Your family&apos;s sovereign workspace. Private, local, device-first.</p>
        </div>
        <div className="home-surface__family">
          <span className="home-surface__avatar" aria-hidden="true">{me.emoji}</span>
          <div>
            <span className="home-surface__family-label">FAMILY BALANCE</span>
            <LOVELedgerCard />
          </div>
        </div>
      </header>

      {crisisFloor ? (
        <div className="home-surface__floor" data-mcp-tool="homeCrisisFloor" data-mcp-state="ready">
          <p className="home-surface__floor-text">Spoon 0 — a rest stop. The surfaces wait; you don&apos;t have to.</p>
        </div>
      ) : (
        <div className="home-surface__grid" role="list">
        {SURFACES.map((s) => {
          const isLocked = locked && s.minMode !== 'spark'
          return (
            <button
              key={s.id}
              type="button"
              role="listitem"
              className="home-surface__card"
              data-mcp-tool={s.mcpTool}
              data-mcp-state={isLocked ? 'locked' : 'ready'}
              data-locked={isLocked || undefined}
              data-accent={s.accent}
              onClick={() => navigateTo(s.id)}
              aria-label={`${s.title}${isLocked ? ' — caregiver PIN required' : ''}`}
            >
              <div className="home-surface__card-head">
                <span className="home-surface__icon" aria-hidden="true">{s.icon}</span>
                <span className="home-surface__badge" data-mode={s.minMode} aria-hidden="true">
                  {MODE_LABEL[s.minMode]}
                  {isLocked && ' 🔒'}
                </span>
              </div>
              <h2 className="home-surface__card-title">{s.title}</h2>
              <p className="home-surface__card-desc">{s.description}</p>
            </button>
          )
        })}
        </div>
      )}
    </section>
  )
}

export default HomeSurface