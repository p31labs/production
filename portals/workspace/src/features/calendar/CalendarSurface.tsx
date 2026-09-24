import { useState } from 'react'
import { MCP_TOOLS } from '@/lib/mcpTools'
import { pickleName } from '@/lib/pickleNames'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalEvent {
  id: string
  title: string
  day: number
  startTime: string
  endTime: string
  color: string
}

// Pickle labels only — no human names.
const SEED_EVENTS: CalEvent[] = [
  { id: 'e1', title: 'P31 Stack System Health Check', day: 22, startTime: '09:00', endTime: '10:00', color: 'var(--p31-accent)' },
  { id: 'e2', title: `${pickleName('young-one').split(' ')[0]} Soccer Match`, day: 22, startTime: '16:30', endTime: '17:30', color: 'var(--p31-accent-gold)' },
  { id: 'e3', title: 'Family Pizza Night', day: 22, startTime: '19:00', endTime: '20:30', color: 'var(--p31-accent-green)' },
]

export function CalendarSurface() {
  const [selectedDay, setSelectedDay] = useState(22)
  const [events, setEvents] = useState(SEED_EVENTS)

  const dayEvents = events.filter((e) => e.day === selectedDay)

  return (
    <section className="surface-panel active" data-mcp-tool={MCP_TOOLS.calendar} aria-label="Calendar surface">
      <div className="calendar-layout">
        <div className="calendar-main">
          <div className="calendar-header">
            <h2 style={{ fontSize: 'var(--p31-text-h2)' }}>September 2026</h2>
          </div>

          <div className="cal-grid">
            {WEEKDAYS.map((d) => <div key={d} className="cal-weekday">{d}</div>)}
            {Array.from({ length: 2 }, (_, i) => <div key={`pad-${i}`} />)}
            {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
              const has = events.some((e) => e.day === day)
              return (
                <button
                  key={day}
                  type="button"
                  className={`cal-day-cell ${day === 22 ? 'today' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="cal-day-num">{day}</span>
                  {has && <span className="cal-dot" />}
                </button>
              )
            })}
          </div>
        </div>

        <aside className="cal-day-panel">
          <h3 style={{ fontSize: 'var(--p31-text-xl)' }}>September {selectedDay}, 2026</h3>
          <div style={{ fontSize: 13, color: 'var(--p31-cloud)' }}>{dayEvents.length} Scheduled Events</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {dayEvents.map((e) => (
              <div key={e.id} className="glass-panel" style={{ padding: 12 }}>
                <div style={{ fontSize: 12, color: e.color }}>{e.startTime} – {e.endTime}</div>
                <div style={{ fontWeight: 600 }}>{e.title}</div>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary"
            type="button"
            style={{ marginTop: 'auto' }}
            onClick={() => {
              const id = `e${Date.now()}`
              setEvents((ev) => [
                ...ev,
                { id, title: 'New Event', day: selectedDay, startTime: '12:00', endTime: '13:00', color: 'var(--p31-accent)' },
              ])
            }}
          >
            + Add Event
          </button>
        </aside>
      </div>
    </section>
  )
}

export default CalendarSurface