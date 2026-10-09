/**
 * shell/FaceSwitcher.tsx — the face switcher (one shell, many faces).
 *
 * A custom trigger + menu (the pattern validated by research: the switcher
 * carries tier badges and live names, not a native dropdown). Fully
 * keyboard-accessible: aria-expanded, Escape closes + returns focus, Arrow
 * keys move, click-outside closes. Store-agnostic: pure props.
 */
import { useEffect, useRef, useState } from 'react';

export interface FaceSwitcherItem {
  id: string;
  name: string;
  tier: string;
}

export interface FaceSwitcherProps {
  items: FaceSwitcherItem[];
  active: string;
  onSelect: (id: string) => void;
  label?: string;
}

export function FaceSwitcher({ items, active, onSelect, label = 'Switch face' }: FaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeItem = items.find((i) => i.id === active);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        ref.current?.querySelector<HTMLButtonElement>('.face-switcher__trigger')?.focus();
      }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && open) {
        e.preventDefault();
        const menu = ref.current?.querySelector<HTMLElement>('.face-switcher__menu');
        const items_ = menu ? [...menu.querySelectorAll<HTMLButtonElement>('.face-switcher__item')] : [];
        const idx = items_.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'ArrowDown' ? (idx + 1) % items_.length : (idx - 1 + items_.length) % items_.length;
        items_[next]?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="face-switcher" ref={ref}>
      <button
        type="button"
        className="face-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        data-agent-kind="action"
        data-agent-action="shell.face.switch"
        data-agent-danger="none"
        data-agent-confirm="never"
      >
        <span className="face-switcher__trigger-name">{activeItem?.name ?? 'Pick a face'}</span>
        <span className="face-switcher__trigger-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="face-switcher__menu" role="listbox" aria-label={label}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === active}
              className={`face-switcher__item${item.id === active ? ' is-active' : ''}`}
              onClick={() => { onSelect(item.id); setOpen(false); }}
              data-agent-kind="action"
              data-agent-action={`shell.face.activate.${item.id}`}
            >
              <span className="face-switcher__item-name">{item.name}</span>
              <span className="face-switcher__item-tier" aria-hidden="true">{item.tier}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}