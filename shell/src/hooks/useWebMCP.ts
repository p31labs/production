/**
 * useWebMCP — Browser-native WebMCP tool registration for the P31 Sovereign Shell.
 *
 * Registers tools with Chrome's built-in browser agent via
 * `navigator.modelContext.registerTool()`. Tools are tab-bound and
 * ephemeral — they exist only while the shell is open in a visible
 * browser tab.
 *
 * WebMCP Origin Trial: Chrome 149 → 156, expires Nov 16, 2026.
 * P31 holds tokens for p31ca.org and phosphorus31.org.
 *
 * NOTE: The `Navigator.modelContext` global type is declared in
 * `useRegisterShellMCP.ts`. This file casts to `any` at the call
 * site to avoid conflicting declarations.
 */
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';
import { useThemeStore, type ThemeId } from '@p31ca/shell-chrome';

const TABS = ['home', 'bonding', 'dashboard', 'sandbox', 'cockpit', 'profile', 'research'];
const THEMES: ThemeId[] = ['garden', 'ocean', 'aurora', 'zen', 'volt'];
const PANELS = ['identity', 'justice', 'passport', 'mcp-explorer', 'mesh', 'sbt', 'marketplace'];

export function useWebMCP() {
  useEffect(() => {
    const registerTool = (navigator.modelContext as any)?.registerTool;
    if (!registerTool) return;

    const register = (
      name: string,
      description: string,
      inputSchema: Record<string, unknown> | undefined,
      fn: (args: Record<string, unknown>) => Promise<string>,
    ) => {
      try {
        registerTool({
          name,
          description,
          ...(inputSchema ? { inputSchema } : {}),
          handler: async (params: Record<string, unknown>) => {
            const text = await fn(params);
            return { content: [{ type: 'text', text }] };
          },
        });
      } catch { /* best-effort */ }
    };

    register(
      'shell_set_spoons',
      'Adjust the spoon level (0-5) for the shell. 0 triggers crisis mode, 4-5 enables full motion.',
      { type: 'object', properties: { level: { type: 'number', minimum: 0, maximum: 5 } }, required: ['level'] },
      async ({ level }) => {
        const lv = Math.max(0, Math.min(5, Number(level ?? 4)));
        useAppStore.getState().setSpoons(lv);
        document.documentElement.setAttribute('data-spoons', String(lv));
        return JSON.stringify({ ok: true, spoons: lv });
      },
    );

    register(
      'shell_navigate_tab',
      'Switch to a different surface tab in the shell.',
      { type: 'object', properties: { tab: { type: 'string', enum: TABS } }, required: ['tab'] },
      async ({ tab }) => {
        const t = String(tab);
        if (TABS.includes(t)) useAppStore.getState().setTab(t as any);
        return JSON.stringify({ ok: true, tab: t });
      },
    );

    register(
      'shell_toggle_assistant',
      'Open or close the assistant panel.',
      { type: 'object', properties: { open: { type: 'boolean' } }, required: ['open'] },
      async ({ open }) => {
        useShellStore.getState().setAssistantOpen(!!open);
        return JSON.stringify({ ok: true, assistantOpen: !!open });
      },
    );

    register(
      'shell_switch_theme',
      'Switch the shell theme: garden, ocean, aurora, zen, or volt.',
      { type: 'object', properties: { theme: { type: 'string', enum: THEMES } }, required: ['theme'] },
      async ({ theme }) => {
        const t = (THEMES as readonly string[]).includes(String(theme))
          ? (String(theme) as ThemeId)
          : THEMES[0];
        useThemeStore.getState().setTheme(t);
        document.documentElement.setAttribute('data-theme', t);
        return JSON.stringify({ ok: true, theme: t });
      },
    );

    register(
      'shell_get_care_score',
      'Read the current care snapshot: spoon level, active tab, unread notifications, and assistant status.',
      undefined,
      async () => {
        const app = useAppStore.getState();
        const shell = useShellStore.getState();
        const spoons = document.documentElement.getAttribute('data-spoons') ?? String(app.spoons);
        return JSON.stringify({
          spoons: Number(spoons),
          tab: app.tab,
          unreadCount: shell.unreadCount,
          assistantOpen: shell.assistantOpen,
          sandboxOpen: shell.sandboxOpen,
        });
      },
    );

    register(
      'shell_open_panel',
      'Open a specific panel: identity, justice, passport, mcp-explorer, mesh, sbt, or marketplace.',
      { type: 'object', properties: { panel: { type: 'string', enum: PANELS } }, required: ['panel'] },
      async ({ panel }) => {
        const p = String(panel);
        window.dispatchEvent(new CustomEvent('shell:openPanel', { detail: { panel: p } }));
        return JSON.stringify({ ok: true, panel: p });
      },
    );
  }, []);
}
