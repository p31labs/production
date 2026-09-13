export type ToolCallStatus = 'pending' | 'running' | 'done' | 'error';

export interface ToolCallEvent {
  id: string;
  toolName: string;
  serverId: string;
  args: Record<string, unknown>;
  status: ToolCallStatus;
  result?: unknown;
  error?: string;
  startedAt: number;
  endedAt?: number;
}