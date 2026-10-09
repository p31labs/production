import { useEffect, useRef, useState } from 'react';
export type { AccountMenuSpec } from '../shell/identity';

/**
 * @p31ca/design-core — compositions/AccountMenu.tsx
 *
 * The signed-in identity fill (Nord/Cloudscape pattern, spec in
 * shell/identity.ts): an avatar trigger with a dropdown menu. Auth is
 * portal-side — the shell holds no auth state; the portal supplies the spec
 * (name, links, sign-out) and owns navigation.
 *
 * Keyboard contract (the shell's standard):
 *   - trigger: Enter/Space to open, focus stays on trigger
 *   - menu: Arrow keys move focus, Escape closes and returns focus
 *   - click-outside closes
 */

export interface AccountMenuLink {
  label: string;
  onNavigate: () => void;
}

export interface AccountMenuProps {
  /** Avatar trigger — emoji glyph + accessible name. */
  emoji?: string;
  /** Human name shown in the trigger's aria-label ("Signed in as {name}"). */
  name: string;
  /** Group 1 — profile/settings/account links. */
  primaryLinks: AccountMenuLink[];
  /** Group 2 — keyboard commands / help (optional). */
  secondaryLinks?: AccountMenuLink[];
  /** Sign out — always last (destructive). */
  onSignOut: () => void;
  className?: string;
}

export function AccountMenu({ emoji = '✦', name, primaryLinks, secondaryLinks, onSignOut, className = '' }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allLinks: (AccountMenuLink & { destructive?: boolean })[] = [
    ...primaryLinks,
    ...(secondaryLinks ?? []),
    { label: 'Sign out', onNavigate: onSignOut, destructive: true },
  ];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      const panel = ref.current?.querySelector<HTMLDivElement>('.account-menu__panel');
      if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector<HTMLButtonElement>('.account-menu__trigger')?.focus(); }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && open && panel) {
        e.preventDefault();
        const items = [...panel.querySelectorAll<HTMLButtonElement>('.account-menu__item')];
        const idx = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className={`account-menu ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className="account-menu__trigger avatar"
        aria-label={`Signed in as ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{emoji}</span>
      </button>
      {open && (
        <div className="account-menu__panel" role="menu" aria-label={`${name} account`}>
          <div className="account-menu__name">{name}</div>
          <div className="account-menu__group" role="none">
            {allLinks.map((l) => (
              <button
                key={l.label}
                type="button"
                role="menuitem"
                className={`account-menu__item${l.destructive ? ' account-menu__item--destructive' : ''}`}
                onClick={() => { l.onNavigate(); setOpen(false); }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;