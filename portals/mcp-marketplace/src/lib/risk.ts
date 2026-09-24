/**
 * Tool risk model — derived from the tool name + server's readOnlySafe flag.
 * Read-only tools run instantly; write tools require a confirmation gate.
 */
const WRITE_RE = /(create|write|update|delete|remove|send|execute|deploy|mint|sign|issue|lock|unlock|place|clear|trigger|call|pay|offer|accept|dispute|set|put|post|save|submit|start|stop|rotate|transfer|withdraw|deposit|invite|publish)/i

export type ToolRisk = 'read' | 'write'

export function toolRisk(name: string): ToolRisk {
  return WRITE_RE.test(name) ? 'write' : 'read'
}

export function serverReadOnlySafe(serverReadOnlySafe: boolean, tool: string): boolean {
  return serverReadOnlySafe && toolRisk(tool) === 'read'
}