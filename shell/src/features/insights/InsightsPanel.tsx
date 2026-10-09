import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useShellStore } from '../../store/useShellStore';
import { getSpoonHistory, getForecast } from '../../lib/spoonHistory';
import { executeCommand } from '../../lib/commands';

type SpoonEntry = { id: string; level: number; source: string; ts: number };

interface DayAvg { day: string; avg: number; }
interface HourAvg { hour: string; avg: number; }

const HOUR_LABELS = ['12a','1a','2a','3a','4a','5a','6a','7a','8a','9a','10a','11a','12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p','11p'];

function fmtDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function computeDayTrend(entries: SpoonEntry[]): DayAvg[] {
  const groups = new Map<string, number[]>();
  for (const e of entries) {
    const k = fmtDay(e.ts);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e.level);
  }
  return Array.from(groups.entries())
    .map(([day, levels]) => ({ day, avg: Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10 }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

function computeHourTrend(entries: SpoonEntry[]): HourAvg[] {
  const groups = new Map<number, number[]>();
  for (const e of entries) {
    const h = new Date(e.ts).getHours();
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h)!.push(e.level);
  }
  const result: HourAvg[] = [];
  for (let h = 0; h < 24; h++) {
    const levels = groups.get(h);
    result.push({ hour: HOUR_LABELS[h], avg: levels ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10 : 0 });
  }
  return result;
}

export default function InsightsPanel() {
  const open = useShellStore((s) => s.insightsOpen);
  const [dayTrend, setDayTrend] = useState<DayAvg[]>([]);
  const [hourTrend, setHourTrend] = useState<HourAvg[]>([]);
  const [forecast, setForecast] = useState<{ type: string; message: string; confidence: number }>({ type: 'none', message: '', confidence: 0 });
  const [loveChain, setLoveChain] = useState<string | null>(null);
  const [loveError, setLoveError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [week, twoWeek, fc] = await Promise.all([
        getSpoonHistory(7),
        getSpoonHistory(14),
        getForecast(),
      ]);
      setDayTrend(computeDayTrend(week));
      setHourTrend(computeHourTrend(twoWeek));
      setForecast(fc);
    } catch { /* best-effort */ }
  }, []);

  const loadLove = useCallback(async () => {
    try {
      const data = await executeCommand('love:chain', {}) as { chain?: unknown[] };
      const len = Array.isArray((data as any)?.chain) ? (data as any).chain.length : (Array.isArray(data) ? data.length : null);
      setLoveChain(len != null ? `${len} blocks` : 'unavailable');
      setLoveError(false);
    } catch {
      setLoveChain(null);
      setLoveError(true);
    }
  }, []);

  useEffect(() => {
    if (open) { load(); loadLove(); }
  }, [open, load, loadLove]);

  const close = () => useShellStore.getState().setInsightsOpen(false);

  return (
    <aside className={`insights-panel${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="insights-panel-header">
        <h2>📊 Insights</h2>
        <button type="button" className="insights-panel-close" onClick={close} aria-label="Close insights">
          ✕
        </button>
      </div>
      <div className="insights-panel-body">
        <div className="insights-chart-block">
          <h3>7-Day Spoon Trend</h3>
          {dayTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={dayTrend}>
                <CartesianGrid stroke="var(--p31-glass-border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fill: 'var(--p31-text-tertiary)', fontSize: 10 }} />
                <YAxis domain={[0, 5]} tick={{ fill: 'var(--p31-text-tertiary)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'var(--p31-surface)', border: '1px solid var(--p31-glass-border)', borderRadius: 6, fontSize: 12 }} />
                <Line type="monotone" dataKey="avg" stroke="var(--p31-accent)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="insights-empty">Not enough data yet</p>
          )}
        </div>

        <div className="insights-chart-block">
          <h3>Hour-of-Day (14d avg)</h3>
          {hourTrend.some((h) => h.avg > 0) ? (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={hourTrend}>
                <CartesianGrid stroke="var(--p31-glass-border)" strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fill: 'var(--p31-text-tertiary)', fontSize: 9 }} interval={2} />
                <YAxis domain={[0, 5]} tick={{ fill: 'var(--p31-text-tertiary)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'var(--p31-surface)', border: '1px solid var(--p31-glass-border)', borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="avg" fill="var(--p31-accent-alt)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="insights-empty">Not enough data yet</p>
          )}
        </div>

        <div className="insights-metric-row">
          <div className="insights-metric">
            <span className="insights-metric-label">Forecast</span>
            <span className="insights-metric-value">
              {forecast.type === 'none'
                ? 'No pattern'
                : forecast.type === 'dip-ahead'
                  ? `Dip ahead (${forecast.confidence}%)`
                  : `Rest window (${forecast.confidence}%)`}
            </span>
          </div>
          <div className="insights-metric">
            <span className="insights-metric-label">LOVE chain</span>
            <span className={`insights-metric-value${loveError ? ' error' : ''}`}>
              {loveError ? 'error' : loveChain ?? '…'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
