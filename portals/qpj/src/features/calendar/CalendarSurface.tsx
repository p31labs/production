import { useState } from 'react';
import { useQpjStore } from '../../store/useQpjStore';
import './calendar.css';

interface CalendarEvent {
  id: string
  day: number
  title: string
  time: string
  accent: 'cyan' | 'gold' | 'green'
}

const SAMPLE_EVENTS: CalendarEvent[] = [
  { id: 'e1', day: 22, title: 'P31 Stack Health Check', time: '09:00', accent: 'cyan' },
  { id: 'e2', day: 22, title: "Maya's Soccer Match", time: '16:30', accent: 'gold' },
  { id: 'e3', day: 22, title: 'Family Pizza Night', time: '19:00', accent: 'green' },
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function CalendarSurface() {
  const [now] = useState(() => new Date())
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [selected, setSelected] = useState(now.getDate())
  const mode = useQpjStore((s) => s.mode)

  const total = daysInMonth(year, month)
  const firstOffset = new Date(year, month, 1).getDay()
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const eventsFor = (day: number) => SAMPLE_EVENTS.filter((e) => e.day === day)
  const isToday = (day: number) => day === now.getDate() && month === now.getMonth() && year === now.getFullYear()

  const shift = (dir: number) => {
    const d = new Date(year, month + dir, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <section className="calendar-surface" data-mcp-tool="calendarSurface" data-mcp-state="ready" aria-label="Calendar">
      <div className="calendar-surface__main">
        <div className="calendar-surface__header">
          <h2 className="calendar-surface__title">{monthLabel}</h2>
          <div className="calendar-surface__nav">
            <button type="button" className="btn btn-glass" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
            <button type="button" className="btn btn-glass" onClick={() => shift(1)} aria-label="Next month">›</button>
          </div>
        </div>

        <div className="calendar-surface__weekdays">
          {WEEKDAYS.map((d) => <div key={d} className="calendar-surface__weekday">{d}</div>)}
        </div>

        <div className="calendar-surface__grid">
          {Array.from({ length: firstOffset }).map((_, i) => <div key={`e-${i}`} aria-hidden="true" />)}
          {Array.from({ length: total }).map((_, i) => {
            const day = i + 1
            const evs = eventsFor(day)
            return (
              <button
                key={day}
                type="button"
                className={`calendar-surface__day${isToday(day) ? ' is-today' : ''}`}
                data-mcp-tool="calendarCell"
                data-mcp-state="ready"
                onClick={() => setSelected(day)}
                aria-label={`September ${day}, 2026 — ${evs.length} events`}
              >
                <span className="calendar-surface__day-num">{day}</span>
                {evs.map((e) => (
                  <span key={e.id} className="calendar-surface__chip" data-accent={e.accent}>
                    {e.title}
                  </span>
                ))}
              </button>
            )
          })}
        </div>
      </div>

      <aside className="calendar-surface__panel" data-mcp-tool="calendarDay" data-mcp-state="ready">
        <h3 className="calendar-surface__panel-title">
          {new Date(year, month, selected).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </h3>
        <div className="calendar-surface__panel-label">{mode === 'maker' ? '3 scheduled events' : 'Family day'}</div>
        <div className="calendar-surface__panel-list">
          {eventsFor(selected).map((e) => (
            <div key={e.id} className="calendar-surface__event">
              <div className="calendar-surface__event-time" data-accent={e.accent}>{e.time}</div>
              <div className="calendar-surface__event-title">{e.title}</div>
            </div>
          ))}
          {eventsFor(selected).length === 0 && (
            <div className="calendar-surface__empty">No events. A clear day.</div>
          )}
        </div>
      </aside>
    </section>
  )
}

export default CalendarSurface