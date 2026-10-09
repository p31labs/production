/**
 * perf — lightweight mobile performance instrumentation.
 *
 * Collects TTFD (first contentful paint), TTID (largest contentful paint),
 * INP (worst interaction latency), and navigation type. Exposes a global
 * `window.__p31Perf` snapshot and a ring buffer at localStorage `p31:perf`
 * (last 20 loads) so a real device can be audited against the 2026 fintech
 * budget (TTID <= 1.1s P90, TTFD <= 1.6s P90).
 */
interface PerfSnapshot {
  ttfdMs: number;
  ttidMs: number;
  inpMs: number;
  navType: string;
  ua: string;
  entries: string[];
}

const RING_KEY = 'p31:perf';
const RING_MAX = 20;
const DELAY_THRESHOLD = 40; // ms — only interactions above this count toward INP

declare global {
  interface Window {
    __p31Perf?: PerfSnapshot;
  }
}

export function initPerfInstrumentation(): void {
  const snap: PerfSnapshot = {
    ttfdMs: -1,
    ttidMs: -1,
    inpMs: -1,
    navType: performance.getEntriesByType('navigation')[0]?.toJSON?.().type ?? 'navigate',
    ua: navigator.userAgent.slice(0, 120),
    entries: [],
  };

  try {
    const paint = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.name === 'first-contentful-paint') snap.ttfdMs = Math.round(e.startTime);
        if (e.name === 'largest-contentful-paint') snap.ttidMs = Math.max(snap.ttidMs, Math.round(e.startTime));
      }
    });
    paint.observe({ type: 'paint', buffered: true });

    const interactions = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.duration >= DELAY_THRESHOLD) {
          snap.inpMs = Math.max(snap.inpMs, Math.round(e.duration));
        }
      }
    });
    interactions.observe({
      type: 'event',
      buffered: true,
      durationThreshold: DELAY_THRESHOLD,
    } as PerformanceObserverInit);
  } catch {
    /* PerformanceObserver unavailable — skip live collection */
  }

  const finalize = () => {
    window.__p31Perf = snap;
    try {
      const raw = localStorage.getItem(RING_KEY);
      const ring: PerfSnapshot[] = raw ? (JSON.parse(raw) as PerfSnapshot[]) : [];
      ring.push(snap);
      localStorage.setItem(RING_KEY, JSON.stringify(ring.slice(-RING_MAX)));
    } catch {
      /* storage unavailable (private mode) — snapshot stays in memory */
    }
  };

  window.addEventListener('pagehide', finalize, { once: true });
  window.addEventListener('beforeunload', finalize, { once: true });
}