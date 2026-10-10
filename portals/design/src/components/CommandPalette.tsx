import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandPalette as CanonCommandPalette, type CommandItem } from '@p31ca/design-core/compositions';
import { COMPONENT_CATALOG } from '@p31ca/design-core/genui/catalog';
import { NAV_SECTIONS } from '../lib/nav';
import { FOUNDATION_BRANCHES } from '../data/foundations';
import synonyms from '../data/synonyms.json';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/** CommandPalette — ⌘K, search across surfaces + components + foundations with
 *  design-vocabulary synonym expansion. The canon renders the cmdk palette from
 *  `items`; synonyms ride the `keywords` field so "primary button" → Button. */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();

  const items = useMemo<CommandItem[]>(() => {
    const surfaceItems: CommandItem[] = NAV_SECTIONS.map((s) => ({
      id: s.path,
      label: s.label,
      description: s.description,
      icon: s.emoji,
    }));

    const foundationItems: CommandItem[] = Object.entries(FOUNDATION_BRANCHES).map(([branch, cfg]) => ({
      id: `/foundations/${branch}`,
      label: cfg.title,
      description: cfg.description,
      icon: '📐',
    }));

    const componentItems: CommandItem[] = COMPONENT_CATALOG.map((c) => {
      const alt = (synonyms as Record<string, string[]>)[c.name] ?? [];
      return {
        id: `/components/${c.name}`,
        label: c.name,
        description: c.description,
        icon: '🧩',
        keywords: `${c.cssClass} ${c.category} ${alt.join(' ')}`,
      };
    });

    return [...surfaceItems, ...foundationItems, ...componentItems];
  }, []);

  return (
    <CanonCommandPalette
      open={open}
      onClose={onClose}
      items={items}
      onSelect={(id) => navigate(id)}
      placeholder="Search components, tokens, surfaces… (e.g. primary button, glass, spoon)"
    />
  );
}

export default CommandPalette;