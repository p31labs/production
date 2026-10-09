import { useSpoonsStore } from './useSpoonsStore';
import { sectionFromHash } from './nav';

/** Draft-7 JSON Schema for each agent-facing tool (portal strategy: strict schemas). */
const SCHEMAS = {
  navigate: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        enum: ['home', 'revenue', 'positions', 'opportunities', 'invoices', 'donations', 'billing', 'usage', 'ops', 'settings', 'profile', 'trust', 'community'],
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
  setSpoonLevel: {
    type: 'object',
    properties: { level: { type: 'integer', minimum: 0, maximum: 5 } },
    required: ['level'],
    additionalProperties: false,
  },
  dashboardStats: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  refreshSection: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
} as const;

export interface MCPToolDef {
  schema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => unknown;
}

export function installMCPTools(): void {
  const w = window as unknown as { __p31MCPTools?: Record<string, MCPToolDef | string> };
  w.__p31MCPTools = {
    navigate: {
      schema: SCHEMAS.navigate,
      execute: (args: Record<string, unknown>) => {
        const id = String(args.id ?? 'home');
        location.hash = `#/${id}`;
        return { ok: true, surface: id };
      },
    },
    setSpoonLevel: {
      schema: SCHEMAS.setSpoonLevel,
      execute: (args: Record<string, unknown>) => {
        useSpoonsStore.getState().setSpoons(Number(args.level ?? 3));
        return { ok: true, spoons: useSpoonsStore.getState().spoons };
      },
    },
    dashboardStats: {
      schema: SCHEMAS.dashboardStats,
      execute: () => ({
        spoons: useSpoonsStore.getState().spoons,
        surface: sectionFromHash(location.hash),
      }),
    },
    refreshSection: {
      schema: SCHEMAS.refreshSection,
      execute: () => {
        window.dispatchEvent(new Event('p31:refresh'));
        return { ok: true };
      },
    },
    version: '1.0.0',
    surface: 'monetization',
  };
}