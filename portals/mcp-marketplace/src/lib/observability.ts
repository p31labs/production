import { REGISTRY_BASE } from '@/lib/registryClient'

/**
 * Self-hosted observability — captures browser errors and reports them to the
 * P31 registry's /ingest/errors endpoint (rate-limited server-side). Buffered
 * + deduplicated; fails silently when offline. Sovereign alternative to a
 * third-party crash reporter: the data stays in our control plane.
 */

const KEY = 'p31:error-queue'
const MAX_QUEUE = 40
const FLUSH_INTERVAL_MS = 15_000
let queue: Array<Record<string, unknown>> = []

function loadQueue(): Array<Record<string, unknown>> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue.slice(-MAX_QUEUE)))
  } catch {
    /* storage unavailable */
  }
}

async function flush(): Promise<void> {
  if (queue.length === 0) return
  const batch = queue
  queue = []
  saveQueue()
  try {
    await fetch(`${REGISTRY_BASE}/ingest/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'mcp.p31ca.org', events: batch }),
      keepalive: true,
    })
  } catch {
    // Re-queue on failure (bounded).
    queue = [...queue, ...batch].slice(-MAX_QUEUE)
    saveQueue()
  }
}

function capture(err: unknown, source: string): void {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  queue.push({ source, message: message.slice(0, 500), stack: stack?.slice(0, 2000), url: window.location.href })
  saveQueue()
}

export function initObservability(): () => void {
  queue = loadQueue()
  const onError = (event: ErrorEvent) => {
    if (event.message) capture(event.error ?? new Error(event.message), 'window.onerror')
  }
  const onRejection = (event: PromiseRejectionEvent) => {
    capture(event.reason, 'unhandledrejection')
  }
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  const timer = window.setInterval(() => void flush(), FLUSH_INTERVAL_MS)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
    window.clearInterval(timer)
  }
}

/** Public API for explicit instrumentation (e.g., tool-call failures). */
export function reportError(err: unknown, source = 'app'): void {
  capture(err, source)
}