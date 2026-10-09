/**
 * shell/chat/useChatPresentation.ts — the Chameleon presentation selector.
 *
 * The Chameleon is not a new component — canon's Chameleon is already mounted
 * by ShellChrome. This hook derives the chat surface's presentation from the
 * EXISTING state: role (via adapters), spoons + theme (via the shell store).
 *
 * Everything is a reactive selector — no getState() during render, so a spoon
 * or theme change re-renders the composer instead of going stale.
 */
import { useAdapters } from '../adapters';
import { useShellStore, resolveShellTheme } from '../store';
import { can, type Role } from '../authz';

export interface ChatPresentation {
  /** May this role send a message? (viewer → false) */
  canSend: boolean;
  /** Composer placeholder, softened at low spoons. */
  placeholder: string;
  /** The effective theme (user pick wins, else face default). */
  theme: string | null;
  /** Spoon level 0–5. */
  spoons: number;
  /** The actor role. */
  role: Role | null;
  /** Whether the debug panel is enabled (admin + ?debug=1). */
  debug: boolean;
}

export function useChatPresentation(): ChatPresentation {
  const { identity } = useAdapters();
  const spoons = useShellStore((s) => s.spoons);
  const theme = useShellStore((s) => resolveShellTheme(s));
  const role = identity.role;
  const canSend = can(role, 'create');

  const placeholder = spoons <= 1
    ? 'Take it easy — one thing at a time…'
    : spoons <= 2
      ? 'Ask something small…'
      : 'Ask anything…';

  const debug = role === 'admin' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

  return { canSend, placeholder, theme, spoons, role, debug };
}