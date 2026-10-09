/**
 * shell/ShellCommandPalette.tsx — the ⌘K command bridge for the shell.
 *
 * Lists every face + shell actions, filtered + keyboard-navigated by the canon
 * CommandPalette. The shell owns navigation (switching faces), so selecting an
 * item calls the store's activate().
 */
import { useEffect, useState } from 'react';
import { CommandPalette } from '@p31ca/design-core/compositions';
import type { CommandItem } from '@p31ca/design-core/compositions';
import { useShellStore } from './store';

export function ShellCommandPalette() {
  const [open, setOpen] = useState(false);
  const registry = useShellStore((s) => s.registry);
  const activate = useShellStore((s) => s.activate);
  const spoons = useShellStore((s) => s.spoons);
  const setSpoons = useShellStore((s) => s.setSpoons);

  // ⌘K / Ctrl+K toggle.
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

  const items: CommandItem[] = [
    ...registry.order.map((id) => {
      const f = registry.byId[id];
      return {
        id: `face:${f.id}`,
        label: f.name,
        description: `${f.wordmark} · ${f.tier} tier`,
        keywords: `${f.id} ${f.tier}`,
      } as CommandItem;
    }),
    {
      id: 'spoons:up',
      label: 'Raise spoons',
      description: 'Cognitive load +1',
      keywords: 'spoon energy capacity',
    },
    {
      id: 'spoons:down',
      label: 'Lower spoons',
      description: 'Cognitive load −1',
      keywords: 'spoon energy capacity',
    },
  ];

  const onSelect = (id: string) => {
    setOpen(false);
    if (id.startsWith('face:')) {
      activate(id.slice(5));
    } else if (id === 'spoons:up') {
      setSpoons(Math.min(5, spoons + 1));
    } else if (id === 'spoons:down') {
      setSpoons(Math.max(0, spoons - 1));
    }
  };

  return <CommandPalette open={open} onClose={() => setOpen(false)} items={items} onSelect={onSelect} />;
}