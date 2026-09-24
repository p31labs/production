import { useState } from 'react';
import { eventsForDay, addEvent, removeEvent, daysWithEvents } from '../lib/eventsStore';
import { useCollabCalendar } from '../hooks/useCollabCalendar';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CalendarSurface({ active }: { active: boolean }) {
  const { tick } = useCollabCalendar();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState(() => toDateKey(new Date()));
  const [draft, setDraft] = useState('');
  const [draftTime, setDraftTime] = useState('12:00');

  const today = new Date();
  const view = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthLabel = view.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDay = view.getDay();
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const monthEnd = new Date(view.getFullYear(), view.getMonth(), daysInMonth);
  const marked = daysWithEvents(view, monthEnd);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void tick;

  const selectedDate = new Date(selected + 'T00:00:00');
  const selectedEvents = eventsForDay(selectedDate);

  if (!active) return null;

  const handleAdd = () => {
    const title = draft.trim();
    if (!title) return;
    addEvent(selectedDate, title, draftTime);
    setDraft('');
  };

  return (
    <section className="p-4" data-mcp-tool="calendarSurface" data-mcp-state="ready">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-ink">Family calendar</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg border border-white/10 text-sm" onClick={() => setMonthOffset((o) => o - 1)}>
            ‹
          </button>
          <span className="px-3 py-1.5 text-sm text-cloud/70">{monthLabel}</span>
          <button className="px-3 py-1.5 rounded-lg border border-white/10 text-sm" onClick={() => setMonthOffset((o) => o + 1)}>
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/5 rounded-xl overflow-hidden mb-4">
        {DAYS.map((d) => (
          <div key={d} className="bg-white/5 text-cloud/40 text-xs font-mono py-1 text-center">
            {d}
          </div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = new Date(view.getFullYear(), view.getMonth(), i + 1);
          const key = toDateKey(d);
          const has = marked.has(key);
          const chips = eventsForDay(d).slice(0, 2);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`text-left p-1 min-h-[56px] transition-colors flex flex-col gap-0.5 ${
                selected === key ? 'bg-quantum-cyan/20' : 'text-ink hover:bg-white/5'
              }`}
              aria-label={`${key}${has ? ', has events' : ''}`}
            >
              <span className="text-sm px-1">{i + 1}</span>
              {chips.map((ev) => (
                <span
                  key={ev.id}
                  className="truncate text-[10px] px-1 rounded border-l-2 border-quantum-cyan bg-quantum-cyan/10 text-ink"
                >
                  {ev.time} {ev.title}
                </span>
              ))}
              {has && chips.length === 0 && (
                <span className="mx-1 mt-0.5 w-1.5 h-1.5 rounded-full bg-quantum-cyan" />
              )}
            </button>
          );
        })}
      </div>

      <div className="glass-panel rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-ink">
          {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <ul className="space-y-2">
          {selectedEvents.length === 0 && <li className="text-sm text-cloud/40">Nothing planned.</li>}
          {selectedEvents.map((ev) => (
            <li key={ev.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-cloud/60 font-mono">{ev.time}</span>
              <span className="flex-1 text-ink">{ev.title}</span>
              <button
                className="text-cloud/40 hover:text-rose-400 text-xs"
                onClick={() => removeEvent(selectedDate, ev.id)}
                aria-label={`Remove ${ev.title}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="New event"
            className="flex-1 bg-transparent border-b border-white/10 focus:border-quantum-cyan/40 py-1 text-sm text-ink outline-none"
            aria-label="New event title"
          />
          <input
            value={draftTime}
            onChange={(e) => setDraftTime(e.target.value)}
            type="time"
            className="bg-transparent border-b border-white/10 text-sm text-ink outline-none"
            aria-label="Event time"
          />
          <button className="px-3 py-1.5 rounded-lg bg-quantum-cyan/20 text-quantum-cyan text-sm" onClick={handleAdd}>
            Add
          </button>
        </div>
      </div>
    </section>
  );
}