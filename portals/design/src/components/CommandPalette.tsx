import { useNavigate } from 'react-router-dom';
import { CommandPalette as CanonCommandPalette, type CommandItem } from '@p31ca/design-core/compositions';
import { NAV_SECTIONS } from '../lib/nav';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/** CommandPalette — ⌘K surface jump. The canon renders the cmdk palette from
 *  `items`; the portal supplies the nav sections and owns navigation. */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const items: CommandItem[] = NAV_SECTIONS.map((s) => ({
    id: s.path,
    label: s.label,
    description: s.description,
    icon: s.emoji,
  }));

  return (
    <CanonCommandPalette
      open={open}
      onClose={onClose}
      items={items}
      onSelect={(id) => navigate(id)}
      placeholder="Type a surface name or command…"
    />
  );
}

export default CommandPalette;