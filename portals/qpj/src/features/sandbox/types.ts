import type { ToolCallEvent, ToolCallStatus } from '../../lib/mcpRegistry';

export type { ToolCallEvent, ToolCallStatus };

export type AgentId = 'mechanic' | 'narrator' | 'firmware' | 'architect';

export type GenerationStatus = 'idle' | 'pending' | 'streaming' | 'done' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallEvent[];
  timestamp: number;
}

export interface ArtifactVersion {
  code: string;
  html: string;
  timestamp: number;
}

export interface MonitorData {
  score?: number;
  duplication_pct?: number;
  valid?: boolean;
}

export interface Artifact {
  id: string;
  title: string;
  code: string;
  html: string;
  monitor?: MonitorData | null;
  versions: ArtifactVersion[];
  createdAt: number;
}

export interface Thread {
  id: string;
  title: string;
  lastMessage: string;
  createdAt: number;
  updatedAt: number;
  lastViewedAt: number;
}

export type Tab = 'preview' | 'code' | 'diff' | 'inspect';

export type Device = 'desktop' | 'tablet' | 'mobile';

export interface ConsoleEntry {
  id: number;
  type: 'log' | 'warn' | 'error';
  args: string[];
}

export interface InspectorNode {
  tag: string;
  id?: string;
  classes: string[];
  children: InspectorNode[];
}

export interface SplitState {
  open: boolean;
  ratio: number;
}
