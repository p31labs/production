import { useEffect } from 'react';
import { getCommands, executeCommand, type CommandContext } from '../lib/commands';
import { useAppStore } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';

declare global {
  interface Window {
    __p31MCPTools?: Record<string, unknown>;
    __p31MCPExec?: (name: string, args: any) => Promise<unknown>;
  }
  interface Document {
    modelContext?: { registerTool?: (tool: unknown) => void };
  }
  interface Navigator {
    modelContext?: { registerTool?: (tool: unknown) => void };
  }
}

export function useRegisterShellMCP() {
  const tab = useAppStore((s) => s.tab);
  const spoons = useAppStore((s) => s.spoons);
  const unread = useShellStore((s) => s.unreadCount);

  useEffect(() => {
    const context: CommandContext = { tab, spoons, unread };
    const commands = getCommands(context).filter((c) => c.llmTool);

    const registry =
      typeof document !== 'undefined' && document.modelContext
        ? document.modelContext
        : typeof navigator !== 'undefined' && navigator.modelContext
          ? navigator.modelContext
          : null;

    if (registry?.registerTool) {
      for (const cmd of commands) {
        const inputSchema: { type: string; properties: Record<string, unknown> } = { type: 'object', properties: {} };
        for (const arg of cmd.args ?? []) {
          inputSchema.properties[arg.name] =
            arg.type === 'select'
              ? { type: 'string', enum: arg.options }
              : arg.type === 'number'
                ? { type: 'number', minimum: arg.min, maximum: arg.max }
                : { type: arg.type };
        }
        registry.registerTool({
          name: cmd.id,
          description: cmd.description,
          inputSchema,
        });
      }
    }

    const tools: Record<string, unknown> = {};
    for (const cmd of commands) {
      tools[cmd.id] = {
        name: cmd.id,
        description: cmd.description,
        inputSchema: { type: 'object', properties: {} },
        execute: (args: any) => executeCommand(cmd.id, args),
      };
    }
    window.__p31MCPTools = tools;
    if (import.meta.env.DEV || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
      window.__p31MCPExec = async (name: string, args: any) => {
        const ctx: CommandContext = {
          tab: useAppStore.getState().tab,
          spoons: useAppStore.getState().spoons,
          unread: useShellStore.getState().unreadCount,
        };
        const cmd = getCommands(ctx).find((c) => c.id === name && c.llmTool);
        if (!cmd) throw new Error(`Unknown tool: ${name}`);
        return cmd.execute(args);
      };
    }
  }, [tab, spoons, unread]);
}
