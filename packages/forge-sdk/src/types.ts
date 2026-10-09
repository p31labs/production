export interface ForgePlugin {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType;
  defaultPosition: 'center' | 'left' | 'right' | 'bottom';
  defaultSize?: number;
}

export interface ForgePanelProps {
  params?: Record<string, unknown>;
}

export interface ForgeConfig {
  membraneUrl?: string;
  terminalRelayUrl?: string;
  x402GatewayUrl?: string;
  plugins?: ForgePlugin[];
  spoons?: number;
  onSpoonsChange?: (spoons: number) => void;
}

export interface DORAMetrics {
  deploymentFrequency: number;
  leadTimeForChanges: number;
  changeFailureRate: number;
  meanTimeToRestore: number;
  lastDeployAt: number | null;
  deploysThisWeek: number;
  deploysThisMonth: number;
  totalDeploys: number;
  cleanDeploys: number;
}

export interface AgentSession {
  id: string;
  name: string;
  tool: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  startedAt: number;
  completedAt?: number;
  xpEarned?: number;
  loveEarned?: number;
  output?: string;
  error?: string;
}
