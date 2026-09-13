import type { Thread } from './types';

const FILLER_WORDS = /^(build|create|make|design|generate|write|set up|setup|add|do|implement)\s+/i;

export function deriveThreadTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(FILLER_WORDS, '').trim();
  if (!cleaned) return firstMessage.slice(0, 32);
  const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return title.length > 32 ? title.slice(0, 32) + '\u2026' : title;
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < MIN) return 'now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;
  const weeks = Math.floor(diff / WEEK);
  if (weeks < 4) return `${weeks}w`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export interface ThreadGroup {
  label: string;
  threads: Thread[];
}

export function groupThreads(threads: Thread[]): ThreadGroup[] {
  const now = Date.now();
  const groups: Array<{ label: string; min: number; max: number }> = [
    { label: 'Today', min: 0, max: DAY },
    { label: 'Yesterday', min: DAY, max: 2 * DAY },
    { label: 'Last 7 days', min: 2 * DAY, max: 7 * DAY },
    { label: 'Older', min: 7 * DAY, max: Infinity },
  ];
  const out: ThreadGroup[] = [];
  for (const g of groups) {
    const items = threads.filter((t) => {
      const age = now - t.updatedAt;
      return age >= g.min && age < g.max;
    });
    if (items.length) out.push({ label: g.label, threads: items });
  }
  return out;
}