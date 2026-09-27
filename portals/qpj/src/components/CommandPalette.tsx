import { useEffect, useMemo, useState } from 'react';
import {
  CommandPalette as DesignCommandPalette,
  type CommandItem,
} from '@p31ca/design-core/compositions';
import { useQpjStore } from '../store/useQpjStore';
import { useNotifStore } from '../store/useNotifStore';
import { ROUTES, ROUTE_ORDER, navigateTo, type QpjRoute } from '../lib/routes';
import { canAccess, type PortalMode } from '../lib/passports';

export function qpjCommands(mode: PortalMode): CommandItem[] {
  const navigation: CommandItem[] = ROUTE_ORDER.filter((r) =>
    canAccess(mode, ROUTES[r].minMode),
  ).map((r) => ({
    id: `route:${r}`,
    label: ROUTES[r].label,
    keywords: `${ROUTES[r].label} ${r} navigate`,
  }));
  const actions: CommandItem[] = [
    {
      id: 'action:restart',
      label: 'Rest the day',
      description: 'refills the jar',
      keywords: 'rest restart refill reset day spoons',
    },
    {
      id: 'action:switch',
      label: 'Switch lanes',
      description: 'change person',
      keywords: 'switch persona lane person passport',
    },
  ];
  return [...actions, ...navigation];
}

export function runQpjCommand(id: string): void {
  if (id.startsWith('route:')) {
    navigateTo(id.slice('route:'.length) as QpjRoute);
    return;
  }
  if (id === 'action:restart') {
    useQpjStore.getState().restartDay();
    useNotifStore.getState().notify({
      kind: 'success',
      title: 'The jar is refilled',
    });
    return;
  }
  if (id === 'action:switch') {
    navigateTo('switch');
  }
}

/**
 * Shell bridge over @p31ca/design-core CommandPalette. The composition owns
 * filtering, keyboard nav, and the listbox; this shell owns the ⌘K trigger,
 * mode-filtered items, and what selecting an id means.
 */
export function CommandPalette() {
  const mode = useQpjStore((s) => s.mode);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const items = useMemo(() => qpjCommands(mode), [mode]);

  return (
    <DesignCommandPalette
      open={open}
      onClose={() => setOpen(false)}
      items={items}
      onSelect={runQpjCommand}
      placeholder="Jump to a door…"
    />
  );
}