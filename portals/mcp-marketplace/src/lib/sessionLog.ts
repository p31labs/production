import type { SessionEvent } from '@/types'

let seq = 0

export function newEvent(serverId: string, serverName: string, tool: string, args: Record<string, unknown>, risk: 'read' | 'write'): SessionEvent {
  return { id: `ev-${Date.now()}-${seq++}`, serverId, serverName, tool, args, status: 'running', risk, ts: Date.now() }
}

export function toMarkdown(events: SessionEvent[]): string {
  return events
    .map((e) => {
      const head = `## ${e.ts ? new Date(e.ts).toISOString() : '—'} · ${e.serverName} › ${e.tool} [${e.status}]`
      const args = `\`\`\`json\n${JSON.stringify(e.args, null, 2)}\n\`\`\``
      const result = e.status === 'error' ? `**error:** ${e.error}` : `\`\`\`json\n${JSON.stringify(e.result ?? null, null, 2)}\n\`\`\``
      return `${head}\n\nArgs:\n${args}\n\nResult:\n${result}\n`
    })
    .join('\n---\n')
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}