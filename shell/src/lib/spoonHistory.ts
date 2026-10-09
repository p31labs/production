import { storeRecord, listRecords } from './memory';

interface SpoonEntry {
  id: string;
  level: number;
  source: string;
  ts: number;
}

export interface SpoonForecast {
  type: 'dip-ahead' | 'rest-suggested' | 'none';
  message: string;
  confidence: number;
  hour?: number;
}

const STORE = 'spoons-history';
const MAX_ENTRIES = 2000;
const FORECAST_DAYS = 14;
const DIP_WINDOW_MIN = 3; // must appear at least 3 of 14 days
const DIP_LEVEL_MAX = 2;  // hour average ≤ 2 = dip
const DIP_ADVANCE_MS = 30 * 60 * 1000; // alert 30 min before
const FORECAST_CACHE_MS = 5 * 60 * 1000;

let forecastCache: { result: SpoonForecast; at: number } | null = null;

export async function logSpoonChange(level: number, source: string): Promise<void> {
  const ts = Date.now();
  const id = String(ts);
  try {
    await storeRecord<SpoonEntry>(STORE, { id, level, source, ts });
    forecastCache = null;
  } catch {
    // best-effort
  }
}

export async function getSpoonHistory(days = FORECAST_DAYS): Promise<SpoonEntry[]> {
  try {
    const all = await listRecords<SpoonEntry>(STORE);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return all.filter((e) => e.ts >= cutoff).sort((a, b) => a.ts - b.ts);
  } catch {
    return [];
  }
}

export function forecastSpoons(history: SpoonEntry[], now: number = Date.now()): SpoonForecast {
  if (history.length < 3) return { type: 'none', message: '', confidence: 0 };

  const groups = new Map<number, number[]>();
  for (const entry of history) {
    const d = new Date(entry.ts);
    const hour = d.getHours();
    if (!groups.has(hour)) groups.set(hour, []);
    groups.get(hour)!.push(entry.level);
  }

  const hourAvgs: Array<{ hour: number; avg: number }> = [];
  for (const [hour, levels] of groups) {
    const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
    hourAvgs.push({ hour, avg });
  }

  const dipHours = hourAvgs.filter((h) => h.avg <= DIP_LEVEL_MAX);

  if (dipHours.length === 0) {
    return { type: 'none', message: '', confidence: 0 };
  }

  const currentDate = new Date(now);
  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;

  for (const dip of dipHours) {
    const dipMinutes = dip.hour * 60;
    const deltaMin = dipMinutes - currentMinutes;

    if (deltaMin > 0 && deltaMin <= 30) {
      const daysCovered = Math.max(1, history.filter((e) => {
        const d = new Date(e.ts);
        return d.getHours() === dip.hour;
      }).length);

      const confidence = Math.min(100, Math.round((daysCovered / FORECAST_DAYS) * 100));
      const hour12 = dip.hour > 12 ? `${dip.hour - 12}pm` : dip.hour === 0 ? '12am' : dip.hour === 12 ? '12pm' : `${dip.hour}am`;

      return {
        type: 'dip-ahead',
        message: `You usually dip around ${hour12} — want to schedule a rest?`,
        confidence,
        hour: dip.hour,
      };
    }

    if (Math.abs(currentHour - dip.hour) <= 1) {
      return {
        type: 'rest-suggested',
        message: `You're in your typical rest window. Take it easy.`,
        confidence: Math.min(100, Math.round((groups.get(dip.hour)?.length ?? 0) / FORECAST_DAYS * 100)),
        hour: dip.hour,
      };
    }
  }

  const nearestDip = dipHours.reduce((best, d) => {
    const bestDist = Math.min(Math.abs(best.hour - currentHour), (24 - Math.abs(best.hour - currentHour)));
    const dDist = Math.min(Math.abs(d.hour - currentHour), (24 - Math.abs(d.hour - currentHour)));
    return dDist < bestDist ? d : best;
  }, dipHours[0]);

  const confidence = Math.min(100, Math.round((groups.get(nearestDip.hour)?.length ?? 0) / FORECAST_DAYS * 100));
  const hour12 = nearestDip.hour > 12 ? `${nearestDip.hour - 12}pm` : nearestDip.hour === 0 ? '12am' : nearestDip.hour === 12 ? '12pm' : `${nearestDip.hour}am`;

  return {
    type: 'rest-suggested',
    message: `Your spoon levels often dip around ${hour12}. Consider resting then.`,
    confidence,
    hour: nearestDip.hour,
  };
}

export async function getForecast(): Promise<SpoonForecast> {
  if (forecastCache && Date.now() - forecastCache.at < FORECAST_CACHE_MS) {
    return forecastCache.result;
  }
  try {
    const history = await getSpoonHistory();
    const result = forecastSpoons(history);
    forecastCache = { result, at: Date.now() };
    return result;
  } catch {
    return { type: 'none', message: '', confidence: 0 };
  }
}
