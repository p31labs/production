import type { SessionEvent } from '@/types'
import { downloadText } from '@/lib/sessionLog'

/**
 * snapshot.ts — shareable playground session snapshots (C-3).
 *
 * A snapshot captures the current working state (server, tool, args, last
 * result) plus the full session history, exported as a .json download and
 * re-importable from a file. Import validation is strict: a malformed file
 * yields explicit errors, never a crash.
 */

export interface PlaygroundSnapshot {
  format: 'p31-mcp-playground-snapshot'
  version: 1
  exportedAt: string
  state: {
    serverId?: string | null
    serverName?: string | null
    tool?: string | null
    args?: Record<string, unknown>
    result?: unknown
    error?: string
  }
  session: SessionEvent[]
}

export function buildSnapshot(
  state: {
    serverId?: string | null
    serverName?: string | null
    tool?: string | null
    args?: Record<string, unknown>
    result?: unknown
    error?: string
  },
  session: SessionEvent[],
): PlaygroundSnapshot {
  return { format: 'p31-mcp-playground-snapshot', version: 1, exportedAt: new Date().toISOString(), state, session }
}

export function exportSnapshot(snapshot: PlaygroundSnapshot): void {
  downloadText(`p31-playground-snapshot-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`, JSON.stringify(snapshot, null, 2))
}

export interface SnapshotParse {
  snapshot?: PlaygroundSnapshot
  error?: string
}

/** Strictly validate an imported snapshot. */
export function parseSnapshot(text: string): SnapshotParse {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (e: unknown) {
    return { error: `That file is not readable JSON: ${e instanceof Error ? e.message : String(e)}` }
  }
  if (!data || typeof data !== 'object') return { error: 'The file must hold a JSON object.' }
  const s = data as Partial<PlaygroundSnapshot>
  if (s.format !== 'p31-mcp-playground-snapshot') return { error: `That is not a saved session file (${String(s.format ?? 'missing')}).` }
  if (s.version !== 1) return { error: `That saved session is from a newer version.` }
  if (!Array.isArray(s.session)) return { error: 'The saved session list must be an array.' }
  for (const ev of s.session as unknown[]) {
    if (!ev || typeof ev !== 'object') return { error: 'The saved session has a bad entry.' }
    const e = ev as Partial<SessionEvent>
    if (typeof e.id !== 'string' || typeof e.tool !== 'string' || typeof e.serverId !== 'string') {
      return { error: `One saved call is missing its name (${JSON.stringify(e.id ?? '?')}).` }
    }
  }
  return {
    snapshot: {
      format: 'p31-mcp-playground-snapshot',
      version: 1,
      exportedAt: typeof s.exportedAt === 'string' ? s.exportedAt : new Date().toISOString(),
      state: (typeof s.state === 'object' && s.state !== null ? s.state : {}) as PlaygroundSnapshot['state'],
      session: (s.session as SessionEvent[]).map((e) => ({
        ...e,
        status: e.status === 'done' || e.status === 'error' ? e.status : 'done',
        risk: e.risk === 'write' ? 'write' : 'read',
        args: e.args ?? {},
        ts: typeof e.ts === 'number' ? e.ts : Date.now(),
      })),
    },
  }
}